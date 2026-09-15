#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
data/crawling/<기준일>/*.json  →  로컬 MongoDB 적재

- DB: kbo
- 컬렉션 = 파일 메타의 dataset 이름:
    teamrank / hitters / pitchers        (시즌누적, date = as_of_game_date)
    games / game_hitters / game_pitchers (그 날 경기,  date = game_date)
- 각 record에 date(기준일)·collected_date를 박아서 self-contained 하게 저장
- upsert라 매일·재실행해도 중복 없이 그 날짜분만 갱신됨

사용법:
    python ingest_mongo.py              # data/crawling 전체 날짜 적재
    python ingest_mongo.py 2026-05-31   # 특정 날짜만
환경변수 MONGO_URI 로 접속 주소 변경 가능 (기본 mongodb://localhost:27017)
"""
import sys, os, json, pathlib
from pymongo import MongoClient, UpdateOne


def _load_dotenv(path: pathlib.Path):
    """프로젝트 루트의 .env (KEY=VALUE) 읽어서 환경변수로. (외부 의존성 없이)"""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]
_load_dotenv(_REPO_ROOT / ".env")

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGO_DB", "kbo")
CRAWL_DIR = pathlib.Path(os.environ.get("CRAWL_DIR") or (_REPO_ROOT / "data" / "crawling"))

# 컬렉션별 고유키 (이 키가 같으면 덮어씀)
# 선수 누적은 playerId로 — 동명이인(같은 팀 같은 이름) 안전하게 구분됨
KEYFIELDS = {
    "teamrank":      ["date", "팀명"],
    "hitters":       ["date", "playerId"],
    "pitchers":      ["date", "playerId"],
    "games":         ["date", "원정팀", "홈팀"],
    "game_hitters":  ["gameId", "팀", "선수명", "타순"],
    # 박스스코어엔 playerId가 없어 이름만으론 같은 팀 동명이인(삼성 이승현·한화 박준영)이 한 행으로 덮어써졌다.
    # → 팀 안에서의 등판 순서(순번)로 구분. 순번은 적재 시 원본 행 순서대로 매긴다.
    "game_pitchers": ["gameId", "팀", "순번"],
    "game_scoreboards": ["gameId"],
}


def ingest_file(db, path: pathlib.Path) -> tuple[str, int]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    dataset = payload.get("dataset")
    date = payload.get("as_of_game_date") or payload.get("game_date")
    collected = payload.get("collected_date")
    records = payload.get("records", [])
    if not dataset or not records:
        return (dataset or path.name, 0)

    keyfields = KEYFIELDS.get(dataset, ["date"])
    if dataset == "game_pitchers":
        order = {}
        for r in records:
            k = (r.get("gameId"), r.get("팀"))
            order[k] = order.get(k, 0) + 1
            r["순번"] = order[k]
        # 순번 도입 전 방식(이름 키)으로 적재된 옛 행은 동명이인이 합쳐져 있을 수 있어 지우고 다시 넣는다
        gids = sorted({r.get("gameId") for r in records if r.get("gameId")})
        db[dataset].delete_many({"gameId": {"$in": gids}, "순번": {"$exists": False}})
    ops = []
    for r in records:
        r = {**r, "date": date, "collected_date": collected}
        key = {k: r.get(k) for k in keyfields}
        ops.append(UpdateOne(key, {"$set": r}, upsert=True))
    if ops:
        db[dataset].bulk_write(ops, ordered=False)
    return (dataset, len(ops))


def main() -> int:
    if not CRAWL_DIR.exists():
        print(f"데이터 폴더 없음: {CRAWL_DIR}", file=sys.stderr)
        return 1

    target = sys.argv[1] if len(sys.argv) > 1 else "*"
    files = sorted(CRAWL_DIR.glob(f"{target}/*.json"))
    if not files:
        print(f"적재할 JSON 없음: {CRAWL_DIR}/{target}/*.json", file=sys.stderr)
        return 1

    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=4000)
    client.server_info()  # 연결 확인 (실패 시 즉시 예외)
    db = client[DB_NAME]
    safe_uri = MONGO_URI
    if "://" in safe_uri and "@" in safe_uri:
        scheme, rest = safe_uri.split("://", 1)
        safe_uri = f"{scheme}://***@{rest.split('@', 1)[1]}"
    print(f"MongoDB 연결 OK ({safe_uri}) → db '{DB_NAME}'")

    total = 0
    for f in files:
        dataset, n = ingest_file(db, f)
        total += n
        print(f"  [{f.parent.name}] {dataset}: {n}건 upsert")

    print(f"\n완료: {len(files)}개 파일 / {total}건 적재")
    print("컬렉션별 문서 수:")
    for coll in sorted(db.list_collection_names()):
        print(f"  {coll}: {db[coll].count_documents({})}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
