# -*- coding: utf-8 -*-
"""출처가 확인된 Google Search 결과를 짧게 보관해 다음 RAG에 재사용한다.

영구 지식 테이블(knowledge_chunks)에 자동으로 섞지 않고, 출처·확인 시각·만료 시각이
있는 별도 캐시로 관리한다. DB나 임베딩이 실패해도 채팅 요청은 계속 동작한다.
"""
import json
import threading
from concurrent.futures import ThreadPoolExecutor

from db_pg import get_conn
from embeddings import EMBED_DIM, embed_text, to_pgvector

_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="web-knowledge")
_ready = False
_ready_lock = threading.Lock()


def _normalize(question: str) -> str:
    return " ".join((question or "").split()).casefold()


def _ensure(conn) -> None:
    global _ready
    if _ready:
        return
    with _ready_lock:
        if _ready:
            return
        with conn.cursor() as cur:
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS web_knowledge_cache (
                    cache_id    BIGSERIAL PRIMARY KEY,
                    query_key   TEXT NOT NULL,
                    question    TEXT NOT NULL,
                    team_code   VARCHAR(4) NOT NULL DEFAULT '',
                    answer      TEXT NOT NULL,
                    sources     JSONB NOT NULL DEFAULT '[]'::jsonb,
                    embedding   vector({EMBED_DIM}),
                    checked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                    expires_at  TIMESTAMPTZ NOT NULL,
                    UNIQUE (query_key, team_code)
                )""")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_web_knowledge_expiry "
                        "ON web_knowledge_cache (expires_at)")
        conn.commit()
        _ready = True


def find(question: str, team_code: str | None, min_score: float = 0.78) -> dict | None:
    """동일하거나 의미가 매우 가까운, 아직 만료되지 않은 검색 근거를 찾는다."""
    query_key = _normalize(question)
    if not query_key:
        return None
    code = team_code or ""
    try:
        conn = get_conn()
        try:
            _ensure(conn)
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT answer, sources, checked_at, expires_at, 1.0 AS score
                    FROM web_knowledge_cache
                    WHERE query_key = %s AND team_code = %s AND expires_at > now()
                    LIMIT 1
                """, (query_key, code))
                row = cur.fetchone()
                if row:
                    return dict(row)

                qvec = to_pgvector(embed_text(question, task_type="RETRIEVAL_QUERY"))
                cur.execute("""
                    SELECT answer, sources, checked_at, expires_at,
                           1 - (embedding <=> %s::vector) AS score
                    FROM web_knowledge_cache
                    WHERE team_code = %s AND expires_at > now() AND embedding IS NOT NULL
                    ORDER BY embedding <=> %s::vector
                    LIMIT 1
                """, (qvec, code, qvec))
                row = cur.fetchone()
                if row and float(row.get("score") or 0) >= min_score:
                    return dict(row)
        finally:
            conn.close()
    except Exception:
        return None
    return None


def store(
    question: str,
    team_code: str | None,
    answer: str,
    sources: list[dict],
    *,
    ttl_hours: int,
) -> None:
    """출처가 있는 결과만 비동기로 저장한다."""
    if not question.strip() or not answer.strip() or not sources:
        return
    _pool.submit(_store_sync, question, team_code, answer, sources, max(1, ttl_hours))


def _store_sync(
    question: str,
    team_code: str | None,
    answer: str,
    sources: list[dict],
    ttl_hours: int,
) -> None:
    try:
        embedding = to_pgvector(embed_text(question, task_type="RETRIEVAL_DOCUMENT"))
        conn = get_conn()
        try:
            _ensure(conn)
            with conn, conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO web_knowledge_cache
                        (query_key, question, team_code, answer, sources, embedding, expires_at)
                    VALUES (%s, %s, %s, %s, %s::jsonb, %s::vector,
                            now() + (%s * interval '1 hour'))
                    ON CONFLICT (query_key, team_code) DO UPDATE
                    SET question = EXCLUDED.question,
                        answer = EXCLUDED.answer,
                        sources = EXCLUDED.sources,
                        embedding = EXCLUDED.embedding,
                        checked_at = now(),
                        expires_at = EXCLUDED.expires_at
                """, (
                    _normalize(question), question.strip(), team_code or "", answer.strip(),
                    json.dumps(sources, ensure_ascii=False), embedding, ttl_hours,
                ))
                # 만료 자료와 지나치게 오래된 초과분을 가볍게 정리한다.
                cur.execute("DELETE FROM web_knowledge_cache WHERE expires_at <= now()")
                cur.execute("""
                    DELETE FROM web_knowledge_cache
                    WHERE cache_id IN (
                        SELECT cache_id FROM web_knowledge_cache
                        ORDER BY checked_at DESC OFFSET 5000
                    )
                """)
        finally:
            conn.close()
    except Exception:
        return
