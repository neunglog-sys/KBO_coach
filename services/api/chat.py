# -*- coding: utf-8 -*-
"""
챗봇 — POST /chat (페르소나 + 간단 RAG + Gemini).

흐름:
  1) team_code로 구단 페르소나 로드 → 시스템 프롬프트 구성(말투·성격·금지사항)
  2) 질문에서 용어(glossary)·규칙(rules) 매칭 → 참고자료로 첨부 (환각 방지)
  3) Gemini 호출 → 답변

설정: .env에 GEMINI_API_KEY (선택: GEMINI_MODEL, 기본 gemini-2.0-flash)
다음 단계: knowledge_chunks 임베딩(pgvector) 벡터검색으로 RAG 고도화.
"""
import os
import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db_pg import get_conn

router = APIRouter(tags=["chat"])

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


class ChatIn(BaseModel):
    question: str
    team_code: str | None = None      # 어떤 구단 페르소나로 답할지
    session_id: str | None = None


def _build_system_prompt(persona: dict | None) -> str:
    base_rules = (
        "\n[공통 규칙]\n"
        "- 야구를 처음 보는 사람도 이해하도록 쉽고 친근하게 설명한다.\n"
        "- 모르는 것은 모른다고 말하고, 사실을 지어내지 않는다.\n"
        "- 야구와 무관한 질문은 정중히 거절한다.\n"
        "- 아래 [참고자료]가 주어지면 그 내용을 우선해서 답한다.\n"
    )
    if not persona:
        return ("너는 KBO 야구 초보 관람객을 돕는 친절한 야구 도우미야." + base_rules)
    p = persona
    prohibited = " / ".join(filter(None, [
        p.get("prohibited_user_response"), p.get("prohibited_information"),
        p.get("prohibited_team_fandom"), p.get("prohibited_expression"),
        p.get("prohibited_character_maintenance"), p.get("prohibited_safety_ethics"),
    ]))
    return (
        f"너는 '{p.get('team_name')}'의 캐릭터야.\n"
        f"[정체성] {p.get('definition')}\n"
        f"[성격 키워드] {p.get('personality_keywords')}\n"
        f"[성격] {p.get('personality_core')}\n"
        f"[말투] {p.get('speaking_features')}\n"
        f"[자주 쓰는 말] {p.get('common_phrases')}\n"
        f"[답변 방식] {p.get('response_style')}\n"
        f"[금지 사항] {prohibited}\n"
        + base_rules
    )


def _retrieve(cur, question: str):
    """질문에 등장하는 용어·규칙을 끌어와 참고자료로 사용 (간단 키워드 매칭)."""
    cur.execute("SELECT term, definition FROM glossary "
                "WHERE %s ILIKE '%%' || term || '%%' ORDER BY length(term) DESC LIMIT 5", (question,))
    terms = cur.fetchall()
    cur.execute("SELECT topic, content FROM rules "
                "WHERE %s ILIKE '%%' || topic || '%%' LIMIT 3", (question,))
    rules = cur.fetchall()
    return terms, rules


def _format_context(terms, rules) -> str:
    lines = []
    for t in terms:
        lines.append(f"- 용어 '{t['term']}': {t['definition']}")
    for r in rules:
        lines.append(f"- 규칙 '{r['topic']}': {r['content']}")
    return "\n".join(lines) if lines else "(관련 용어·규칙 없음)"


@router.post("/chat")
def chat(body: ChatIn):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            persona = None
            if body.team_code:
                cur.execute("SELECT * FROM team_personas WHERE team_code = %s", (body.team_code,))
                persona = cur.fetchone()
            terms, rules = _retrieve(cur, body.question)
    finally:
        conn.close()

    context_text = _format_context(terms, rules)
    used = {"persona": persona.get("team_name") if persona else None,
            "terms": [t["term"] for t in terms], "rules": [r["topic"] for r in rules]}

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return {"answer": "(아직 LLM 미연결) GEMINI_API_KEY를 .env에 넣으면 동작합니다.",
                "context": used}

    system = _build_system_prompt(persona)
    user = f"[참고자료]\n{context_text}\n\n[질문]\n{body.question}"
    try:
        resp = requests.post(
            GEMINI_URL, params={"key": key},
            json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": user}]}],
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 800},
            }, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        answer = data["candidates"][0]["content"]["parts"][0]["text"]
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Gemini 호출 실패: {e.response.text[:200]}")
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Gemini 응답 형식 오류(차단되었거나 빈 응답)")

    return {"answer": answer, "context": used}
