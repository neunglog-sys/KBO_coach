# -*- coding: utf-8 -*-
"""관람기록·즐겨찾기 (PostgreSQL, JWT 필요). 유저별 데이터."""
from datetime import date
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db_pg import get_conn
from auth import current_user_id

router = APIRouter(tags=["me"])


class VisitIn(BaseModel):
    visit_date: date
    game_id: str | None = None
    team_code: str | None = None
    stadium: str | None = None
    memo: str | None = None


class FavIn(BaseModel):
    team_code: str


@router.post("/visits")
def add_visit(body: VisitIn, uid: int = Depends(current_user_id)):
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """INSERT INTO visits (user_id, visit_date, game_id, team_code, stadium, memo)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
                (uid, body.visit_date, body.game_id, body.team_code, body.stadium, body.memo))
            return cur.fetchone()
    finally:
        conn.close()


@router.get("/visits")
def my_visits(uid: int = Depends(current_user_id)):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM visits WHERE user_id = %s ORDER BY visit_date DESC", (uid,))
            rows = cur.fetchall()
        return {"count": len(rows), "visits": rows}
    finally:
        conn.close()


@router.get("/visits/stats")
def visit_stats(uid: int = Depends(current_user_id)):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM visits WHERE user_id = %s", (uid,))
            total = cur.fetchone()["total"]
            cur.execute("""SELECT team_code, COUNT(*) AS cnt FROM visits
                           WHERE user_id = %s AND team_code IS NOT NULL
                           GROUP BY team_code ORDER BY cnt DESC""", (uid,))
            by_team = cur.fetchall()
        return {"total_visits": total, "by_team": by_team}
    finally:
        conn.close()


@router.get("/recommendations")
def recommendations(uid: int = Depends(current_user_id)):
    """관람기록 기반 추천 (간단: 가장 자주 본 팀)."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""SELECT team_code, COUNT(*) AS cnt FROM visits
                           WHERE user_id = %s AND team_code IS NOT NULL
                           GROUP BY team_code ORDER BY cnt DESC LIMIT 3""", (uid,))
            top = cur.fetchall()
    finally:
        conn.close()
    if not top:
        return {"message": "관람 기록이 쌓이면 추천해드릴게요", "top_teams": []}
    return {"top_teams": top, "message": f"{top[0]['team_code']} 경기를 가장 많이 보셨어요"}


@router.post("/favorites")
def add_favorite(body: FavIn, uid: int = Depends(current_user_id)):
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("INSERT INTO favorites (user_id, team_code) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                        (uid, body.team_code))
        return {"ok": True, "team_code": body.team_code}
    finally:
        conn.close()


@router.get("/favorites")
def my_favorites(uid: int = Depends(current_user_id)):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT team_code FROM favorites WHERE user_id = %s", (uid,))
            rows = cur.fetchall()
        return {"favorites": [r["team_code"] for r in rows]}
    finally:
        conn.close()
