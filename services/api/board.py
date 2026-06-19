# -*- coding: utf-8 -*-
"""익명 한줄 채팅 게시판("면회실") — 팀별 방, 폴링 방식. JWT 필요.

흐름:
  - 입장/초기로드:  GET /board/{team_code}/messages           → 최근 50개
  - 폴링(새 글):    GET /board/{team_code}/messages?after=<마지막 message_id>
  - 작성:           POST /board/{team_code}/messages  {content}
닉네임은 user_id로 결정적 생성(같은 유저 = 같은 익명명), 글에는 user_id 노출 안 함.
"""
import hashlib
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, constr

from db_pg import get_conn
from auth import current_user_id

router = APIRouter(prefix="/board", tags=["board"])

# 방(구단) 10개 — 잘못된 team_code 차단
VALID_TEAMS = {"LG", "OB", "HT", "SS", "NC", "KT", "SK", "WO", "HH", "LT"}

# 상단 고정 운영공지 (이미지의 안내문)
NOTICE = (
    "선수를 향한 과도한 비방·욕설은 금지됩니다.\n"
    "서로를 존중하는 응원 문화를 만들어요 🙏"
)

# 익명 닉네임 생성용 단어 풀
_ADJ = ["9회말", "대투수", "불꽃", "오늘만산다", "해탈한", "꾸준한",
        "열혈", "찐", "구석자리", "치맥", "직관", "뼈"]
_NOUN = ["직관러", "함성", "응원단", "불펜지기", "파울볼",
         "연승요정", "대포", "수호신", "외야석", "뱃사공"]


def make_nickname(user_id: int) -> str:
    """user_id로 결정적 익명 닉네임 생성 — 같은 유저는 항상 같은 이름."""
    h = int(hashlib.md5(str(user_id).encode()).hexdigest(), 16)
    adj = _ADJ[h % len(_ADJ)]
    noun = _NOUN[(h // len(_ADJ)) % len(_NOUN)]
    return f"{adj}{noun}#{h % 9000 + 1000}"


def _check_room(team_code: str) -> str:
    code = team_code.upper()
    if code not in VALID_TEAMS:
        raise HTTPException(status_code=404, detail="없는 방(team_code)")
    return code


class MessageIn(BaseModel):
    content: constr(strip_whitespace=True, min_length=1, max_length=200)


@router.get("/{team_code}")
def room_info(team_code: str):
    """방 정보 + 운영공지."""
    code = _check_room(team_code)
    return {"team_code": code, "notice": NOTICE}


@router.get("/{team_code}/messages")
def get_messages(team_code: str, after: int = 0, uid: int = Depends(current_user_id)):
    """방 메시지 조회. after>0이면 그 이후(신규)만, 아니면 최근 50개."""
    code = _check_room(team_code)
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            if after > 0:  # 폴링: 마지막 본 id 이후만
                cur.execute(
                    """SELECT message_id, nickname, content, created_at, user_id
                       FROM board_messages
                       WHERE team_code = %s AND message_id > %s
                       ORDER BY message_id ASC LIMIT 100""",
                    (code, after))
                rows = cur.fetchall()
            else:          # 초기 로드: 최근 50개 → 오래된 순으로 뒤집어 반환
                cur.execute(
                    """SELECT message_id, nickname, content, created_at, user_id
                       FROM board_messages
                       WHERE team_code = %s
                       ORDER BY message_id DESC LIMIT 50""",
                    (code,))
                rows = cur.fetchall()[::-1]
        for r in rows:                       # user_id는 is_mine 판정에만 쓰고 응답에서 제거
            r["is_mine"] = (r.pop("user_id") == uid)
        return {"team_code": code, "count": len(rows), "messages": rows}
    finally:
        conn.close()


@router.post("/{team_code}/messages")
def post_message(team_code: str, body: MessageIn, uid: int = Depends(current_user_id)):
    """한 줄 메시지 작성 (익명)."""
    code = _check_room(team_code)
    conn = get_conn()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                """INSERT INTO board_messages (team_code, user_id, nickname, content)
                   VALUES (%s, %s, %s, %s)
                   RETURNING message_id, nickname, content, created_at""",
                (code, uid, make_nickname(uid), body.content))
            row = cur.fetchone()
        row["is_mine"] = True
        return row
    finally:
        conn.close()
