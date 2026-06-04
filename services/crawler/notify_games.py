# -*- coding: utf-8 -*-
"""경기 시작 N분 전 응원팀 푸시 알림 — 매분 실행(Task Scheduler/cron).

흐름:
  1) 오늘 경기를 KBO에서 실시간 조회(상태·시작시각) — 데일리 크롤이 아니라 매번 최신
  2) 10분 내 시작 + 취소/종료 아닌 경기 선별
  3) 그 두 팀을 응원하는 유저(favorites·fav_team_code)의 push_tokens 조회
  4) FCM 발송, 중복발송 방지(notified_games), 만료 토큰 정리

사용법:
  python notify_games.py          # 실제 발송
  python notify_games.py --dry    # 발송 없이 대상만 출력(점검용)
"""
import os
import re
import sys
import json
import pathlib
import datetime
from urllib.parse import urlparse

import psycopg2
from psycopg2.extras import RealDictCursor

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "services" / "api"))      # fcm 모듈 사용
_envfile = ROOT / ".env"                                 # 로컬용. 컨테이너엔 없음(env var 사용)
if _envfile.exists():
    for _line in _envfile.read_text(encoding="utf-8").splitlines():
        _line = _line.strip()
        if _line and not _line.startswith("#") and "=" in _line:
            _k, _v = _line.split("=", 1)
            os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))

from kbo_crawler import make_session, strip_html, BASE, SCHEDULE_API  # noqa: E402
import fcm  # noqa: E402

ALERT_MIN = 10   # 경기 시작 몇 분 전 알림
TEAM_CODE = {"한화": "HH", "KIA": "HT", "두산": "OB", "LG": "LG", "삼성": "SS",
             "롯데": "LT", "KT": "KT", "NC": "NC", "SSG": "SK", "키움": "WO"}


def fetch_today_games(session, today):
    payload = {"leId": "1", "srIdList": "0,9,6", "seasonId": str(today.year),
               "gameMonth": f"{today.month:02d}", "teamId": ""}
    headers = {"X-Requested-With": "XMLHttpRequest",
               "Referer": BASE + "/Schedule/Schedule.aspx",
               "Accept": "application/json, text/javascript, */*; q=0.01"}
    r = session.post(BASE + SCHEDULE_API, data=payload, headers=headers, timeout=30)
    r.raise_for_status()
    rows = json.loads(r.text).get("rows", [])
    games, cur = [], ""
    todaystr = f"{today.month:02d}.{today.day:02d}"
    for row in rows:
        cells = row["row"]
        if cells and cells[0].get("Class") == "day":
            cur = strip_html(cells[0]["Text"])
        if not cur.startswith(todaystr):
            continue
        time_c = next((strip_html(c["Text"]) for c in cells if c.get("Class") == "time"), "")
        play = next((strip_html(c["Text"]) for c in cells if c.get("Class") == "play"), "")
        alltxt = " ".join(strip_html(c.get("Text", "")) for c in cells)
        m = re.search(r"([가-힣A-Z]+)\s*\d*\s*vs\s*\d*\s*([가-힣A-Z]+)", play)
        if not m:
            continue
        away, home = m.group(1), m.group(2)
        if "취소" in alltxt:
            status = "취소"
        elif re.search(r"\d+\s*vs\s*\d+", play) or "종료" in alltxt:
            status = "종료"
        else:
            status = "예정"
        games.append({"time": time_c, "away": away, "home": home, "status": status})
    return games


def main():
    dry = "--dry" in sys.argv
    test = "--test" in sys.argv         # 시간 윈도우·중복방지 무시(점검용 즉시 발송)
    now = datetime.datetime.now()       # 서버는 KST 가정
    today = now.date()

    session = make_session()
    games = fetch_today_games(session, today)
    print(f"오늘({today}) 경기 {len(games)}건: " +
          ", ".join(f"{g['away']}vs{g['home']}({g['status']},{g['time']})" for g in games))

    u = urlparse(os.environ["DATABASE_URL"])
    conn = psycopg2.connect(host=u.hostname, port=u.port, dbname=u.path.lstrip("/"),
                            user=u.username, password=u.password, cursor_factory=RealDictCursor)
    cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS notified_games (
        game_key VARCHAR(64) PRIMARY KEY, notified_at TIMESTAMP NOT NULL DEFAULT now())""")
    conn.commit()

    for g in games:
        if g["status"] != "예정" or ":" not in (g["time"] or ""):
            continue
        hh, mm = map(int, g["time"].split(":"))
        start = datetime.datetime.combine(today, datetime.time(hh, mm))
        minutes = (start - now).total_seconds() / 60
        if not test and not (0 < minutes <= ALERT_MIN):
            continue

        game_key = f"{today.isoformat()}_{g['away']}_{g['home']}"
        if not test:
            cur.execute("SELECT 1 FROM notified_games WHERE game_key = %s", (game_key,))
            if cur.fetchone():
                continue   # 이미 발송함

        codes = [c for c in (TEAM_CODE.get(g["away"]), TEAM_CODE.get(g["home"])) if c]
        cur.execute("""SELECT DISTINCT pt.token FROM push_tokens pt
                       LEFT JOIN users u ON u.user_id = pt.user_id
                       LEFT JOIN favorites f ON f.user_id = pt.user_id
                       WHERE u.fav_team_code = ANY(%s) OR f.team_code = ANY(%s)""", (codes, codes))
        tokens = [r["token"] for r in cur.fetchall()]
        print(f"[알림대상] {game_key} {g['time']} (T-{minutes:.1f}분) → 유저토큰 {len(tokens)}개")

        if not dry and tokens:
            res = fcm.send_to_tokens(
                tokens, title="⚾ 곧 경기 시작!",
                body=f"{g['away']} vs {g['home']} 경기가 {g['time']}에 시작돼요!",
                data={"type": "game_soon", "away": g["away"], "home": g["home"]})
            print("  발송:", res)
            if res["invalid_tokens"]:
                cur.execute("DELETE FROM push_tokens WHERE token = ANY(%s)", (res["invalid_tokens"],))
        if not dry and not test:
            cur.execute("INSERT INTO notified_games (game_key) VALUES (%s) ON CONFLICT DO NOTHING", (game_key,))
            conn.commit()

    conn.close()


if __name__ == "__main__":
    main()
