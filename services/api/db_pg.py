# -*- coding: utf-8 -*-
"""PostgreSQL 연결 — .env의 DATABASE_URL 사용 (유저/관람기록).

연결은 풀에서 빌려 쓴다. 매 요청마다 새로 붙으면 Supabase 풀러까지 TLS·인증을 다시 하느라
연결 1회에 약 240ms가 든다(재사용은 약 20ms). 챗 요청 하나가 질문 기록·캐시·RAG·답변 기록 등으로
연결을 여러 번 열어서, 풀을 쓰면 요청당 1.5초 이상이 빠진다.

쓰는 쪽 코드는 그대로다. get_conn()으로 받아 conn.close()를 호출하면 풀로 반환된다.
"""
import os
import pathlib
import threading
import time
from urllib.parse import urlparse

import psycopg2
from psycopg2 import pool as _pg_pool
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
# 타임존: DB 기본값을 KST로 설정함(ALTER DATABASE/ROLE ... SET timezone='Asia/Seoul', docs/fix-timezone-kst.sql).
# Supabase 풀러가 startup의 options=-c timezone 을 무시해서, 세션 옵션 대신 DB 기본값으로 처리.
_PARAMS = dict(host=_u.hostname, port=_u.port or 5432,
               user=_u.username, password=_u.password, dbname=_u.path.lstrip("/"),
               # 끊긴 연결을 빌려주지 않도록 keepalive로 죽은 소켓을 일찍 감지한다.
               keepalives=1, keepalives_idle=30, keepalives_interval=10, keepalives_count=3)

# 세션 풀러(5432)는 빌린 연결 하나가 서버 연결 하나를 잡는다. 무료 플랜 한도를 생각해 작게 잡는다.
_POOL_MIN = int(os.environ.get("PG_POOL_MIN", "1"))
_POOL_MAX = int(os.environ.get("PG_POOL_MAX", "8"))

_pool = None
_pool_lock = threading.Lock()
# 연결별 마지막 반납 시각 — 이 시간 안에 다시 빌리면 살아있는지 확인하지 않는다.
_last_returned: dict[int, float] = {}
_IDLE_CHECK_S = float(os.environ.get("PG_POOL_IDLE_CHECK_S", "20"))


def _get_pool():
    global _pool
    if _pool is None:
        with _pool_lock:
            if _pool is None:
                _pool = _pg_pool.ThreadedConnectionPool(
                    _POOL_MIN, _POOL_MAX, cursor_factory=RealDictCursor, **_PARAMS)
    return _pool


class _PooledConnection:
    """psycopg2 연결 래퍼 — close()가 실제로 끊지 않고 풀에 반납한다.

    쓰는 쪽이 `with conn:`(트랜잭션)과 `conn.close()`를 그대로 쓰도록 속성을 위임한다.
    """

    def __init__(self, pool, conn):
        self._pool = pool
        self._conn = conn
        self._returned = False

    def __getattr__(self, name):
        return getattr(self._conn, name)

    def __enter__(self):
        # psycopg2의 with는 트랜잭션 범위다(연결을 닫지 않는다). 동작을 그대로 따른다.
        self._conn.__enter__()
        return self

    def __exit__(self, exc_type, exc, tb):
        return self._conn.__exit__(exc_type, exc, tb)

    def close(self):
        if self._returned:
            return
        self._returned = True
        try:
            if self._conn.closed:
                _last_returned.pop(id(self._conn), None)
                self._pool.putconn(self._conn, close=True)
                return
            # 트랜잭션이 열린 채 반납되면 다음 사용자가 그 상태를 물려받는다 → 정리 후 반납.
            if self._conn.get_transaction_status() != psycopg2.extensions.TRANSACTION_STATUS_IDLE:
                self._conn.rollback()
            _last_returned[id(self._conn)] = time.monotonic()
            self._pool.putconn(self._conn)
        except Exception:
            try:
                self._pool.putconn(self._conn, close=True)
            except Exception:
                pass


def get_conn():
    """RealDictCursor 연결(행을 dict로 반환). 풀에서 빌려주고 close()로 반납한다."""
    pool = _get_pool()
    for _ in range(3):
        conn = pool.getconn()
        if conn.closed:                 # 풀에 남아 있던 죽은 연결은 버리고 다시 받는다
            pool.putconn(conn, close=True)
            continue
        # 방금 쓴 연결은 살아 있다고 보고 확인 왕복을 건너뛴다. 오래 쉰 연결만 점검한다
        # (점검 쿼리도 왕복이라, 매번 하면 풀로 아낀 시간을 도로 까먹는다).
        idle = time.monotonic() - _last_returned.get(id(conn), 0.0)
        if idle > _IDLE_CHECK_S:
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1")
            except psycopg2.Error:
                pool.putconn(conn, close=True)
                continue
        return _PooledConnection(pool, conn)
    # 풀이 계속 죽은 연결만 주면 마지막 수단으로 직접 연결(반납 시 실제로 닫힘)
    return psycopg2.connect(cursor_factory=RealDictCursor, **_PARAMS)
