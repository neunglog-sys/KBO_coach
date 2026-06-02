# -*- coding: utf-8 -*-
"""kbo 데이터베이스 생성 + schema.sql 적용 (1회 실행). .env의 DATABASE_URL 사용."""
import os
import pathlib
from urllib.parse import urlparse
import psycopg2


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

u = urlparse(os.environ["DATABASE_URL"])
PARAMS = dict(host=u.hostname, port=u.port or 5432, user=u.username, password=u.password)
DBNAME = u.path.lstrip("/")


def main():
    # 1) DB 생성 (없으면) — 'postgres' 기본 DB에 접속해서
    con = psycopg2.connect(dbname="postgres", **PARAMS)
    con.autocommit = True
    cur = con.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DBNAME,))
    if cur.fetchone():
        print(f"DB '{DBNAME}' 이미 존재")
    else:
        cur.execute(f'CREATE DATABASE "{DBNAME}"')
        print(f"DB '{DBNAME}' 생성됨")
    con.close()

    # 2) 스키마 적용
    con = psycopg2.connect(dbname=DBNAME, **PARAMS)
    con.autocommit = True
    cur = con.cursor()
    schema = (pathlib.Path(__file__).parent / "schema.sql").read_text(encoding="utf-8")
    cur.execute(schema)
    cur.execute("SELECT table_name FROM information_schema.tables "
                "WHERE table_schema='public' ORDER BY table_name")
    print("테이블:", [r[0] for r in cur.fetchall()])
    con.close()
    print("완료.")


if __name__ == "__main__":
    main()
