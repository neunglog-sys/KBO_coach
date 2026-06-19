# -*- coding: utf-8 -*-
"""User-scoped chat question history used by personalized quizzes."""
from __future__ import annotations

import re


_TOPIC_STOPWORDS = {
    "뭐",
    "뭐야",
    "무엇",
    "무엇이야",
    "알려줘",
    "설명해줘",
    "야구",
    "경기",
    "질문",
}
_DEFINITION_QUESTION_RE = re.compile(
    r"^\s*(?P<topic>.+?)(?:이|가|은|는)?\s*"
    r"(?:뭐야|무엇이야|무엇인가|뜻이야|뜻인가|어떤\s*거야|설명해줘|알려줘)"
    r"\s*[?？!.。]*\s*$"
)


def ensure_question_history_table(cur) -> None:
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS user_question_history (
            question_id SERIAL PRIMARY KEY,
            user_key    TEXT NOT NULL,
            question    TEXT NOT NULL,
            main_topic  TEXT,
            answer_text TEXT,
            rag_context TEXT,
            origin      TEXT NOT NULL DEFAULT 'chat',
            asked_at    TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE (user_key, question)
        )
        """
    )
    cur.execute(
        "ALTER TABLE user_question_history ADD COLUMN IF NOT EXISTS answer_text TEXT"
    )
    cur.execute(
        "ALTER TABLE user_question_history ADD COLUMN IF NOT EXISTS rag_context TEXT"
    )
    cur.execute(
        "ALTER TABLE user_question_history ADD COLUMN IF NOT EXISTS origin TEXT"
    )
    cur.execute(
        "ALTER TABLE user_question_history ALTER COLUMN origin SET DEFAULT 'chat'"
    )
    cur.execute(
        """
        UPDATE user_question_history
        SET origin = 'chat'
        WHERE origin IS NULL AND answer_text IS NOT NULL
        """
    )
    cur.execute(
        """
        SELECT question_id, question
        FROM user_question_history
        WHERE main_topic IS NULL
          AND origin = 'chat'
        """
    )
    for row in cur.fetchall():
        topic = extract_main_topic(cur, str(row["question"]))
        if topic:
            cur.execute(
                """
                UPDATE user_question_history
                SET main_topic = %s
                WHERE question_id = %s
                """,
                (topic, row["question_id"]),
            )


def extract_main_topic(cur, question: str) -> str | None:
    """Extract the explicit subject of a user's baseball question."""
    text = " ".join((question or "").split()).strip()
    if not text:
        return None

    cur.execute(
        """
        SELECT term
        FROM glossary
        WHERE %s ILIKE '%%' || term || '%%'
        ORDER BY length(term) DESC
        LIMIT 1
        """,
        (text,),
    )
    row = cur.fetchone()
    if row and row.get("term"):
        return str(row["term"]).strip()

    definition_match = _DEFINITION_QUESTION_RE.match(text)
    if definition_match:
        topic = definition_match.group("topic").strip(" ?？!.。")
        if topic and topic not in _TOPIC_STOPWORDS:
            return topic[:100]

    for token in re.findall(r"[가-힣A-Za-z0-9]{2,30}", text):
        if token not in _TOPIC_STOPWORDS:
            return token[:100]
    return None


def record_question(
    cur,
    user_key: str,
    question: str,
    origin: str = "chat",
) -> str | None:
    text = " ".join((question or "").split()).strip()[:500]
    if not text or not user_key.startswith("user:"):
        return None
    ensure_question_history_table(cur)
    topic = extract_main_topic(cur, text)
    cur.execute(
        """
        INSERT INTO user_question_history (user_key, question, main_topic, origin)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (user_key, question) DO UPDATE SET
            main_topic = EXCLUDED.main_topic,
            origin = EXCLUDED.origin,
            asked_at = NOW()
        """,
        (user_key, text, topic, origin),
    )
    return topic


def record_answer(
    cur,
    user_key: str,
    question: str,
    answer: str,
    rag_context: str | None = None,
) -> None:
    text = " ".join((question or "").split()).strip()[:500]
    answer_text = (answer or "").strip()[:4000]
    if not text or not answer_text or not user_key.startswith("user:"):
        return
    ensure_question_history_table(cur)
    cur.execute(
        """
        UPDATE user_question_history
        SET answer_text = %s, rag_context = %s, origin = 'chat', asked_at = NOW()
        WHERE user_key = %s AND question = %s
        """,
        (answer_text, (rag_context or "").strip()[:12000] or None, user_key, text),
    )


def question_topics(cur, user_key: str, limit: int = 100) -> list[dict]:
    if not user_key.startswith("user:"):
        return []
    ensure_question_history_table(cur)
    cur.execute(
        """
        SELECT question, main_topic, answer_text, rag_context, asked_at
        FROM user_question_history
        WHERE user_key = %s
          AND main_topic IS NOT NULL
          AND origin = 'chat'
        ORDER BY asked_at DESC, question_id DESC
        LIMIT %s
        """,
        (user_key, limit),
    )
    seen: set[str] = set()
    out: list[dict] = []
    for row in cur.fetchall():
        topic = str(row["main_topic"]).strip()
        normalized = re.sub(r"\s+", "", topic).casefold()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        out.append(
            {
                "question": str(row["question"]),
                "main_topic": topic,
                "answer_text": (
                    str(row["answer_text"]) if row.get("answer_text") else None
                ),
                "rag_context": (
                    str(row["rag_context"]) if row.get("rag_context") else None
                ),
            }
        )
    return out


def question_history_count(cur, user_key: str) -> int:
    """Count main-screen chat questions with an extracted topic."""
    if not user_key.startswith("user:"):
        return 0
    ensure_question_history_table(cur)
    cur.execute(
        """
        SELECT COUNT(*) AS cnt
        FROM user_question_history
        WHERE user_key = %s
          AND main_topic IS NOT NULL
          AND origin = 'chat'
        """,
        (user_key,),
    )
    row = cur.fetchone()
    return int(row["cnt"]) if row else 0
