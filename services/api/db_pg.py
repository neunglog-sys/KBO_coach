# -*- coding: utf-8 -*-
"""PostgreSQL 연결 — .env의 DATABASE_URL 사용 (유저/관람기록)."""
import os
import pathlib
from urllib.parse import urlparse
import psycopg2
from psycopg2.extras import RealDictCursor


def _load_dotenv(path: pathlib.Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


# .env는 로컬 개발용(컨테이너/배포 환경엔 없음 → os.environ 사용).
for _parent in pathlib.Path(__file__).resolve().parents:
    if (_parent / ".env").exists():
        _load_dotenv(_parent / ".env")
        break

# URL을 파싱해 keyword 인자로 연결 (비번 특수문자 안전)
_u = urlparse(os.environ["DATABASE_URL"])
_PARAMS = dict(host=_u.hostname, port=_u.port or 5432,
               user=_u.username, password=_u.password, dbname=_u.path.lstrip("/"))


def get_conn():
    """RealDictCursor 연결(행을 dict로 반환)."""
    return psycopg2.connect(cursor_factory=RealDictCursor, **_PARAMS)
