# -*- coding: utf-8 -*-
"""MongoDB(Atlas) 연결 모듈 — 루트 .env 의 MONGO_URI / MONGO_DB 사용."""
import os
import pathlib
from pymongo import MongoClient


def _load_dotenv(path: pathlib.Path):
    """루트 .env(KEY=VALUE) → 환경변수 (외부 의존성 없이)."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


# .env는 로컬 개발용(컨테이너/배포 환경엔 없음 → os.environ 사용).
# 위로 올라가며 .env를 찾되, 없으면 조용히 넘어감(IndexError 방지).
for _parent in pathlib.Path(__file__).resolve().parents:
    if (_parent / ".env").exists():
        _load_dotenv(_parent / ".env")
        break

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGO_DB", "kbo")

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
db = client[DB_NAME]


def latest_date(collection: str):
    """그 컬렉션에서 가장 최신 date(기준일) 값. 데이터 없으면 None."""
    doc = db[collection].find_one(sort=[("date", -1)])
    return doc["date"] if doc else None
