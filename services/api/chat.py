# -*- coding: utf-8 -*-
"""
챗봇 — POST /chat (RAG + 페르소나).

★ 현재 스켈레톤: 페르소나·용어 검색(가능한 부분)까지 구현, 실제 LLM 호출은 TODO.
   완성하려면: (1) .env에 LLM_API_KEY  (2) knowledge_chunks 임베딩(pgvector) RAG
"""
import os
from fastapi import APIRouter
from pydantic import BaseModel

from db_pg import get_conn

router = APIRouter(tags=["chat"])


class ChatIn(BaseModel):
    question: str
    team_code: str | None = None      # 어떤 구단 페르소나로 답할지
    session_id: str | None = None


@router.post("/chat")
def chat(body: ChatIn):
    persona, glossary_hits = None, []
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # 1) 페르소나 로드
            if body.team_code:
                cur.execute("SELECT * FROM team_personas WHERE team_code = %s", (body.team_code,))
                persona = cur.fetchone()
            # 2) 질문에 포함된 용어 매칭 (간단 RAG 자리 — 나중에 벡터검색으로 교체)
            cur.execute("SELECT term, abbr, definition FROM glossary "
                        "WHERE %s ILIKE '%%' || term || '%%' LIMIT 5", (body.question,))
            glossary_hits = cur.fetchall()
    finally:
        conn.close()

    context = {"persona": persona, "glossary_hits": glossary_hits}

    # 3) LLM 호출 (TODO)
    if not os.environ.get("LLM_API_KEY"):
        return {
            "answer": "(아직 LLM 미연결) 페르소나·용어 검색까지는 동작합니다.",
            "context": context,
            "todo": "LLM_API_KEY 설정 + knowledge_chunks 임베딩(pgvector) RAG 추가 필요",
        }

    # --- 실제 LLM 호출 자리 ---
    # system = 페르소나(말투·성격) + 안전규칙(모르면 모른다/야구무관 거절)
    # user   = body.question + context(용어·기록 검색 결과)
    # answer = call_llm(system, user)
    return {"answer": "...", "context": context}
