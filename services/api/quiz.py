# -*- coding: utf-8 -*-
"""OX quiz API: five daily questions, excluding yesterday's assigned questions.

개인화 출제(POST /daily): 인증된 사용자의 서버 질문 기록에서 실제로 물어본 주제를 고르고,
저장된 RAG 근거와 답변을 이용해 OX 문항 1개를 생성한다. 생성 문항은 해당 사용자 전용이며
일반 퀴즈 풀이나 다른 계정의 맞춤 문항으로 재사용하지 않는다.
"""
from __future__ import annotations

import datetime
import json
import logging
import re

from fastapi import APIRouter, Header, HTTPException
from jose import JWTError, jwt
from pydantic import BaseModel

import llm
from attendance import add_xp
from auth import JWT_ALG, JWT_SECRET
from db_pg import get_conn
from personalization import (
    ensure_question_history_table,
    question_history_count,
    question_topics,
)

router = APIRouter(prefix="/quiz", tags=["quiz"])
logger = logging.getLogger(__name__)

DAILY_LIMIT = 5
XP_MAP = {
    "\uc655\ucd08\ubcf4": 5,
    "\ucd08\ubcf4": 7,
    "\uc911\uae09": 10,
    "\uace0\uae09": 15,
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
            # LLM 생성 문항의 생성 대상 유저 — 해당 유저에게만 제공하기 위해 저장
            cur.execute("ALTER TABLE quiz ADD COLUMN IF NOT EXISTS created_for_user_key TEXT")
            cur.execute("ALTER TABLE quiz ADD COLUMN IF NOT EXISTS source_question TEXT")
            cur.execute("ALTER TABLE quiz ADD COLUMN IF NOT EXISTS main_topic TEXT")
            ensure_question_history_table(cur)
        conn.commit()
    finally:
        conn.close()


# ── 개인화 출제: 최근 질문 주제 → RAG 근거 → LLM이 OX 1문항 생성 ─────────────────
_ALLOWED_DIFF = {"왕초보", "초보", "중급", "고급"}
_ALLOWED_CAT = {"규칙", "용어", "기록", "관람", "역사"}


def _topic_in_text(topic: str, text: str) -> bool:
    return re.sub(r"\s+", "", topic).casefold() in re.sub(r"\s+", "", text).casefold()


def _authenticated_user_key(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required.")
    token = authorization[7:].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = str(payload["sub"]).strip()
    except (JWTError, KeyError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid authentication token.")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")
    return f"user:{user_id}"


def _custom_decision(
    row: dict,
    user_key: str,
    asked_topics: set[str],
) -> tuple[bool, str]:
    topic = str(row.get("main_topic") or "")
    normalized = re.sub(r"\s+", "", topic).casefold()
    if not user_key.startswith("user:"):
        return False, "no_authenticated_user"
    if not asked_topics:
        return False, "no_question_history"
    if row.get("source") != "llm":
        return False, "general_or_fallback_quiz"
    if row.get("created_for_user_key") != user_key:
        return False, "different_user"
    if not normalized:
        return False, "missing_topic"
    if normalized not in asked_topics:
        return False, "topic_not_asked"
    if not _topic_in_text(topic, str(row.get("question") or "")):
        return False, "topic_not_in_question"
    return True, "user_topic_match"


def _is_personalized(row: dict, user_key: str, asked_topics: set[str]) -> bool:
    return _custom_decision(row, user_key, asked_topics)[0]


def _question_payload(row: dict, user_key: str, asked_topics: set[str]) -> dict:
    is_custom, custom_reason = _custom_decision(row, user_key, asked_topics)
    return {
        "quiz_id": row["quiz_id"],
        "question": row["question"],
        "difficulty": row["difficulty"],
        "source_question": row.get("source_question"),
        "main_topic": row.get("main_topic"),
        "topic": row.get("main_topic"),
        "isCustom": is_custom,
        "customReason": custom_reason,
        # Backward compatibility for already deployed frontend builds.
        "personalized": is_custom,
    }


def _topic_references(
    cur,
    source_question: str,
    main_topic: str,
    source_answer: str | None,
    stored_rag_context: str | None,
) -> list[str]:
    """Only return evidence that explicitly mentions the user's main topic."""
    refs: list[str] = []
    if stored_rag_context:
        related_lines = [
            line.strip()
            for line in stored_rag_context.splitlines()
            if _topic_in_text(main_topic, line)
        ]
        if related_lines:
            refs.append("[저장된 RAG 근거] " + " ".join(related_lines)[:1500])
    if source_answer and _topic_in_text(main_topic, source_answer):
        refs.append(f"[사용자 질문에 대한 챗봇 답변] {source_answer[:1000]}")
    cur.execute(
        "SELECT term, definition FROM glossary WHERE term = %s LIMIT 1",
        (main_topic,),
    )
    term = cur.fetchone()
    if term:
        refs.append(f"[용어] {term['term']}: {term['definition']}")

    cur.execute(
        """
        SELECT topic, content
        FROM rules
        WHERE topic ILIKE %s OR content ILIKE %s
        ORDER BY CASE WHEN topic ILIKE %s THEN 0 ELSE 1 END
        LIMIT 3
        """,
        (f"%{main_topic}%", f"%{main_topic}%", f"%{main_topic}%"),
    )
    for rule in cur.fetchall():
        refs.append(f"[규칙] {rule['topic']}: {rule['content']}")

    # Vector search may return broadly related baseball concepts. Keep a chunk only
    # when the selected topic is explicitly present in its title or content.
    import chat as chat_mod
    _, _, chunks, _ = chat_mod._retrieve(cur, source_question, None)
    for chunk in chunks:
        haystack = f"{chunk.get('title', '')} {chunk.get('content', '')}"
        if _topic_in_text(main_topic, haystack):
            refs.append(f"[자료] {chunk['title']}: {str(chunk['content'])[:300]}")
        if len(refs) >= 5:
            break
    return refs


def _generate_personal_quiz(
    cur,
    source_question: str,
    main_topic: str,
    source_answer: str | None,
    stored_rag_context: str | None,
    user_key: str,
) -> int | None:
    """성공 시 새 quiz_id, 실패/근거부족/중복이면 None (호출부는 정적 풀로 폴백).
    생성된 문항은 created_for_user_key에 해당 유저를 기록해 다른 유저에게 노출되지 않게 한다."""
    source_question = source_question.strip()[:500]
    main_topic = main_topic.strip()[:100]
    if not source_question or not main_topic or not llm.llm_ready():
        return None

    ref = _topic_references(
        cur, source_question, main_topic, source_answer, stored_rag_context
    )
    if not ref:
        return None   # 근거 없으면 출제하지 않음(환각 방지)

    system = (
        "너는 야구 초보용 OX 퀴즈 출제자다. 반드시 사용자의 원 질문에서 정한 "
        "핵심 주제만 다루고, 제공된 참고자료로 정오를 검증할 수 있는 사실만 출제한다. "
        "연관된 다른 야구 용어를 독립적인 퀴즈 주제로 바꾸면 안 된다."
    )
    user = (
        f"사용자의 원 질문: {source_question}\n"
        f"반드시 유지할 핵심 주제: {main_topic}\n"
        "\n\n참고자료:\n" + "\n".join(ref) +
        f"\n\n'{main_topic}' 자체의 의미, 사용 상황, 규칙 또는 직접적인 예시로만 "
        "OX 퀴즈 1문제를 만들어라.\n"
        f"문제 문장에는 핵심 주제 단어 '{main_topic}'를 반드시 그대로 포함하라. "
        "참고자료에 도루·주자·수비·공격 같은 연관 표현이 있어도 "
        f"'{main_topic}'이 아닌 개념을 문제의 주제로 삼지 마라.\n"
        "조건: 참고자료로 검증 가능한 단일 사실 / 질문은 한 문장(120자 이내) / "
        "특정 개인·사용자·최신 경기결과 언급 금지 / 정답이 O 또는 X로 명확할 것.\n"
        'JSON만 출력: {"question": "...", "answer": true, "explanation": "...", '
        '"difficulty": "왕초보|초보|중급", "category": "규칙|용어|기록|관람|역사"}'
    )
    for _ in range(2):
        try:
            raw = llm.generate(system, user, temperature=0.2, max_tokens=300)
            raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw.strip())
            q = json.loads(raw)
            question = str(q["question"]).strip()
            answer = bool(q["answer"])
            explanation = str(q.get("explanation", "")).strip()[:300]
            difficulty = q.get("difficulty") if q.get("difficulty") in _ALLOWED_DIFF else "초보"
            category = q.get("category") if q.get("category") in _ALLOWED_CAT else "용어"
            if not (10 <= len(question) <= 120):
                continue
            if not _topic_in_text(main_topic, question):
                continue
            cur.execute(
                """
                SELECT quiz_id, source, created_for_user_key, main_topic
                FROM quiz
                WHERE REPLACE(question,' ','') = %s
                LIMIT 1
                """,
                (re.sub(r"\s+", "", question),),
            )
            existing = cur.fetchone()
            if existing:
                if (
                    existing.get("source") == "llm"
                    and existing.get("created_for_user_key") == user_key
                    and existing.get("main_topic") == main_topic
                ):
                    return existing["quiz_id"]
                continue
            cur.execute(
                """
                INSERT INTO quiz (
                    question, answer, explanation, difficulty, category, source,
                    created_for_user_key, source_question, main_topic
                )
                VALUES (%s,%s,%s,%s,%s,'llm',%s,%s,%s)
                RETURNING quiz_id
                """,
                (
                    question, answer, explanation, difficulty, category,
                    user_key, source_question, main_topic,
                ),
            )
            return cur.fetchone()["quiz_id"]
        except Exception:
            continue
    return None   # 생성 실패는 비치명 — 정적 풀로 폴백


class AnswerIn(BaseModel):
    quiz_id: int
    answer: bool


def _daily(key: str):
    today = datetime.date.today()
    yesterday = today - datetime.timedelta(days=1)

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            topic_records = question_topics(cur, key)
            history_count = question_history_count(cur, key)
            asked_topics = {
                re.sub(r"\s+", "", item["main_topic"]).casefold()
                for item in topic_records
            }

            # Repair older user-owned generated quizzes that predate main_topic.
            for topic_record in topic_records:
                topic = topic_record["main_topic"]
                compact_topic = re.sub(r"\s+", "", topic)
                cur.execute(
                    """
                    UPDATE quiz
                    SET main_topic = %s
                    WHERE source = 'llm'
                      AND created_for_user_key = %s
                      AND main_topic IS NULL
                      AND (
                          REPLACE(question, ' ', '') ILIKE %s
                          OR REPLACE(COALESCE(source_question, ''), ' ', '') ILIKE %s
                      )
                    """,
                    (topic, key, f"%{compact_topic}%", f"%{compact_topic}%"),
                )

            # Revalidate today's unanswered LLM assignments against this account's
            # actual question topics. Invalid legacy/global assignments are removed.
            cur.execute(
                """
                SELECT ql.log_id, ql.is_correct, q.question, q.source,
                       q.created_for_user_key, q.main_topic
                FROM quiz_log ql
                JOIN quiz q ON q.quiz_id = ql.quiz_id
                WHERE ql.user_key = %s AND ql.asked_date = %s AND q.source = 'llm'
                """,
                (key, today),
            )
            for assigned in cur.fetchall():
                valid = _is_personalized(assigned, key, asked_topics)
                if not valid and assigned["is_correct"] is None:
                    cur.execute(
                        "DELETE FROM quiz_log WHERE log_id = %s",
                        (assigned["log_id"],),
                    )

            # Free one unanswered general slot for every asked topic that is not yet
            # represented today, up to the five-question daily limit.
            for topic_record in topic_records[:DAILY_LIMIT]:
                target_topic = topic_record["main_topic"]
                cur.execute(
                    """
                    SELECT 1
                    FROM quiz_log ql
                    JOIN quiz q ON q.quiz_id = ql.quiz_id
                    WHERE ql.user_key = %s
                      AND ql.asked_date = %s
                      AND q.source = 'llm'
                      AND q.created_for_user_key = %s
                      AND q.main_topic = %s
                    LIMIT 1
                    """,
                    (key, today, key, target_topic),
                )
                if not cur.fetchone():
                    cur.execute(
                        """
                        DELETE FROM quiz_log
                        WHERE log_id = (
                            SELECT ql.log_id
                            FROM quiz_log ql
                            JOIN quiz q ON q.quiz_id = ql.quiz_id
                            WHERE ql.user_key = %s
                              AND ql.asked_date = %s
                              AND ql.is_correct IS NULL
                              AND COALESCE(q.source, 'manual') != 'llm'
                            ORDER BY ql.log_id DESC
                            LIMIT 1
                        )
                        """,
                        (key, today),
                    )

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

                # Generate one personalized question for each distinct topic this
                # account actually asked about, newest topics first.
                cur.execute(
                    """
                    SELECT q.question, q.source, q.created_for_user_key, q.main_topic
                    FROM quiz_log ql
                    JOIN quiz q ON q.quiz_id = ql.quiz_id
                    WHERE ql.user_key = %s
                      AND ql.asked_date = %s
                      AND q.source = 'llm'
                      AND q.created_for_user_key = %s
                    """,
                    (key, today, key),
                )
                existing_personal_topics = {
                    re.sub(r"\s+", "", str(row.get("main_topic") or "")).casefold()
                    for row in cur.fetchall()
                    if _is_personalized(row, key, asked_topics)
                }
                for personal_source in topic_records:
                    if needed <= 0:
                        break
                    source_topic = re.sub(
                        r"\s+", "", personal_source["main_topic"]
                    ).casefold()
                    if source_topic in existing_personal_topics:
                        continue
                    pid = _generate_personal_quiz(
                        cur,
                        personal_source["question"],
                        personal_source["main_topic"],
                        personal_source.get("answer_text"),
                        personal_source.get("rag_context"),
                        key,
                    )
                    if pid is not None and pid not in exclude:
                        cur.execute(
                            """INSERT INTO quiz_log (user_key, quiz_id, asked_date)
                               VALUES (%s,%s,%s) ON CONFLICT DO NOTHING""",
                            (key, pid, today),
                        )
                        exclude.append(pid)
                        needed -= 1
                        existing_personal_topics.add(source_topic)

                if needed > 0:
                    # 빈자리는 사전 제작 문항으로만 채운다. 과거 LLM 맞춤 문항을
                    # 재사용하면 사용자의 현재 질문과 다른 주제가 다시 노출될 수 있다.
                    if exclude:
                        cur.execute(
                            """SELECT quiz_id FROM quiz
                               WHERE quiz_id != ALL(%s)
                               AND COALESCE(source, 'manual') != 'llm'
                               ORDER BY RANDOM() LIMIT %s""",
                            (exclude, needed),
                        )
                    else:
                        cur.execute(
                            """SELECT quiz_id FROM quiz
                               WHERE COALESCE(source, 'manual') != 'llm'
                               ORDER BY RANDOM() LIMIT %s""",
                            (needed,),
                        )
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
                SELECT ql.quiz_id, q.question, q.difficulty, q.source, q.created_for_user_key,
                       q.source_question, q.main_topic,
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
            conn.commit()

        answered_count = sum(1 for row in rows if row["is_correct"] is not None)
        questions = [
            _question_payload(row, key, asked_topics)
            for row in rows
        ]
        user_id = key.removeprefix("user:")
        logger.info(
            "quiz_personalization current_user_id=%s question_history_count=%s "
            "user_asked_topics=%s quizzes=%s",
            user_id,
            history_count,
            [item["main_topic"] for item in topic_records],
            [
                {
                    "quiz_id": item["quiz_id"],
                    "topic": item["topic"],
                    "isCustom": item["isCustom"],
                    "customReason": item["customReason"],
                }
                for item in questions
            ],
        )
        return {
            "questions": questions,
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
            "current_user_id": user_id,
            "question_history_count": history_count,
            "question_history": [
                {
                    "question": item["question"],
                    "mainTopic": item["main_topic"],
                }
                for item in topic_records
            ],
            "user_asked_topics": [item["main_topic"] for item in topic_records],
        }
    finally:
        conn.close()


@router.get("/daily")
def get_daily_quiz(authorization: str | None = Header(default=None)):
    return _daily(_authenticated_user_key(authorization))


class DailyIn(BaseModel):
    pass


@router.post("/daily")
def post_daily_quiz(body: DailyIn, authorization: str | None = Header(default=None)):
    """최신 사용자 질문의 명시적 핵심 주제로만 개인화 문항 1개를 생성."""
    return _daily(_authenticated_user_key(authorization))


@router.post("/answer")
def submit_answer(body: AnswerIn, authorization: str | None = Header(default=None)):
    key = _authenticated_user_key(authorization)
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
