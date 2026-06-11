# -*- coding: utf-8 -*-
"""Personal baseball attendance records with one of three mood stamps."""
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, constr

from auth import current_user_id
from db_pg import get_conn

router = APIRouter(prefix="/my-records", tags=["my-records"])

Mood = Literal["win_happy", "draw_calm", "loss_sad"]

MOOD_STAMPS = {
    "win_happy": {"label": "win_happy", "text": "이겨서 기분 좋음", "emoji": "😆"},
    "draw_calm": {"label": "draw_calm", "text": "무승부라 덤덤", "emoji": "😐"},
    "loss_sad": {"label": "loss_sad", "text": "져서 슬픔", "emoji": "😢"},
}


class MyRecordIn(BaseModel):
    record_date: date
    mood: Mood | None = None   # 예정 경기·결과 미입력은 mood 없이 저장 가능
    game_id: str | None = None
    team_code: str | None = None
    stadium: str | None = None
    memo: constr(strip_whitespace=True, max_length=500) | None = None


def _with_mood_stamp(row: dict) -> dict:
    # mood가 없으면(예정 경기 등) 스탬프도 None
    row["mood_stamp"] = MOOD_STAMPS.get(row["mood"]) if row.get("mood") else None
    return row


@router.get("/moods")
def get_moods():
    """Return the three available mood stamps for the frontend."""
    return {"moods": list(MOOD_STAMPS.values())}


@router.post("")
def create_my_record(body: MyRecordIn, uid: int = Depends(current_user_id)):
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """INSERT INTO my_baseball_records
                   (user_id, record_date, game_id, team_code, stadium, mood, memo)
                   VALUES (%s, %s, %s, %s, %s, %s, %s)
                   RETURNING record_id, user_id, record_date, game_id, team_code,
                             stadium, mood, memo, created_at""",
                (
                    uid,
                    body.record_date,
                    body.game_id,
                    body.team_code,
                    body.stadium,
                    body.mood,
                    body.memo,
                ),
            )
            row = cur.fetchone()
        return _with_mood_stamp(row)
    finally:
        conn.close()


@router.get("")
def get_my_records(
    mood: Mood | None = None,
    limit: int = Query(50, ge=1, le=100),
    uid: int = Depends(current_user_id),
):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            if mood:
                cur.execute(
                    """SELECT record_id, user_id, record_date, game_id, team_code,
                              stadium, mood, memo, created_at
                       FROM my_baseball_records
                       WHERE user_id = %s AND mood = %s
                       ORDER BY record_date DESC, record_id DESC
                       LIMIT %s""",
                    (uid, mood, limit),
                )
            else:
                cur.execute(
                    """SELECT record_id, user_id, record_date, game_id, team_code,
                              stadium, mood, memo, created_at
                       FROM my_baseball_records
                       WHERE user_id = %s
                       ORDER BY record_date DESC, record_id DESC
                       LIMIT %s""",
                    (uid, limit),
                )
            rows = [_with_mood_stamp(r) for r in cur.fetchall()]
        return {"count": len(rows), "records": rows}
    finally:
        conn.close()


@router.get("/stats")
def get_my_record_stats(uid: int = Depends(current_user_id)):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS total FROM my_baseball_records WHERE user_id = %s",
                (uid,),
            )
            total = cur.fetchone()["total"]
            cur.execute(
                """SELECT mood, COUNT(*) AS count
                   FROM my_baseball_records
                   WHERE user_id = %s
                   GROUP BY mood""",
                (uid,),
            )
            by_mood = {
                r["mood"]: {"count": r["count"], "stamp": MOOD_STAMPS.get(r["mood"])}
                for r in cur.fetchall()
            }
        return {"total_records": total, "by_mood": by_mood}
    finally:
        conn.close()


@router.delete("/{record_id}")
def delete_my_record(record_id: int, uid: int = Depends(current_user_id)):
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """DELETE FROM my_baseball_records
                   WHERE record_id = %s AND user_id = %s
                   RETURNING record_id""",
                (record_id, uid),
            )
            deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="record not found")
        return {"ok": True, "record_id": record_id}
    finally:
        conn.close()
