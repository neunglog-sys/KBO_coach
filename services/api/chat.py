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
from embeddings import embed_text, to_pgvector

router = APIRouter(tags=["chat"])

CHUNK_MIN_SCORE = 0.45   # 벡터 유사도(코사인) 이 미만이면 관련 없다고 보고 제외

GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"


class ChatIn(BaseModel):
    question: str
    team_code: str | None = None      # 어떤 구단 페르소나로 답할지
    session_id: str | None = None
    personal_context: str | None = None   # 앱이 로컬 SQLite에서 꺼낸 개인기록(서버 미저장, 답변 생성에만 일시 사용)


def _build_system_prompt(persona: dict | None) -> str:
    base_rules = (
        "\n[공통 규칙]\n"
        "- 야구를 처음 보는 사람도 이해하도록 쉽고 친근하게 설명한다.\n"
        "- 답변은 기본적으로 3~6문장 안에서 끝낸다.\n"
        "- 꼭 필요한 경우가 아니면 번호 목록을 쓰지 않는다.\n"
        "- 긴 설명보다 짧은 문단형 설명을 우선한다.\n"
        "- **굵은 강조 표시**를 남발하지 않는다. 원칙적으로 사용하지 않는다.\n"
        "- 같은 마무리 문장을 반복하지 않는다.\n"
        "- '환영해요', '쉽게 설명해드릴게요', '궁금한 점 있으면 물어보세요' 같은 상투적 문장을 반복하지 않는다.\n"
        "- 자주 쓰는 말은 한 답변에 최대 1번만 사용한다.\n"
        "- 팀 캐릭터성은 말투와 관점에 자연스럽게 녹이고, 억지 유행어나 응원구호 반복은 피한다.\n"
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
        f"[자주 쓰는 말 후보] {p.get('common_phrases')}\n"
        f"- 위 표현은 캐릭터 참고용이며, 매 답변마다 반복하지 않는다.\n"
        f"- 같은 표현을 여러 번 쓰지 말고, 상황에 맞을 때만 아주 가볍게 사용한다.\n"
        f"[답변 방식] {p.get('response_style')}\n"
        f"[금지 사항] {prohibited}\n"
        + base_rules
    )


def _retrieve(cur, question: str, team_code: str | None):
    """참고자료 수집: 용어·규칙(키워드 매칭) + 구단 문화(knowledge_chunks 벡터검색)."""
    cur.execute("SELECT term, definition FROM glossary "
                "WHERE %s ILIKE '%%' || term || '%%' ORDER BY length(term) DESC LIMIT 5", (question,))
    terms = cur.fetchall()
    cur.execute("SELECT topic, content FROM rules "
                "WHERE %s ILIKE '%%' || topic || '%%' LIMIT 3", (question,))
    rules = cur.fetchall()

    # knowledge_chunks 벡터 유사도 검색 (질문 임베딩 → 코사인 거리 정렬)
    chunks = []
    try:
        qvec = to_pgvector(embed_text(question, task_type="RETRIEVAL_QUERY"))
        if team_code:   # 페르소나 팀 + 공통(team_code NULL) 청크로 한정
            cur.execute("""SELECT title, content, 1 - (embedding <=> %s::vector) AS score
                           FROM knowledge_chunks
                           WHERE embedding IS NOT NULL AND (team_code = %s OR team_code IS NULL)
                           ORDER BY embedding <=> %s::vector LIMIT 3""", (qvec, team_code, qvec))
        else:
            cur.execute("""SELECT title, content, 1 - (embedding <=> %s::vector) AS score
                           FROM knowledge_chunks WHERE embedding IS NOT NULL
                           ORDER BY embedding <=> %s::vector LIMIT 3""", (qvec, qvec))
        chunks = [r for r in cur.fetchall() if r["score"] >= CHUNK_MIN_SCORE]
    except Exception:
        chunks = []   # 임베딩 호출 실패해도 용어·규칙만으로 동작
    return terms, rules, chunks


def _format_context(terms, rules, chunks) -> str:
    lines = []
    for t in terms:
        lines.append(f"- 용어 '{t['term']}': {t['definition']}")
    for r in rules:
        lines.append(f"- 규칙 '{r['topic']}': {r['content']}")
    for ch in chunks:
        lines.append(f"- 구단정보 '{ch['title']}': {ch['content']}")
    return "\n".join(lines) if lines else "(관련 자료 없음)"


@router.post("/chat")
def chat(body: ChatIn):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            persona = None
            if body.team_code:
                cur.execute("SELECT * FROM team_personas WHERE team_code = %s", (body.team_code,))
                persona = cur.fetchone()
            terms, rules, chunks = _retrieve(cur, body.question, body.team_code)
    finally:
        conn.close()

    context_text = _format_context(terms, rules, chunks)
    if body.personal_context:   # 앱이 로컬에서 가져온 개인기록 → 참고자료에 합류 (저장 안 함)
        context_text += f"\n- 사용자 개인기록: {body.personal_context}"
    used = {"persona": persona.get("team_name") if persona else None,
            "terms": [t["term"] for t in terms], "rules": [r["topic"] for r in rules],
            "culture": [ch["title"] for ch in chunks],
            "personal": bool(body.personal_context)}

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
                "generationConfig": {"temperature": 0.65, "maxOutputTokens": 450},
            }, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        answer = data["candidates"][0]["content"]["parts"][0]["text"]
    except requests.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Gemini 호출 실패: {e.response.text[:200]}")
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Gemini 응답 형식 오류(차단되었거나 빈 응답)")

    return {"answer": answer, "context": used}
