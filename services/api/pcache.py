# -*- coding: utf-8 -*-
"""영속 응답 캐시 — Supabase(Postgres)에 챗 답변·TTS 오디오를 write-through 저장.

메모리 LRU 캐시는 배포/인스턴스 교체마다 증발해 "캐시 있는데 계속 느린" 체감을 만든다.
여기서는 메모리 미스 시 DB를 한 번 더 보고(히트 시 메모리에 재적재), 새 결과는
비동기로 DB에 기록한다 → 배포해도 캐시 생존, 한 번 답한 질문은 영구 즉답.

설계 원칙:
- 비치명: DB 없음/실패 시 전부 조용히 패스(요청은 절대 안 깨짐).
- 비동기 쓰기: 응답 경로를 1ms도 안 막음 (ThreadPoolExecutor).
- 무효화는 '키'로 자동: TTS는 키에 voice_id 포함(보이스 교체 시 자연 무효),
  챗은 키에 페르소나 해시 포함(페르소나 수정 시 자연 무효 — 재시작 불필요).
- 용량 캡: 종류(kind)별 상한, 오래 안 쓴 것부터 삭제(LRU).

테이블은 첫 사용 시 자동 생성(response_cache).
"""
import hashlib
import json
import os
import threading
from concurrent.futures import ThreadPoolExecutor

from psycopg2 import Binary

# 종류별 보관 상한 (행 수). 오디오(stream/tts)는 행당 수백 KB라 보수적으로.
_CAPS = {"chat": 2000, "stream": 400, "tts": 400}
_EVICT_EVERY = 20            # put N회마다 한 번 초과분 정리
_MAX_AUDIO = 5 * 1024 * 1024  # 5MB 초과 오디오는 저장 생략(이상치 보호)
_TTL_DAYS = 30               # 보존기간 — 이 기간 동안 안 쓰인 캐시는 삭제(개인정보 잔존 최소화)

_ex = ThreadPoolExecutor(max_workers=2)
_ready = False
_ready_lock = threading.Lock()
_put_count = 0


def _available() -> bool:
    return bool(os.environ.get("DATABASE_URL"))


def _conn():
    from db_pg import get_conn
    return get_conn()


def _ensure(conn) -> None:
    global _ready
    if _ready:
        return
    with _ready_lock:
        if _ready:
            return
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS response_cache (
                    cache_key  TEXT PRIMARY KEY,
                    kind       TEXT NOT NULL,
                    payload    JSONB,
                    audio      BYTEA,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    last_used  TIMESTAMPTZ NOT NULL DEFAULT now(),
                    hits       INT NOT NULL DEFAULT 0
                )""")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_response_cache_kind_lru "
                        "ON response_cache (kind, last_used)")
        conn.commit()
        _ready = True


def _key(kind: str, parts) -> str:
    raw = "\x1f".join(str(p) for p in parts)
    return f"{kind}:{hashlib.sha256(raw.encode('utf-8')).hexdigest()}"


def get(kind: str, parts):
    """히트 시 (payload dict|None, audio bytes|None), 미스/실패 시 None."""
    if not _available():
        return None
    try:
        conn = _conn()
        try:
            _ensure(conn)
            k = _key(kind, parts)
            with conn, conn.cursor() as cur:
                cur.execute("UPDATE response_cache SET last_used = now(), hits = hits + 1 "
                            "WHERE cache_key = %s RETURNING payload, audio", (k,))
                row = cur.fetchone()
            if not row:
                return None
            audio = bytes(row["audio"]) if row["audio"] is not None else None
            return (row["payload"], audio)
        finally:
            conn.close()
    except Exception:
        return None   # 영속층 장애는 비치명 — 합성 경로로 폴백


def put(kind: str, parts, payload: dict | None = None, audio: bytes | None = None) -> None:
    """비동기 저장(응답 경로 안 막음)."""
    if not _available():
        return
    if audio is not None and len(audio) > _MAX_AUDIO:
        return
    _ex.submit(_put_sync, kind, _key(kind, parts), payload, audio)


def _put_sync(kind: str, k: str, payload, audio) -> None:
    global _put_count
    try:
        conn = _conn()
        try:
            _ensure(conn)
            with conn, conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO response_cache (cache_key, kind, payload, audio)
                    VALUES (%s, %s, %s::jsonb, %s)
                    ON CONFLICT (cache_key) DO UPDATE
                    SET payload = EXCLUDED.payload, audio = EXCLUDED.audio,
                        last_used = now()""",
                    (k, kind, json.dumps(payload, ensure_ascii=False) if payload is not None else None,
                     Binary(audio) if audio is not None else None))
                _put_count += 1
                if _put_count % _EVICT_EVERY == 0:   # 가끔 정리: 초과분(LRU) + 보존기간(TTL) 경과분
                    cur.execute("""
                        DELETE FROM response_cache WHERE kind = %s AND cache_key NOT IN (
                            SELECT cache_key FROM response_cache WHERE kind = %s
                            ORDER BY last_used DESC LIMIT %s)""",
                        (kind, kind, _CAPS.get(kind, 500)))
                    cur.execute("DELETE FROM response_cache WHERE last_used < now() - interval '%s days'",
                                (_TTL_DAYS,))
        finally:
            conn.close()
    except Exception:
        pass   # 저장 실패는 무시(다음 기회에)


def persona_hash(team_code: str | None) -> str:
    """팀 페르소나 내용 해시(12자) — 챗 캐시 키에 포함해 페르소나 수정 시 캐시 자연 무효화.
    실패/팀없음이면 '' (캐시는 동작하되 버전 구분만 없어짐)."""
    if not team_code or not _available():
        return ""
    try:
        conn = _conn()
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT md5(coalesce(definition,'') || coalesce(personality_core,'') ||
                               coalesce(speaking_features,'') || coalesce(response_style,'')) AS h
                    FROM team_personas WHERE team_code = %s""", (team_code,))
                row = cur.fetchone()
            return (row["h"][:12] if row and row.get("h") else "")
        finally:
            conn.close()
    except Exception:
        return ""
