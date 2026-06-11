#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KBO 선발 라인업 크롤러 — 당일 경기의 선발투수 + 타순(1~9)을 MongoDB(kbo.lineups)에 upsert.

- 소스: 게임센터 비공개 API (기존 크롤러와 같은 세션 트릭)
    ① /ws/Main.asmx/GetKboGameList      → 경기 목록 + 양팀 선발투수 + 라인업 게시 여부(LINEUP_CK)
    ② /ws/Schedule.asmx/GetLineUpAnalysis → 타순 1~9 (포지션·선수명), 블록 3=원정, 4=홈
- 라인업은 보통 경기 1시간 전 확정 → 하루 3회 실행으로 평일·주말 모두 커버:
    13:00(주말 14시 경기), 16:00(주말 17시 경기), 17:30(평일 18:30 경기)
  같은 날 여러 번 실행해도 upsert라 안전. 라인업이 아직 안 뜬 경기는 선발투수만 저장.
- 실행:  python crawl_lineup.py            # 오늘
        python crawl_lineup.py 20260611   # 특정일(YYYYMMDD)
"""
from __future__ import annotations
import sys, json, re, datetime, pathlib, os

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from kbo_crawler import make_session, BASE  # noqa: E402
from pymongo import MongoClient, UpdateOne  # noqa: E402


def _load_dotenv(path: pathlib.Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
_load_dotenv(_REPO_ROOT / ".env")

GAMELIST_API = "/ws/Main.asmx/GetKboGameList"
LINEUP_API = "/ws/Schedule.asmx/GetLineUpAnalysis"


def fetch_games(session, ymd: str) -> list[dict]:
    r = session.post(BASE + GAMELIST_API,
                     data={"leId": "1", "srId": "0,1,3,4,5,7,9,6", "date": ymd},
                     headers={"X-Requested-With": "XMLHttpRequest",
                              "Referer": BASE + "/Schedule/GameCenter/Main.aspx"},
                     timeout=30)
    r.raise_for_status()
    return json.loads(r.text).get("game", [])


def _parse_batting_table(raw: str) -> list[dict]:
    """GetLineUpAnalysis의 중첩 JSON 테이블 → [{order, position, name}] (9명)."""
    inner = json.loads(raw)
    out = []
    for row in inner.get("rows", []):
        cells = [re.sub(r"<[^>]+>", "", c.get("Text", "")).strip() for c in row.get("row", [])]
        if len(cells) >= 3 and cells[0].isdigit():
            out.append({"order": int(cells[0]), "position": cells[1], "name": cells[2]})
    return out


def fetch_lineup(session, game_id: str) -> tuple[dict, bool]:
    """({팀ID: 타순 리스트}, 게시 여부). 블록: 0=게시플래그, 1/2=팀 요약, 3/4=타순(1↔3, 2↔4 같은 팀).
    블록 순서가 홈/원정 어느 쪽이 먼저인지 보장이 없어 팀 요약 블록의 T_ID로 매핑한다."""
    r = session.post(BASE + LINEUP_API,
                     data={"leId": "1", "srId": "0", "seasonId": game_id[:4], "gameId": game_id},
                     headers={"X-Requested-With": "XMLHttpRequest",
                              "Referer": BASE + f"/Schedule/GameCenter/Main.aspx?gameId={game_id}"},
                     timeout=30)
    r.raise_for_status()
    blocks = json.loads(r.text)
    posted = bool(blocks and blocks[0] and blocks[0][0].get("LINEUP_CK"))
    if not posted or len(blocks) < 5:
        return {}, posted
    by_team = {}
    for summary_idx, table_idx in ((1, 3), (2, 4)):
        try:
            tid = blocks[summary_idx][0]["T_ID"]
            by_team[tid] = _parse_batting_table(blocks[table_idx][0]) if blocks[table_idx] else []
        except (KeyError, IndexError, TypeError):
            continue
    return by_team, posted


def main():
    ymd = sys.argv[1] if len(sys.argv) > 1 else datetime.date.today().strftime("%Y%m%d")
    s = make_session()
    games = fetch_games(s, ymd)
    print(f"{ymd} 경기 {len(games)}건")
    if not games:
        return

    docs = []
    now = datetime.datetime.now().isoformat(timespec="seconds")
    for g in games:
        gid = g["G_ID"]
        try:
            by_team, posted = fetch_lineup(s, gid)
        except Exception as e:
            print(f"  {gid} 라인업 실패(선발만 저장): {str(e)[:60]}")
            by_team, posted = {}, False
        away_lu = by_team.get(g.get("AWAY_ID"), [])
        home_lu = by_team.get(g.get("HOME_ID"), [])
        doc = {
            "game_id": gid,
            "date": f"{ymd[:4]}-{ymd[4:6]}-{ymd[6:]}",
            "time": g.get("G_TM"), "stadium": g.get("S_NM"),
            "away": g.get("AWAY_NM"), "home": g.get("HOME_NM"),
            "away_starter": (g.get("T_PIT_P_NM") or "").strip() or None,
            "home_starter": (g.get("B_PIT_P_NM") or "").strip() or None,
            "away_lineup": away_lu, "home_lineup": home_lu,
            "lineup_posted": posted,
            # CANCEL_SC_ID가 문자열 "0"으로 오기도 함 — 0/None/"정상경기"는 취소 아님
            "cancel": (g.get("CANCEL_SC_NM")
                       if str(g.get("CANCEL_SC_ID") or "0") != "0"
                       and g.get("CANCEL_SC_NM") != "정상경기" else None),
            "collected_at": now,
        }
        docs.append(doc)
        print(f"  {gid} {doc['away']}@{doc['home']} 선발 {doc['away_starter']}/{doc['home_starter']} "
              f"타순 {'게시' if posted else '미게시'}")

    client = MongoClient(os.environ.get("MONGO_URI", "mongodb://localhost:27017"),
                         serverSelectionTimeoutMS=8000)
    col = client[os.environ.get("MONGO_DB", "kbo")]["lineups"]
    # 라인업이 '처음 게시 확인된 시각'(first_posted_at)은 미게시→게시 전환 때 한 번만 기록
    existing = {e["game_id"]: e for e in col.find({"game_id": {"$in": [d["game_id"] for d in docs]}},
                                                  {"game_id": 1, "first_posted_at": 1})}
    for d in docs:
        prev = existing.get(d["game_id"], {})
        if prev.get("first_posted_at"):
            d["first_posted_at"] = prev["first_posted_at"]
        elif d["lineup_posted"]:
            d["first_posted_at"] = now
    ops = [UpdateOne({"game_id": d["game_id"]}, {"$set": d}, upsert=True) for d in docs]
    res = col.bulk_write(ops)
    print(f"Mongo upsert: matched {res.matched_count}, upserted {len(res.upserted_ids)}")
    client.close()


if __name__ == "__main__":
    main()
