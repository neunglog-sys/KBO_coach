# -*- coding: utf-8 -*-
"""Attendance check-in API backed by PostgreSQL."""
from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Header
from jose import JWTError, jwt
from pydantic import BaseModel

from auth import JWT_ALG, JWT_SECRET
from db_pg import get_conn

router = APIRouter(prefix="/attendance", tags=["attendance"])

CHECKIN_XP = 20
CHEER_XP = 5
XP_PER_LEVEL = 100


class AttendanceStatus(BaseModel):
    level: int
    xp: int
    xp_to_next: int
    total_checkins: int
    streak: int = 0
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
                    current_streak     INTEGER NOT NULL DEFAULT 0,
                    last_checkin_date  DATE,
                    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
                )
                """
            )
            # 기존 운영 DB 호환 — 연속출석 컬럼이 없으면 추가
            cur.execute(
                "ALTER TABLE attendance_progress "
                "ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0"
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
                INSERT INTO attendance_progress (user_key, xp, total_checkins, current_streak, last_checkin_date)
                SELECT %s, xp, total_checkins, current_streak, last_checkin_date
                FROM attendance_progress
                WHERE user_key = %s
                ON CONFLICT (user_key) DO UPDATE SET
                    xp = GREATEST(attendance_progress.xp, EXCLUDED.xp),
                    total_checkins = GREATEST(attendance_progress.total_checkins, EXCLUDED.total_checkins),
                    current_streak = GREATEST(attendance_progress.current_streak, EXCLUDED.current_streak),
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
                SELECT xp, total_checkins, current_streak, last_checkin_date
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
            "streak": int(row["current_streak"]),
            "last_checkin_date": row["last_checkin_date"].isoformat()
            if row["last_checkin_date"]
            else None,
        }
    finally:
        conn.close()


def _to_status(state: dict, gained_xp: int = 0, message: str | None = None) -> AttendanceStatus:
    today = date.today()
    today_iso = today.isoformat()
    yesterday_iso = (today - timedelta(days=1)).isoformat()
    xp = int(state["xp"])
    level = xp // XP_PER_LEVEL + 1
    xp_to_next = XP_PER_LEVEL - (xp % XP_PER_LEVEL)
    last = state.get("last_checkin_date")
    checked_today = last == today_iso

    # \uc5f0\uc18d\ucd9c\uc11d \ud45c\uc2dc\uac12: \ub9c8\uc9c0\ub9c9 \ucd9c\uc11d\uc774 \uc624\ub298/\uc5b4\uc81c\uba74 \uc720\ud6a8, \uadf8 \uc774\uc804\uc774\uba74 \uc5f0\uc18d \ub04a\uae40(0)
    stored_streak = int(state.get("streak", 0))
    streak = stored_streak if last in (today_iso, yesterday_iso) else 0

    if message is None:
        message = "\uc624\ub298 \ucd9c\uc11d \uc644\ub8cc!" if checked_today else "\uc544\uc9c1 \uc624\ub298 \ucd9c\uc11d \uc804\uc774\uc5d0\uc694."

    return AttendanceStatus(
        level=level,
        xp=xp,
        xp_to_next=xp_to_next,
        total_checkins=int(state["total_checkins"]),
        streak=streak,
        checked_today=checked_today,
        last_checkin_date=last,
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
    today = date.today()
    today_iso = today.isoformat()
    yesterday_iso = (today - timedelta(days=1)).isoformat()

    if state.get("last_checkin_date") == today_iso:
        return _to_status(state, message="\uc624\ub298\uc740 \uc774\ubbf8 \ucd9c\uc11d\ud588\uc5b4\uc694.")

    # \uc5b4\uc81c \ucd9c\uc11d\ud588\uc73c\uba74 \uc5f0\uc18d +1, \uc544\ub2c8\uba74(\ucc98\uc74c\u00b7\ub04a\uae40) 1\ubd80\ud130 \ub2e4\uc2dc
    prev_streak = int(state.get("streak", 0))
    new_streak = prev_streak + 1 if state.get("last_checkin_date") == yesterday_iso else 1

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE attendance_progress
                SET xp = xp + %s,
                    total_checkins = total_checkins + 1,
                    current_streak = %s,
                    last_checkin_date = %s,
                    updated_at = NOW()
                WHERE user_key = %s
                RETURNING xp, total_checkins, current_streak, last_checkin_date
                """,
                (CHECKIN_XP, new_streak, today_iso, key),
            )
            row = cur.fetchone()
        conn.commit()
    finally:
        conn.close()

    next_state = {
        "xp": int(row["xp"]),
        "total_checkins": int(row["total_checkins"]),
        "streak": int(row["current_streak"]),
        "last_checkin_date": row["last_checkin_date"].isoformat()
        if row["last_checkin_date"]
        else None,
    }
    return _to_status(next_state, gained_xp=CHECKIN_XP, message="\ucd9c\uc11d \uc644\ub8cc! \uacbd\ud5d8\uce58\uac00 \uc62c\ub790\uc5b4\uc694.")


@router.post("/cheer-xp", response_model=AttendanceStatus)
def cheer_xp(authorization: str | None = Header(default=None)):
    key = _user_key(authorization)
    _migrate_token_state(authorization, key)
    add_xp(key, CHEER_XP)
    state = _get_state(key)
    return _to_status(state, gained_xp=CHEER_XP, message="\uc751\uc6d0 \uc644\ub8cc! +5XP\ub97c \ubc1b\uc558\uc5b4\uc694.")


_ensure_table()
