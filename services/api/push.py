# -*- coding: utf-8 -*-
"""푸시 토큰 등록/해제 — 클라가 발급받은 FCM 토큰을 백엔드에 저장. JWT 필요."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db_pg import get_conn
from auth import current_user_id

router = APIRouter(prefix="/push", tags=["push"])


class TokenIn(BaseModel):
    token: str
    platform: str | None = None      # web / android / ios


@router.post("/register")
def register_token(body: TokenIn, uid: int = Depends(current_user_id)):
    """기기 FCM 토큰 등록(이미 있으면 소유자 갱신)."""
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """INSERT INTO push_tokens (token, user_id, platform) VALUES (%s, %s, %s)
                   ON CONFLICT (token) DO UPDATE
                     SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform""",
                (body.token, uid, body.platform))
        return {"ok": True}
    finally:
        conn.close()


@router.delete("/register")
def unregister_token(body: TokenIn, uid: int = Depends(current_user_id)):
    """기기 토큰 해제(로그아웃·알림끄기)."""
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("DELETE FROM push_tokens WHERE token = %s AND user_id = %s", (body.token, uid))
        return {"ok": True}
    finally:
        conn.close()
