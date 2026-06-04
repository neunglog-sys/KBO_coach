#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
시즌 전체 대진표 크롤 → MongoDB `schedule` 컬렉션.
일정 API(GetScheduleList)를 월별로 돌려 예정+종료 전 경기를 수집(gameId 기준 upsert).

사용법:
    python crawl_schedule.py          # 올해 시즌
    python crawl_schedule.py 2026     # 특정 연도
"""
import sys, os, re, json, time, pathlib
from pymongo import MongoClient, UpdateOne
from kbo_crawler import make_session, strip_html, parse_play, KNOWN_PARKS, BASE, SCHEDULE_API

MONTHS = range(3, 12)   # 3~11월 (시범~정규~포스트시즌)


def _load_dotenv(path: pathlib.Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_ROOT = pathlib.Path(__file__).resolve().parents[2]
_load_dotenv(_ROOT / ".env")
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGO_DB", "kbo")


def fetch_month(session, year: int, month: int):
    payload = {"leId": "1", "srIdList": "0,9,6", "seasonId": str(year),
               "gameMonth": f"{month:02d}", "teamId": ""}
    headers = {"X-Requested-With": "XMLHttpRequest",
               "Referer": BASE + "/Schedule/Schedule.aspx",
               "Accept": "application/json, text/javascript, */*; q=0.01"}
    r = session.post(BASE + SCHEDULE_API, data=payload, headers=headers, timeout=40)
    r.raise_for_status()
    rows = json.loads(r.text).get("rows", [])
    games, cur = [], ""
    for row in rows:
        cells = row["row"]
        if cells and cells[0].get("Class") == "day":
            cur = strip_html(cells[0]["Text"])           # "05.31(일)"
        m = re.match(r"(\d{2})\.(\d{2})", cur)
        if not m:
            continue
        date = f"{year}-{m.group(1)}-{m.group(2)}"
        play = next((c for c in cells if c.get("Class") == "play"), None)
        if not play:
            continue
        parsed = parse_play(play["Text"])
        if not parsed:
            continue
        away, a_sc, h_sc, home, status = parsed
        tcell = next((c for c in cells if c.get("Class") == "time"), None)
        park = next((strip_html(c["Text"]) for c in cells if strip_html(c["Text"]) in KNOWN_PARKS), "")
        gid = ""
        for c in cells:
            mm = re.search(r"gameId=([0-9A-Za-z]+)", c["Text"])
            if mm:
                gid = mm.group(1)
                break
        games.append({"gameId": gid or None, "date": date,
                      "시간": strip_html(tcell["Text"]) if tcell else "",
                      "원정팀": away, "원정점수": a_sc, "홈팀": home, "홈점수": h_sc,
                      "구장": park, "상태": status})
    return games


def main() -> int:
    year = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else None
    if year is None:
        import datetime
        year = datetime.date.today().year

    session = make_session()
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
    client.server_info()
    db = client[DB_NAME]

    all_games = []
    for mo in MONTHS:
        try:
            g = fetch_month(session, year, mo)
        except Exception as e:
            print(f"  {year}-{mo:02d}: 실패 {e}", file=sys.stderr)
            g = []
        all_games += g
        if g:
            print(f"  {year}-{mo:02d}: {len(g)}경기")
        time.sleep(0.5)

    ops = []
    for gm in all_games:
        key = {"gameId": gm["gameId"]} if gm["gameId"] else {"date": gm["date"], "원정팀": gm["원정팀"], "홈팀": gm["홈팀"]}
        ops.append(UpdateOne(key, {"$set": gm}, upsert=True))
    if ops:
        db.schedule.bulk_write(ops, ordered=False)

    # gameId 부여되며 생긴 None 쌍둥이 제거 (같은 date+원정+홈에 gameId 문서가 있으면 None 문서 삭제)
    gid_keys = {(d["date"], d["원정팀"], d["홈팀"])
                for d in db.schedule.find({"gameId": {"$ne": None}}, {"date": 1, "원정팀": 1, "홈팀": 1})}
    stale = [d["_id"] for d in db.schedule.find({"gameId": None}, {"date": 1, "원정팀": 1, "홈팀": 1})
             if (d["date"], d["원정팀"], d["홈팀"]) in gid_keys]
    if stale:
        db.schedule.delete_many({"_id": {"$in": stale}})
        print(f"중복 정리: gameId 쌍둥이 None 잔재 {len(stale)}건 삭제")

    done = sum(1 for g in all_games if g["상태"] == "종료")
    print(f"완료: {len(all_games)}경기 (종료 {done} / 예정 {len(all_games)-done}) → schedule 컬렉션 총 {db.schedule.count_documents({})}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
