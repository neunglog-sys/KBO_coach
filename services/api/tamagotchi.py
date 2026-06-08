# -*- coding: utf-8 -*-
"""다마고치 상태(기분·응원파워·연속/페널티) 계정별 서버 저장 — PostgreSQL.

레벨·경험치·출석은 attendance_progress가 담당. 여기서는 그 외 다마고치
데일리 상태(moodBase, cheerPower, lastCheerDate 등)를 계정별로 보존해
기기를 바꿔도 다마고치 기분·응원파워가 유지되게 한다. 상태는 프론트가
계산하므로 서버는 JSON 보관소 역할만 한다.
"""
from __future__ import annotations

from fastapi import APIRouter, Header
from psycopg2.extras import Json
from pydantic import BaseModel

from attendance import _user_key
from db_pg import get_conn

router = APIRouter(prefix="/tamagotchi", tags=["tamagotchi"])


class TamagotchiStateIn(BaseModel):
    state: dict


def _ensure_table() -> None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS tamagotchi_state (
                    user_key   TEXT PRIMARY KEY,
                    state      JSONB NOT NULL,
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
        conn.commit()
    finally:
        conn.close()


@router.get("/state")
def get_state(authorization: str | None = Header(default=None)):
    """저장된 다마고치 상태 반환. 없으면 state=null(프론트가 로컬/기본값 사용)."""
    key = _user_key(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT state FROM tamagotchi_state WHERE user_key = %s", (key,))
            row = cur.fetchone()
        return {"state": row["state"] if row else None}
    finally:
        conn.close()


@router.put("/state")
def put_state(body: TamagotchiStateIn, authorization: str | None = Header(default=None)):
    """다마고치 상태 저장(계정별 upsert)."""
    key = _user_key(authorization)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO tamagotchi_state (user_key, state, updated_at)
                VALUES (%s, %s, NOW())
                ON CONFLICT (user_key) DO UPDATE SET
                    state = EXCLUDED.state,
                    updated_at = NOW()
                """,
                (key, Json(body.state)),
            )
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


_ensure_table()
