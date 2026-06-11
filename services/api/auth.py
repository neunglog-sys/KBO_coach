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

# 구글 로그인 검증용 — Google Cloud Console의 "웹 애플리케이션" OAuth 클라이언트 ID.
# (안드로이드 앱은 이 웹 클라이언트 ID를 serverClientId로 써서 idToken을 발급받음)
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

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


def ensure_user_profile_columns(conn) -> None:
    """Keep older local/dev databases compatible with buddy profile fields."""
    with conn.cursor() as cur:
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS buddy_nickname VARCHAR(10)")


def ensure_social_columns(conn) -> None:
    """소셜 로그인 지원: 비밀번호 없는 계정 허용 + 제공사 식별 컬럼."""
    with conn.cursor() as cur:
        # 소셜 가입은 비밀번호가 없으므로 NOT NULL 제약 해제(이미 해제돼 있어도 안전).
        cur.execute("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS provider VARCHAR(20)")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_id VARCHAR(64)")


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


class GoogleLoginIn(BaseModel):
    id_token: str


class UpdateProfileIn(BaseModel):
    fav_team_code: str | None = None
    nickname: str | None = None


class UpdateGenderIn(BaseModel):
    gender: str   # 'man' | 'girl'


class UpdateBuddyIn(BaseModel):
    gender: str | None = None
    buddy_nickname: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


# ---- 엔드포인트 ----
@router.post("/register")
def register(body: RegisterIn):
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            ensure_user_profile_columns(conn)
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
            ensure_user_profile_columns(conn)
            cur.execute("SELECT user_id, email, nickname, fav_team_code, gender, buddy_nickname, password_hash "
                        "FROM users WHERE email = %s", (body.email,))
            user = cur.fetchone()
        if not user or not verify_pw(body.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 틀렸습니다")
        return {"user": {"user_id": user["user_id"], "email": user["email"],
                         "nickname": user["nickname"], "fav_team_code": user["fav_team_code"],
                         "gender": user["gender"], "buddy_nickname": user["buddy_nickname"]},
                "token": make_token(user["user_id"], user["email"])}
    finally:
        conn.close()


@router.post("/google")
def google_login(body: GoogleLoginIn):
    """구글 idToken 검증 → 이메일로 회원 조회/생성 → 우리 JWT 발급."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="서버에 GOOGLE_CLIENT_ID 미설정")
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
    except ImportError:
        raise HTTPException(status_code=500, detail="서버에 google-auth 미설치")

    try:
        info = google_id_token.verify_oauth2_token(
            body.id_token, google_requests.Request(), GOOGLE_CLIENT_ID)
    except ValueError:
        raise HTTPException(status_code=401, detail="유효하지 않은 구글 토큰")

    email = info.get("email")
    if not email or not info.get("email_verified", False):
        raise HTTPException(status_code=401, detail="구글 이메일 확인 불가")
    provider_id = info.get("sub")
    nickname = (info.get("name") or email.split("@")[0])[:50]

    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            ensure_user_profile_columns(conn)
            ensure_social_columns(conn)
            cur.execute("SELECT user_id, email, nickname, fav_team_code, gender, buddy_nickname "
                        "FROM users WHERE email = %s", (email,))
            user = cur.fetchone()
            if not user:
                # 같은 이메일이 없을 때만 신규 생성(있으면 기존 계정에 그대로 로그인 = 자동 연결).
                cur.execute(
                    """INSERT INTO users (email, password_hash, nickname, fav_team_code, provider, provider_id)
                       VALUES (%s, NULL, %s, NULL, 'google', %s)
                       RETURNING user_id, email, nickname, fav_team_code, gender, buddy_nickname""",
                    (email, nickname, provider_id))
                user = cur.fetchone()
        return {"user": {"user_id": user["user_id"], "email": user["email"],
                         "nickname": user["nickname"], "fav_team_code": user["fav_team_code"],
                         "gender": user["gender"], "buddy_nickname": user["buddy_nickname"]},
                "token": make_token(user["user_id"], user["email"])}
    finally:
        conn.close()


@router.get("/me")
def me(user_id: int = Depends(current_user_id)):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            ensure_user_profile_columns(conn)
            cur.execute("SELECT user_id, email, nickname, fav_team_code, gender, buddy_nickname, created_at "
                        "FROM users WHERE user_id = %s", (user_id,))
            user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="유저 없음")
        return user
    finally:
        conn.close()


@router.patch("/me/gender")
def update_gender(body: UpdateGenderIn, user_id: int = Depends(current_user_id)):
    """캐릭터 성별(man/girl) 저장 — 계정에 묶여 기기 바꿔도 유지."""
    if body.gender not in ("man", "girl"):
        raise HTTPException(status_code=400, detail="gender는 man 또는 girl이어야 합니다")
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            ensure_user_profile_columns(conn)
            cur.execute("UPDATE users SET gender = %s WHERE user_id = %s RETURNING gender",
                        (body.gender, user_id))
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="유저 없음")
        return {"gender": row["gender"]}
    finally:
        conn.close()


@router.patch("/me/buddy")
def update_buddy(body: UpdateBuddyIn, user_id: int = Depends(current_user_id)):
    """Save the baseball buddy profile for the current user."""
    buddy_nickname = body.buddy_nickname.strip()
    if not buddy_nickname:
        raise HTTPException(status_code=400, detail="야구짝꿍 닉네임을 입력해주세요")
    if len(buddy_nickname) > 10:
        raise HTTPException(status_code=400, detail="야구짝꿍 닉네임은 10자 이하로 입력해주세요")
    if body.gender is not None and body.gender not in ("man", "girl"):
        raise HTTPException(status_code=400, detail="gender는 man 또는 girl이어야 합니다")

    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            ensure_user_profile_columns(conn)
            cur.execute(
                """
                UPDATE users
                   SET gender = COALESCE(%s, gender),
                       buddy_nickname = %s
                 WHERE user_id = %s
                 RETURNING user_id, email, nickname, fav_team_code, gender, buddy_nickname, created_at
                """,
                (body.gender, buddy_nickname, user_id),
            )
            user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="유저 없음")
        return user
    finally:
        conn.close()


@router.patch("/me")
def update_profile(body: UpdateProfileIn, user_id: int = Depends(current_user_id)):
    """응원구단(fav_team_code) 변경. 성공 시 갱신된 유저 정보 반환."""
    nickname = body.nickname.strip() if body.nickname is not None else None
    if body.nickname is not None and not nickname:
        raise HTTPException(status_code=400, detail="닉네임을 입력해주세요")
    if nickname is not None and len(nickname) > 50:
        raise HTTPException(status_code=400, detail="닉네임은 50자 이하로 입력해주세요")
    if body.fav_team_code is None and nickname is None:
        raise HTTPException(status_code=400, detail="변경할 정보를 입력해주세요")

    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            ensure_user_profile_columns(conn)
            cur.execute(
                "UPDATE users "
                "SET fav_team_code = COALESCE(%s, fav_team_code), "
                "nickname = COALESCE(%s, nickname) "
                "WHERE user_id = %s "
                "RETURNING user_id, email, nickname, fav_team_code, gender, buddy_nickname, created_at",
                (body.fav_team_code, nickname, user_id))
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
