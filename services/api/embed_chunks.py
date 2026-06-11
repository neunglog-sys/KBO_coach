# -*- coding: utf-8 -*-
"""knowledge_chunks 임베딩 백필 — embedding 컬럼이 비어있는(NULL) 청크만 임베딩해 저장.
신규 청크가 추가되면 다시 실행하면 됨(증분).

사용법:  python embed_chunks.py
"""
import os
import pathlib
from urllib.parse import urlparse

import psycopg2

from embeddings import embed_text, to_pgvector, EMBED_DIM


def _load_env():
    root = pathlib.Path(__file__).resolve().parents[2]
    for line in (root / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main():
    _load_env()
    u = urlparse(os.environ["DATABASE_URL"])
    conn = psycopg2.connect(host=u.hostname, port=u.port, dbname=u.path.lstrip("/"),
                            user=u.username, password=u.password)
    cur = conn.cursor()

    # pgvector + embedding 컬럼 보장 (멱등)
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
    cur.execute(f"ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding vector({EMBED_DIM})")
    conn.commit()

    cur.execute("SELECT chunk_id, title, content FROM knowledge_chunks WHERE embedding IS NULL ORDER BY chunk_id")
    rows = cur.fetchall()
    print(f"임베딩 대상: {len(rows)}건 (NULL만)")

    done = 0
    for chunk_id, title, content in rows:
        text = f"{title}\n{content}" if title else content
        vec = embed_text(text, task_type="RETRIEVAL_DOCUMENT")
        cur.execute("UPDATE knowledge_chunks SET embedding = %s WHERE chunk_id = %s",
                    (to_pgvector(vec), chunk_id))
        conn.commit()
        done += 1
        if done % 10 == 0:
            print(f"  {done}/{len(rows)}")

    cur.execute("SELECT count(*) FROM knowledge_chunks WHERE embedding IS NOT NULL")
    total = cur.fetchone()[0]
    print(f"완료: {done}건 임베딩 → 전체 {total}건 embedding 보유")
    conn.close()


if __name__ == "__main__":
    main()
