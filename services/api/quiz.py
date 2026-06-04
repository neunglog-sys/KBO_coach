# -*- coding: utf-8 -*-
"""OX quiz API: three daily questions, excluding yesterday's assigned questions."""
from __future__ import annotations

import datetime

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from attendance import _user_key, add_xp
from db_pg import get_conn

router = APIRouter(prefix="/quiz", tags=["quiz"])

DAILY_LIMIT = 3
XP_MAP = {
    "\uc655\ucd08\ubcf4": 2,
    "\ucd08\ubcf4": 3,
    "\uc911\uae09": 4,
    "\uace0\uae09": 5,
}


def _ensure_table() -> None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS quiz_log (
                    log_id      SERIAL PRIMARY KEY,
                    user_key    TEXT    NOT NULL,
                    quiz_id     INTEGER NOT NULL,
                    asked_date  DATE    NOT NULL,
                    is_correct  BOOLEAN,
                    xp_earned   INTEGER DEFAULT 0,
                    answered_at TIMESTAMP,
                    UNIQUE (user_key, quiz_id, asked_date)
                )
                """
            )
        conn.commit()
    finally:
        conn.close()


class AnswerIn(BaseModel):
    quiz_id: int
    answer: bool


@router.get("/daily")
def get_daily_quiz(authorization: str | None = Header(default=None)):
    key = _user_key(authorization)
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT COUNT(*) AS cnt FROM quiz_log WHERE user_key=%s AND asked_date=%s",
                (key, today),
            )
            asked_count = cur.fetchone()["cnt"]

            needed = DAILY_LIMIT - asked_count
            if needed > 0:
                cur.execute(
                    "SELECT quiz_id FROM quiz_log WHERE user_key=%s AND asked_date IN (%s,%s)",
                    (key, today, yesterday),
                )
                exclude = [row["quiz_id"] for row in cur.fetchall()]

                if exclude:
                    cur.execute(
                        "SELECT quiz_id FROM quiz WHERE quiz_id != ALL(%s) ORDER BY RANDOM() LIMIT %s",
                        (exclude, needed),
                    )
                else:
                    cur.execute("SELECT quiz_id FROM quiz ORDER BY RANDOM() LIMIT %s", (needed,))

                for row in cur.fetchall():
                    cur.execute(
                        """
                        INSERT INTO quiz_log (user_key, quiz_id, asked_date)
                        VALUES (%s,%s,%s)
                        ON CONFLICT DO NOTHING
                        """,
                        (key, row["quiz_id"], today),
                    )
                conn.commit()

            cur.execute(
                """
                SELECT ql.quiz_id, q.question, q.difficulty,
                       ql.is_correct, ql.xp_earned, q.explanation
                FROM quiz_log ql
                JOIN quiz q ON ql.quiz_id = q.quiz_id
                WHERE ql.user_key=%s AND ql.asked_date=%s
                ORDER BY ql.log_id
                LIMIT %s
                """,
                (key, today, DAILY_LIMIT),
            )
            rows = cur.fetchall()

        answered_count = sum(1 for row in rows if row["is_correct"] is not None)
        return {
            "questions": [
                {
                    "quiz_id": row["quiz_id"],
                    "question": row["question"],
                    "difficulty": row["difficulty"],
                }
                for row in rows
            ],
            "results": {
                str(row["quiz_id"]): {
                    "is_correct": row["is_correct"],
                    "xp_earned": row["xp_earned"],
                    "explanation": row["explanation"],
                }
                for row in rows
                if row["is_correct"] is not None
            },
            "answered_count": answered_count,
            "daily_limit": DAILY_LIMIT,
        }
    finally:
        conn.close()


@router.post("/answer")
def submit_answer(body: AnswerIn, authorization: str | None = Header(default=None)):
    key = _user_key(authorization)
    today = datetime.date.today()

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ql.log_id, ql.is_correct, q.answer, q.explanation, q.difficulty
                FROM quiz_log ql
                JOIN quiz q ON ql.quiz_id = q.quiz_id
                WHERE ql.user_key=%s AND ql.quiz_id=%s AND ql.asked_date=%s
                """,
                (key, body.quiz_id, today),
            )
            log = cur.fetchone()

        if not log:
            raise HTTPException(400, "\uc624\ub298 \ucd9c\uc81c\ub41c \ubb38\uc81c\uac00 \uc544\ub2d9\ub2c8\ub2e4.")
        if log["is_correct"] is not None:
            raise HTTPException(400, "\uc774\ubbf8 \ub2f5\ud55c \ubb38\uc81c\uc785\ub2c8\ub2e4.")

        is_correct = body.answer == log["answer"]
        xp_earned = XP_MAP.get(log["difficulty"], 2) if is_correct else 0

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE quiz_log
                SET is_correct=%s, xp_earned=%s, answered_at=NOW()
                WHERE log_id=%s
                """,
                (is_correct, xp_earned, log["log_id"]),
            )
        conn.commit()

        if xp_earned > 0:
            add_xp(key, xp_earned)

        return {
            "correct": is_correct,
            "xp_earned": xp_earned,
            "explanation": log["explanation"],
            "difficulty": log["difficulty"],
        }
    finally:
        conn.close()


_ensure_table()
