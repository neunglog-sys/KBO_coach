#!/usr/bin/env python3
"""Refresh NULL RAG embeddings after collaborative DB edits."""

from __future__ import annotations

import argparse
import os
import pathlib
import subprocess
import sys
from urllib.parse import urlparse

import psycopg2

ENV_FILE = pathlib.Path("/opt/kbo/.env")
APP_ROOT = pathlib.Path("/opt/kbo-current")
DEFAULT_SQL = pathlib.Path("/usr/local/share/kbo/rag_auto_refresh.sql")
RAG_TABLES = ("knowledge_chunks", "glossary", "rules")


def load_env() -> None:
    for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def connect():
    url = urlparse(os.environ["DATABASE_URL"])
    return psycopg2.connect(
        host=url.hostname,
        port=url.port or 5432,
        dbname=url.path.lstrip("/"),
        user=url.username,
        password=url.password,
    )


def install_schema(sql_path: pathlib.Path) -> None:
    sql = sql_path.read_text(encoding="utf-8")
    conn = connect()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(sql)
    finally:
        conn.close()
    print("RAG refresh triggers installed")


def refresh() -> None:
    conn = connect()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT dirty FROM rag_refresh_state WHERE singleton = TRUE")
            row = cur.fetchone()
            dirty = bool(row and row[0])
            pending = 0
            for table in RAG_TABLES:
                cur.execute(f"SELECT count(*) FROM {table} WHERE embedding IS NULL")
                pending += int(cur.fetchone()[0])
    finally:
        conn.close()

    if not dirty and pending == 0:
        print("RAG content unchanged")
        return

    if pending:
        subprocess.run(
            [sys.executable, str(APP_ROOT / "services/api/embed_chunks.py")],
            cwd=str(APP_ROOT),
            check=True,
        )

    conn = connect()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT to_regclass('public.response_cache')")
            if cur.fetchone()[0]:
                cur.execute("DELETE FROM response_cache WHERE kind = 'chat'")
            cur.execute(
                "UPDATE rag_refresh_state SET dirty = FALSE, refreshed_at = now() "
                "WHERE singleton = TRUE"
            )
    finally:
        conn.close()

    # 메모리 LRU에도 이전 답변이 있으므로 콘텐츠 변경 때만 API를 재시작한다.
    subprocess.run(["systemctl", "restart", "kbo-api.service"], check=True)
    print(f"RAG refresh completed: {pending} embeddings")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--install-schema", action="store_true")
    parser.add_argument("--sql", type=pathlib.Path, default=DEFAULT_SQL)
    args = parser.parse_args()
    load_env()
    if args.install_schema:
        install_schema(args.sql)
    else:
        refresh()


if __name__ == "__main__":
    main()
