# -*- coding: utf-8 -*-
"""OX quiz API: three daily questions, excluding yesterday's assigned questions.

개인화 출제(POST /daily): 앱이 로컬 SQLite에서 꺼낸 '사용자의 최근 챗봇 질문'을 보내면,
그 주제로 RAG(용어집·규칙·지식청크) 근거 OX 문항 1개를 LLM이 생성해 오늘 3문제에 섞는다.
질문 이력은 일시 사용만 하고 서버에 저장하지 않음(personal_context와 동일 원칙).
생성 문항은 quiz 테이블(source='llm')에 들어가 공용 풀도 함께 성장한다.
"""
from __future__ import annotations

import datetime
import json
import re

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

import llm
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
            # 출제 소스 구분: manual=사전 제작, llm=개인화 생성(질문 이력 기반)
            cur.execute("ALTER TABLE quiz ADD COLUMN IF NOT EXISTS source VARCHAR(10) DEFAULT 'manual'")
        conn.commit()
    finally:
        conn.close()


# ── 개인화 출제: 최근 질문 주제 → RAG 근거 → LLM이 OX 1문항 생성 ─────────────────
_ALLOWED_DIFF = {"왕초보", "초보", "중급", "고급"}
_ALLOWED_CAT = {"규칙", "용어", "기록", "관람", "역사"}


def _generate_personal_quiz(cur, recent_questions: list[str]) -> int | None:
    """성공 시 새 quiz_id, 실패/근거부족/중복이면 None (호출부는 정적 풀로 폴백)."""
    topics = [q.strip()[:80] for q in recent_questions if q and q.strip()][:5]
    if not topics or not llm.llm_ready():
        return None

    # RAG: 챗과 동일한 검색 재사용(용어집 키워드 + 규칙 + 벡터 청크 + 구단팩트)
    import chat as chat_mod
    terms, rules, chunks, facts = chat_mod._retrieve(cur, " / ".join(topics), None)
    ref = []
    for t in terms[:5]:
        ref.append(f"[용어] {t['term']}: {t['definition']}")
    for r in rules[:3]:
        ref.append(f"[규칙] {r['topic']}: {r['content']}")
    for ch in chunks[:2]:
        ref.append(f"[자료] {ch['title']}: {str(ch['content'])[:200]}")
    for f in facts[:2]:
        ref.append(f"[구단] {f['name']}: 창단 {f['founded_year']}년, 한국시리즈 우승 {f['championships']}회")
    if not ref:
        return None   # 근거 없으면 출제하지 않음(환각 방지)

    system = ("너는 야구 초보용 OX 퀴즈 출제자다. 반드시 제공된 참고자료로 정오를 "
              "검증할 수 있는 사실만으로 출제한다.")
    user = (
        "사용자가 최근 야구 챗봇에 물어본 질문들:\n- " + "\n- ".join(topics) +
        "\n\n참고자료:\n" + "\n".join(ref) +
        "\n\n위 질문 주제 중 하나를 골라 OX 퀴즈 1문제를 만들어라.\n"
        "조건: 참고자료로 검증 가능한 단일 사실 / 질문은 한 문장(120자 이내) / "
        "특정 개인·사용자·최신 경기결과 언급 금지 / 정답이 O 또는 X로 명확할 것.\n"
        'JSON만 출력: {"question": "...", "answer": true, "explanation": "...", '
        '"difficulty": "왕초보|초보|중급", "category": "규칙|용어|기록|관람|역사"}'
    )
    try:
        raw = llm.generate(system, user, temperature=0.4, max_tokens=300)
        raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip())
        q = json.loads(raw)
        question = str(q["question"]).strip()
        answer = bool(q["answer"])
        explanation = str(q.get("explanation", "")).strip()[:300]
        difficulty = q.get("difficulty") if q.get("difficulty") in _ALLOWED_DIFF else "초보"
        category = q.get("category") if q.get("category") in _ALLOWED_CAT else "용어"
        if not (10 <= len(question) <= 120):
            return None
        # 중복 방지(공백 무시 동일 문항 존재 시 스킵)
        cur.execute("SELECT 1 FROM quiz WHERE REPLACE(question,' ','') = %s LIMIT 1",
                    (re.sub(r"\s+", "", question),))
        if cur.fetchone():
            return None
        cur.execute(
            """INSERT INTO quiz (question, answer, explanation, difficulty, category, source)
               VALUES (%s,%s,%s,%s,%s,'llm') RETURNING quiz_id""",
            (question, answer, explanation, difficulty, category))
        return cur.fetchone()["quiz_id"]
    except Exception:
        return None   # 생성 실패는 비치명 — 정적 풀로 폴백


class AnswerIn(BaseModel):
    quiz_id: int
    answer: bool


def _daily(key: str, recent_questions: list[str] | None = None):
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

                # 개인화 1문항: 최근 질문 이력이 오면 그 주제로 생성해 오늘 문제에 포함
                if recent_questions:
                    pid = _generate_personal_quiz(cur, recent_questions)
                    if pid is not None:
                        cur.execute(
                            """INSERT INTO quiz_log (user_key, quiz_id, asked_date)
                               VALUES (%s,%s,%s) ON CONFLICT DO NOTHING""",
                            (key, pid, today),
                        )
                        exclude.append(pid)
                        needed -= 1

                if needed > 0:
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
                SELECT ql.quiz_id, q.question, q.difficulty, q.source,
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
                    "personalized": row.get("source") == "llm",
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


@router.get("/daily")
def get_daily_quiz(authorization: str | None = Header(default=None)):
    return _daily(_user_key(authorization))


class DailyIn(BaseModel):
    recent_questions: list[str] | None = None   # 앱이 로컬 SQLite에서 꺼낸 최근 챗 질문(일시 사용, 미저장)


@router.post("/daily")
def post_daily_quiz(body: DailyIn, authorization: str | None = Header(default=None)):
    """개인화 출제 — recent_questions가 있으면 오늘 3문제 중 1문제를 그 주제(RAG 근거)로 생성."""
    return _daily(_user_key(authorization), body.recent_questions)


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
