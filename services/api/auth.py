# -*- coding: utf-8 -*-
"""회원가입 / 로그인 / 내 정보 — PostgreSQL users 테이블 + bcrypt + JWT."""
import os
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel, EmailStr

from db_pg import get_conn

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
TOKEN_HOURS = 24 * 7

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")
router = APIRouter(prefix="/auth", tags=["auth"])


# ---- 비번 해시 (bcrypt 직접 사용) ----
def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    return bcrypt.checkpw(pw.encode(), hashed.encode())


def make_token(user_id: int, email: str) -> str:
    payload = {"sub": str(user_id), "email": email,
               "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def current_user_id(token: str = Depends(oauth2)) -> int:
    """JWT 검증 후 user_id 반환 (보호 엔드포인트용)."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰")


# ---- 요청 모델 ----
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    nickname: str
    fav_team_code: str | None = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UpdateFavTeamIn(BaseModel):
    fav_team_code: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


# ---- 엔드포인트 ----
@router.post("/register")
def register(body: RegisterIn):
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT 1 FROM users WHERE email = %s", (body.email,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="이미 가입된 이메일")
            cur.execute(
                """INSERT INTO users (email, password_hash, nickname, fav_team_code)
                   VALUES (%s, %s, %s, %s)
                   RETURNING user_id, email, nickname, fav_team_code, created_at""",
                (body.email, hash_pw(body.password), body.nickname, body.fav_team_code))
            user = cur.fetchone()
        return {"user": user, "token": make_token(user["user_id"], user["email"])}
    finally:
        conn.close()


@router.post("/login")
def login(body: LoginIn):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, email, nickname, fav_team_code, password_hash "
                        "FROM users WHERE email = %s", (body.email,))
            user = cur.fetchone()
        if not user or not verify_pw(body.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 틀렸습니다")
        return {"user": {"user_id": user["user_id"], "email": user["email"],
                         "nickname": user["nickname"], "fav_team_code": user["fav_team_code"]},
                "token": make_token(user["user_id"], user["email"])}
    finally:
        conn.close()


@router.get("/me")
def me(user_id: int = Depends(current_user_id)):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT user_id, email, nickname, fav_team_code, created_at FROM users WHERE user_id = %s",
                        (user_id,))
            user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="유저 없음")
        return user
    finally:
        conn.close()


@router.patch("/me")
def update_fav_team(body: UpdateFavTeamIn, user_id: int = Depends(current_user_id)):
    """응원구단(fav_team_code) 변경. 성공 시 갱신된 유저 정보 반환."""
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET fav_team_code = %s WHERE user_id = %s "
                "RETURNING user_id, email, nickname, fav_team_code, created_at",
                (body.fav_team_code, user_id))
            user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="유저 없음")
        return user
    finally:
        conn.close()


@router.patch("/me/password")
def change_password(body: ChangePasswordIn, user_id: int = Depends(current_user_id)):
    """현재 비밀번호 검증 후 새 비밀번호로 변경."""
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="새 비밀번호는 6자 이상이어야 합니다")

    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT password_hash FROM users WHERE user_id = %s", (user_id,))
            user = cur.fetchone()
            if not user:
                raise HTTPException(status_code=404, detail="유저 없음")
            if not verify_pw(body.current_password, user["password_hash"]):
                raise HTTPException(status_code=401, detail="현재 비밀번호가 틀렸습니다")

            cur.execute(
                "UPDATE users SET password_hash = %s WHERE user_id = %s",
                (hash_pw(body.new_password), user_id),
            )
        return {"ok": True}
    finally:
        conn.close()


@router.delete("/me")
def delete_me(user_id: int = Depends(current_user_id)):
    """현재 로그인 유저 삭제. FK가 설정된 관련 데이터는 DB cascade 정책을 따른다."""
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE user_id = %s RETURNING user_id", (user_id,))
            deleted = cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="유저 없음")
        return {"ok": True}
    finally:
        conn.close()


@router.post("/logout")
def logout(_: int = Depends(current_user_id)):
    """JWT는 서버 저장 세션이 아니므로 클라이언트 저장 토큰 삭제로 로그아웃한다."""
    return {"ok": True}
