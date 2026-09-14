# -*- coding: utf-8 -*-
"""임베딩 백필 — embedding 컬럼이 비어있는(NULL) 행만 임베딩해 저장. 증분 실행 안전.

대상 3종. chat.py가 세 테이블 모두 벡터검색에 쓴다:
  knowledge_chunks  구단 문화·팩트 청크 (주 검색 대상)
  glossary          용어 — 심한 오타 추정 폴백("돌우"→도루)
  rules             규칙 — topic 키워드가 없어도 의미가 가까운 규칙 부착

사용법:  python embed_chunks.py            (3종 전부)
        python embed_chunks.py glossary   (특정 테이블만)
"""
import os
import pathlib
import sys
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


# (테이블, PK 컬럼, 임베딩할 텍스트 컬럼들) — 텍스트는 줄바꿈으로 이어 붙여 임베딩한다.
TARGETS = {
    "knowledge_chunks": ("chunk_id", ("title", "content")),
    "glossary": ("term_id", ("term", "definition")),
    "rules": ("rule_id", ("topic", "content")),
}


def backfill(conn, table: str) -> int:
    pk, cols = TARGETS[table]
    cur = conn.cursor()
    cur.execute(f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS embedding vector({EMBED_DIM})")
    conn.commit()

    cur.execute(f"SELECT {pk}, {', '.join(cols)} FROM {table} "
                f"WHERE embedding IS NULL ORDER BY {pk}")
    rows = cur.fetchall()
    print(f"[{table}] 임베딩 대상: {len(rows)}건 (NULL만)")

    done = 0
    for row in rows:
        key, parts = row[0], [p for p in row[1:] if p]
        vec = embed_text("\n".join(parts), task_type="RETRIEVAL_DOCUMENT")
        cur.execute(f"UPDATE {table} SET embedding = %s WHERE {pk} = %s",
                    (to_pgvector(vec), key))
        conn.commit()
        done += 1
        if done % 10 == 0:
            print(f"  {done}/{len(rows)}")

    cur.execute(f"SELECT count(*) FROM {table} WHERE embedding IS NOT NULL")
    print(f"[{table}] 완료: {done}건 임베딩 → 전체 {cur.fetchone()[0]}건 보유")
    return done


def main():
    _load_env()
    tables = sys.argv[1:] or list(TARGETS)
    unknown = [t for t in tables if t not in TARGETS]
    if unknown:
        raise SystemExit(f"알 수 없는 테이블: {unknown} (가능: {list(TARGETS)})")

    u = urlparse(os.environ["DATABASE_URL"])
    conn = psycopg2.connect(host=u.hostname, port=u.port, dbname=u.path.lstrip("/"),
                            user=u.username, password=u.password)
    conn.cursor().execute("CREATE EXTENSION IF NOT EXISTS vector")
    conn.commit()

    for t in tables:
        backfill(conn, t)
    conn.close()


if __name__ == "__main__":
    main()
