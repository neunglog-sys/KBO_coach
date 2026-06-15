# -*- coding: utf-8 -*-
"""세션 완료율(Task Completion Rate) 측정 — 채팅 응답(텍스트·음성)의 시작/정상종료를 기록.

가이드(§2-3) 정석: 세션 시작/정상종료 이벤트를 DB에 남기고 집계한다.
  완료율(%) = 정상종료 수 / 시작 수  (kind별)
스트리밍이 중간에 끊기면(네트워크·사용자 이탈) start만 남고 complete가 없어 미완료로 잡힌다.

kind: 'chat'(텍스트 통응답) / 'chat_stream'(텍스트 스트림) / 'voice_stream'(음성 스트림)
기록 실패가 본 응답을 막지 않도록 모든 경로를 예외-안전하게 처리한다.
"""
from __future__ import annotations

from db_pg import get_conn


def ensure_table(cur) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS session_events (
            event_id   BIGSERIAL PRIMARY KEY,
            kind       TEXT NOT NULL,
            phase      TEXT NOT NULL,        -- 'start' | 'complete'
            user_key   TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        """
    )


def record(kind: str, phase: str, user_key: str | None = None) -> None:
    try:
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                ensure_table(cur)
                cur.execute(
                    "INSERT INTO session_events (kind, phase, user_key) VALUES (%s, %s, %s)",
                    (kind, phase, user_key),
                )
            conn.commit()
        finally:
            conn.close()
    except Exception:
        pass  # 측정 실패는 비치명 — 응답 흐름을 막지 않는다.


def completion_rate() -> dict:
    """kind별 시작/완료/완료율 + 전체 집계."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            ensure_table(cur)
            cur.execute(
                """
                SELECT kind,
                       SUM(CASE WHEN phase = 'start' THEN 1 ELSE 0 END)    AS started,
                       SUM(CASE WHEN phase = 'complete' THEN 1 ELSE 0 END) AS completed
                FROM session_events
                GROUP BY kind
                ORDER BY kind
                """
            )
            by_kind = []
            tot_s = tot_c = 0
            for r in cur.fetchall():
                s, c = int(r["started"]), int(r["completed"])
                tot_s += s
                tot_c += c
                by_kind.append({
                    "kind": r["kind"], "started": s, "completed": c,
                    "completion_rate": round(c / s * 100, 1) if s else None,
                })
        return {
            "by_kind": by_kind,
            "overall": {
                "started": tot_s, "completed": tot_c,
                "completion_rate": round(tot_c / tot_s * 100, 1) if tot_s else None,
            },
        }
    finally:
        conn.close()
