# -*- coding: utf-8 -*-
"""응원팀 경기 상태 변화 푸시 — 매분/2분 실행(Cloud Scheduler/cron).

상태 추적 방식:
  1) 오늘 경기를 KBO에서 실시간 조회(상태·시작시각·점수)
  2) game_state(직전 상태)와 비교 → 변화 감지
     - 곧 시작(10분 전) / 우천취소 / 시작시각 변경(지연) / 경기 종료(결과)
  3) 그 두 팀 응원 유저(favorites·fav_team_code)의 push_tokens로 변화 내용 발송
  4) game_state 갱신, 만료 토큰 정리

사용법:
  python notify_games.py          # 실제 발송
  python notify_games.py --dry    # 발송 없이 감지 결과만 출력
  python notify_games.py --test   # 시간·상태 무시하고 '곧 시작' 강제 발송(점검용)
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
        play_raw = next((c["Text"] for c in cells if c.get("Class") == "play"), "")
        play = strip_html(play_raw)
        relay_raw = next((c.get("Text", "") for c in cells if c.get("Class") == "relay"), "")
        m = re.search(r"([가-힣A-Z]+)\s*(\d+)?\s*vs\s*(\d+)?\s*([가-힣A-Z]+)", play)
        if not m:
            continue
        away, a_sc, h_sc, home = m.group(1), m.group(2), m.group(3), m.group(4)
        # 종료 판정: 점수에 승/패 표시가 박히거나(승부) 리뷰·하이라이트 버튼이 뜨면(무승부 포함) 종료.
        # 라이브 경기는 점수가 있어도 승/패·리뷰가 없어 '예정'으로 남음 → 진행중 오판 방지.
        finished = (bool(re.search(r'class=["\'](?:win|lose)["\']', play_raw))
                    or "btnReview" in relay_raw or "btnHighlight" in relay_raw)
        # 취소 사유 텍스트 그대로 캡처 (우천취소/미세먼지취소/폭염취소 등)
        cancel_reason = next((strip_html(c.get("Text", "")) for c in cells
                              if "취소" in strip_html(c.get("Text", ""))), "")
        games.append({"time": time_c, "away": away, "home": home,
                      "away_score": a_sc, "home_score": h_sc, "finished": finished,
                      "canceled": bool(cancel_reason), "cancel_reason": cancel_reason})
    return games


def classify_status(g, now, today):
    """경기 상태 판별. 종료는 공홈의 승/패 표시·리뷰 버튼(=경기내역 확정, fetch에서 계산)으로 판단."""
    if g["canceled"]:
        return "취소"
    if g.get("finished"):
        return "종료"
    return "예정"


def _tokens_for(cur, away, home):
    """두 팀을 응원하는 유저의 push_tokens."""
    codes = [c for c in (TEAM_CODE.get(away), TEAM_CODE.get(home)) if c]
    if not codes:
        return []
    cur.execute("""SELECT DISTINCT pt.token FROM push_tokens pt
                   LEFT JOIN users u ON u.user_id = pt.user_id
                   LEFT JOIN favorites f ON f.user_id = pt.user_id
                   WHERE u.fav_team_code = ANY(%s) OR f.team_code = ANY(%s)""", (codes, codes))
    return [r["token"] for r in cur.fetchall()]


# 알림 유효시간(초): 이 시간 안에 배달 못 하면 FCM이 폐기 → 기기를 늦게 켜도 지난 알림 안 옴
TTL_SOON = 1800       # ⚾ 곧 시작: 30분(지나면 이미 경기 중이라 무의미)
TTL_RESULT = 1800    # 종료·취소·시간변경: 30분


def _send(cur, conn, event_key, tokens, title, body, data, dry, ttl=None):
    # 원자적 중복방지: event_key를 처음 INSERT한 실행만 발송(동시 실행·재시도 레이스 방어).
    if event_key and not dry:
        cur.execute("INSERT INTO notified_events (event_key) VALUES (%s) ON CONFLICT DO NOTHING", (event_key,))
        claimed = cur.rowcount == 1
        conn.commit()
        if not claimed:
            return   # 이미 다른 실행이 발송함
    print(f"  → 발송: {title} | {body} (토큰 {len(tokens)}개)")
    if dry or not tokens:
        return
    res = fcm.send_to_tokens(tokens, title=title, body=body, data=data, ttl_seconds=ttl)
    print("    결과:", res)
    if res["invalid_tokens"]:
        cur.execute("DELETE FROM push_tokens WHERE token = ANY(%s)", (res["invalid_tokens"],))
        conn.commit()


def _trigger_crawl(target_date):
    """그 날 결과 크롤을 백그라운드로 띄움. notify는 시간제한이 짧아 직접 안 돌리고,
    같은 컨테이너의 /internal/crawl 을 호출만 하고 응답은 안 기다림(서버가 계속 처리)."""
    import requests
    port = os.environ.get("PORT", "8080")
    token = os.environ.get("INTERNAL_TOKEN", "")
    try:
        requests.post(f"http://localhost:{port}/internal/crawl",
                      params={"date": target_date.isoformat()},
                      headers={"x-internal-token": token}, timeout=5)
    except requests.exceptions.RequestException:
        pass   # 타임아웃은 정상(크롤은 서버에서 계속 진행). 연결 자체 실패만 무시.
    print(f"  → 결과 크롤 트리거: {target_date} (백그라운드)")


def main():
    dry = "--dry" in sys.argv
    test = "--test" in sys.argv
    now = datetime.datetime.now()       # 서버 TZ=Asia/Seoul
    today = now.date()

    session = make_session()
    games = fetch_today_games(session, today)
    for g in games:
        g["status"] = classify_status(g, now, today)
    print(f"오늘({today}) 경기 {len(games)}건: " +
          ", ".join(f"{g['away']}vs{g['home']}({g['status']},{g['time']})" for g in games))

    u = urlparse(os.environ["DATABASE_URL"])
    conn = psycopg2.connect(host=u.hostname, port=u.port, dbname=u.path.lstrip("/"),
                            user=u.username, password=u.password, cursor_factory=RealDictCursor)
    cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS game_state (
        game_key         VARCHAR(64) PRIMARY KEY,
        status           VARCHAR(16),
        game_time        VARCHAR(8),
        started_notified BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at       TIMESTAMP NOT NULL DEFAULT now())""")
    cur.execute("""CREATE TABLE IF NOT EXISTS notified_events (
        event_key VARCHAR(80) PRIMARY KEY, sent_at TIMESTAMP NOT NULL DEFAULT now())""")
    conn.commit()

    for g in games:
        key = f"{today.isoformat()}_{g['away']}_{g['home']}"
        cur.execute("SELECT status, game_time, started_notified FROM game_state WHERE game_key = %s", (key,))
        prev = cur.fetchone()
        tokens = _tokens_for(cur, g["away"], g["home"])
        vs = f"{g['away']} vs {g['home']}"
        started = bool(prev and prev["started_notified"])

        # ----- 점검용: 시간·상태 무시하고 강제 발송 -----
        if test:
            _send(cur, conn, None, tokens, "⚾ 곧 경기 시작!", f"{vs} 경기가 {g['time']}에 시작돼요!",
                  {"type": "game_soon", "away": g["away"], "home": g["home"]}, dry)
            continue

        # ----- 상태 변화 감지 -----
        if g["status"] == "취소":
            if prev and prev["status"] == "예정":     # 예정 → 취소 (지켜본 변화)
                reason = g.get("cancel_reason") or "경기 취소"   # 실제 사유 그대로
                _send(cur, conn, f"{key}_cancel", tokens, "⚠️ 경기 취소",
                      f"오늘 {vs} 경기가 {reason}됐어요.",
                      {"type": "canceled", "reason": reason,
                       "away": g["away"], "home": g["home"]}, dry, ttl=TTL_RESULT)
        elif g["status"] == "종료":
            if prev and prev["status"] == "예정":     # 예정 → 종료 (점수는 스포라 노출 X)
                _send(cur, conn, f"{key}_finish", tokens, "🎉 경기 종료",
                      f"오늘 {vs} 경기가 끝났어요! 앱에서 결과를 확인해보세요.",
                      {"type": "finished", "away": g["away"], "home": g["home"]}, dry, ttl=TTL_RESULT)
        elif g["status"] == "예정":
            # 시작시각 변경(지연)
            if prev and prev["status"] == "예정" and prev["game_time"] and g["time"] \
                    and prev["game_time"] != g["time"]:
                _send(cur, conn, f"{key}_time_{g['time']}", tokens, "⏰ 경기 시간 변경",
                      f"{vs} 시작이 {prev['game_time']} → {g['time']}로 변경됐어요.",
                      {"type": "time_change", "away": g["away"], "home": g["home"]}, dry, ttl=TTL_RESULT)
            # 곧 시작 (10분 전, 1회)
            if not started and ":" in (g["time"] or ""):
                hh, mm = map(int, g["time"].split(":"))
                minutes = (datetime.datetime.combine(today, datetime.time(hh, mm)) - now).total_seconds() / 60
                if 0 < minutes <= ALERT_MIN:
                    _send(cur, conn, f"{key}_start", tokens, "⚾ 곧 경기 시작!",
                          f"{vs} 경기가 {g['time']}에 시작돼요!",
                          {"type": "game_soon", "away": g["away"], "home": g["home"]}, dry, ttl=TTL_SOON)
                    started = True

        # ----- 상태 저장(다음 폴링 비교용) -----
        if not dry:
            cur.execute(
                """INSERT INTO game_state (game_key, status, game_time, started_notified, updated_at)
                   VALUES (%s, %s, %s, %s, now())
                   ON CONFLICT (game_key) DO UPDATE
                     SET status = EXCLUDED.status, game_time = EXCLUDED.game_time,
                         started_notified = game_state.started_notified OR EXCLUDED.started_notified,
                         updated_at = now()""",
                (key, g["status"], g["time"], started))
            conn.commit()

    # ----- 오늘 (취소 제외) 모든 경기가 종료 → 그 날 결과 크롤을 트리거(폴링마다 중복 호출 방지로 1회만) -----
    # crawl_trig_{날짜}=트리거 게이트(여기). 실제 "크롤 성공" 마커(crawl_done_)는 /internal/crawl이 기록 → 9시 백업이 그걸 보고 skip.
    if not dry:
        active = [g for g in games if g["status"] != "취소"]
        if active and all(g["status"] == "종료" for g in active):
            cur.execute("INSERT INTO notified_events (event_key) VALUES (%s) ON CONFLICT DO NOTHING",
                        (f"crawl_trig_{today.isoformat()}",))
            claimed = cur.rowcount == 1
            conn.commit()
            if claimed:
                _trigger_crawl(today)

    conn.close()


if __name__ == "__main__":
    main()
