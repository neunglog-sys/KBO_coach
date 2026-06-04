# -*- coding: utf-8 -*-
"""Attendance check-in API backed by PostgreSQL."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Header
from jose import JWTError, jwt
from pydantic import BaseModel

from auth import JWT_ALG, JWT_SECRET
from db_pg import get_conn

router = APIRouter(prefix="/attendance", tags=["attendance"])

CHECKIN_XP = 20
XP_PER_LEVEL = 100


class AttendanceStatus(BaseModel):
    level: int
    xp: int
    xp_to_next: int
    total_checkins: int
    checked_today: bool
    last_checkin_date: str | None = None
    gained_xp: int = 0
    message: str


def _raw_auth_key(authorization: str | None) -> str:
    if authorization and authorization.strip():
        return authorization.strip()
    return "guest"


def _user_key(authorization: str | None) -> str:
    if not authorization or not authorization.strip():
        return "guest"

    token = authorization.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return f"user:{payload['sub']}"
    except (JWTError, KeyError):
        return _raw_auth_key(authorization)


def _ensure_table() -> None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS attendance_progress (
                    user_key           TEXT PRIMARY KEY,
                    xp                 INTEGER NOT NULL DEFAULT 0,
                    total_checkins     INTEGER NOT NULL DEFAULT 0,
                    last_checkin_date  DATE,
                    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
        conn.commit()
    finally:
        conn.close()


def _migrate_token_state(authorization: str | None, stable_key: str) -> None:
    raw_key = _raw_auth_key(authorization)
    if raw_key == stable_key or raw_key == "guest":
        return

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO attendance_progress (user_key, xp, total_checkins, last_checkin_date)
                SELECT %s, xp, total_checkins, last_checkin_date
                FROM attendance_progress
                WHERE user_key = %s
                ON CONFLICT (user_key) DO UPDATE SET
                    xp = GREATEST(attendance_progress.xp, EXCLUDED.xp),
                    total_checkins = GREATEST(attendance_progress.total_checkins, EXCLUDED.total_checkins),
                    last_checkin_date = GREATEST(attendance_progress.last_checkin_date, EXCLUDED.last_checkin_date),
                    updated_at = NOW()
                """,
                (stable_key, raw_key),
            )
        conn.commit()
    finally:
        conn.close()


def _get_state(key: str) -> dict:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO attendance_progress (user_key)
                VALUES (%s)
                ON CONFLICT (user_key) DO NOTHING
                """,
                (key,),
            )
            cur.execute(
                """
                SELECT xp, total_checkins, last_checkin_date
                FROM attendance_progress
                WHERE user_key = %s
                """,
                (key,),
            )
            row = cur.fetchone()
        conn.commit()
        return {
            "xp": int(row["xp"]),
            "total_checkins": int(row["total_checkins"]),
            "last_checkin_date": row["last_checkin_date"].isoformat()
            if row["last_checkin_date"]
            else None,
        }
    finally:
        conn.close()


def _to_status(state: dict, gained_xp: int = 0, message: str | None = None) -> AttendanceStatus:
    today = date.today().isoformat()
    xp = int(state["xp"])
    level = xp // XP_PER_LEVEL + 1
    xp_to_next = XP_PER_LEVEL - (xp % XP_PER_LEVEL)
    checked_today = state.get("last_checkin_date") == today

    if message is None:
        message = "\uc624\ub298 \ucd9c\uc11d \uc644\ub8cc!" if checked_today else "\uc544\uc9c1 \uc624\ub298 \ucd9c\uc11d \uc804\uc774\uc5d0\uc694."

    return AttendanceStatus(
        level=level,
        xp=xp,
        xp_to_next=xp_to_next,
        total_checkins=int(state["total_checkins"]),
        checked_today=checked_today,
        last_checkin_date=state.get("last_checkin_date"),
        gained_xp=gained_xp,
        message=message,
    )


def add_xp(key: str, amount: int) -> None:
    """Add XP for the shared attendance/quiz progress track."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO attendance_progress (user_key, xp)
                VALUES (%s, %s)
                ON CONFLICT (user_key) DO UPDATE SET
                    xp = attendance_progress.xp + EXCLUDED.xp,
                    updated_at = NOW()
                """,
                (key, amount),
            )
        conn.commit()
    finally:
        conn.close()


@router.get("/status", response_model=AttendanceStatus)
def get_attendance_status(authorization: str | None = Header(default=None)):
    key = _user_key(authorization)
    _migrate_token_state(authorization, key)
    state = _get_state(key)
    return _to_status(state)


@router.post("/check-in", response_model=AttendanceStatus)
def check_in(authorization: str | None = Header(default=None)):
    key = _user_key(authorization)
    _migrate_token_state(authorization, key)
    state = _get_state(key)
    today = date.today().isoformat()

    if state.get("last_checkin_date") == today:
        return _to_status(state, message="\uc624\ub298\uc740 \uc774\ubbf8 \ucd9c\uc11d\ud588\uc5b4\uc694.")

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE attendance_progress
                SET xp = xp + %s,
                    total_checkins = total_checkins + 1,
                    last_checkin_date = %s,
                    updated_at = NOW()
                WHERE user_key = %s
                RETURNING xp, total_checkins, last_checkin_date
                """,
                (CHECKIN_XP, today, key),
            )
            row = cur.fetchone()
        conn.commit()
    finally:
        conn.close()

    next_state = {
        "xp": int(row["xp"]),
        "total_checkins": int(row["total_checkins"]),
        "last_checkin_date": row["last_checkin_date"].isoformat()
        if row["last_checkin_date"]
        else None,
    }
    return _to_status(next_state, gained_xp=CHECKIN_XP, message="\ucd9c\uc11d \uc644\ub8cc! \uacbd\ud5d8\uce58\uac00 \uc62c\ub790\uc5b4\uc694.")


_ensure_table()
