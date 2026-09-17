# -*- coding: utf-8 -*-
"""Gemini 공용 클라이언트 — google-genai SDK 래퍼 + 다단 폴백 체인.

요청마다 **우선순위대로 백엔드를 시도**하고, 429(할당량 소진)·오류 시 **자동으로 다음
백엔드(다른 계정/공급자)로 전환**한다. 코어 품질 유지를 위해 폴백도 동일 파운데이션
모델을 쓴다(성능 낮은 모델로 강등하지 않고 계정/공급자만 전환).

우선순위(설정된 것만 사용):
  1) Vertex AI  — GOOGLE_GENAI_USE_VERTEXAI=true + GOOGLE_CLOUD_PROJECT (GCP 크레딧)
  2) AI Studio  — GEMINI_API_KEYS(콤마구분) 또는 GEMINI_API_KEY / _2 / _3 / _4 (계정 n개)

설정(.env):
  GOOGLE_GENAI_USE_VERTEXAI=true
  GOOGLE_CLOUD_PROJECT=kboai-5dea0, GOOGLE_CLOUD_LOCATION=global
  GEMINI_API_KEYS=keyA,keyB,...   (또는 GEMINI_API_KEY, GEMINI_API_KEY_2, ...)
  GEMINI_MODEL=gemini-3.1-flash-lite
  GEMINI_SEARCH_MODEL=gemini-2.5-flash
  GEMINI_SEARCH_TIMEOUT_S=12
  GEMINI_SEARCH_THINKING_BUDGET=0
"""
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as _FutureTimeout

from google import genai
from google.genai import types

_clients: dict = {}
_lock = threading.Lock()
_search_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="gemini-search")


class SearchTimeoutError(RuntimeError):
    """Google Search grounding이 정해진 전체 제한시간을 넘김."""


def model_name() -> str:
    return os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")


def search_model_name() -> str:
    """최신 정보가 필요할 때만 사용하는 검색 가능 모델."""
    return os.environ.get("GEMINI_SEARCH_MODEL", "gemini-2.5-flash")


def use_vertex() -> bool:
    # env는 호출 시점에 읽는다(.env 로드 순서에 의존하지 않게).
    return os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() in ("true", "1", "yes")


def _aistudio_keys() -> list[str]:
    """AI Studio 키 목록(계정 n개). 어느 변수든 콤마로 여러 개 넣어도 됨(너그럽게 파싱)."""
    raw: list[str] = []
    for name in ("GEMINI_API_KEYS", "GEMINI_API_KEY",
                 "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4"):
        v = os.environ.get(name, "")
        if v:
            raw.append(v)
    keys: list[str] = []
    for chunk in raw:
        for part in chunk.split(","):     # 콤마로 여러 키 넣은 경우도 분리
            p = part.strip()
            if p and p not in keys:
                keys.append(p)
    return keys


def _backends() -> list[dict]:
    """우선순위 백엔드 목록(설정된 것만). Vertex(크레딧) → AI Studio 키들(계정 n개)."""
    out: list[dict] = []
    if use_vertex() and os.environ.get("GOOGLE_CLOUD_PROJECT"):
        out.append({"id": "vertex", "kind": "vertex"})
    for i, key in enumerate(_aistudio_keys()):
        out.append({"id": f"aistudio{i + 1}", "kind": "aistudio", "key": key})
    return out


def _client_for(b: dict):
    """백엔드별 genai 클라이언트(싱글톤 캐시)."""
    cid = "vertex" if b["kind"] == "vertex" else f"k:{b['key'][-8:]}"
    c = _clients.get(cid)
    if c is None:
        with _lock:
            c = _clients.get(cid)
            if c is None:
                if b["kind"] == "vertex":
                    c = genai.Client(vertexai=True,
                                     project=os.environ["GOOGLE_CLOUD_PROJECT"],
                                     location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"))
                else:
                    # vertexai=False 명시 — env의 GOOGLE_GENAI_USE_VERTEXAI=true가
                    # api_key 클라이언트까지 Vertex 모드로 끌고 가는 것 방지(401 회피).
                    c = genai.Client(api_key=b["key"], vertexai=False)
                _clients[cid] = c
    return c


def get_client():
    """최우선 백엔드 클라이언트(임베딩 등 단일 호출용)."""
    bs = _backends()
    if not bs:
        raise RuntimeError("LLM 백엔드 미설정 (Vertex 프로젝트 또는 GEMINI_API_KEY 필요)")
    return _client_for(bs[0])


def llm_ready() -> bool:
    """호출 가능한 백엔드가 하나라도 있는지."""
    return bool(_backends())


def thinking_budget() -> int:
    """기본 답변 모델의 사고 예산. 0이면 사고 없이 바로 답한다(기본값).

    실측(gemini-3.1-flash-lite, 같은 질문 3회 중앙값): 기본 3.1초 → 사고 0 설정 시 1.8초.
    RAG 자료를 붙여 짧게 답하는 용도라 사고를 켤 이득이 없어 기본을 0으로 둔다."""
    return int(os.environ.get("GEMINI_THINKING_BUDGET", "0"))


def _config(system, temperature, max_tokens, thinking: bool = True):
    kwargs = dict(system_instruction=system, temperature=temperature,
                  max_output_tokens=max_tokens)
    if thinking:
        kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=thinking_budget())
    return types.GenerateContentConfig(**kwargs)


def generate(
    system: str | None,
    user: str,
    temperature: float = 0.85,
    max_tokens: int = 250,
    model: str | None = None,
) -> str:
    """폴백 체인으로 단일 생성. 백엔드 순서대로 시도, 429/오류 시 다음으로 자동 전환."""
    errs = []
    for b in _backends():
        try:
            try:
                r = _client_for(b).models.generate_content(
                    model=model or model_name(), contents=user,
                    config=_config(system, temperature, max_tokens))
            except Exception as e:                     # 사고 설정 미지원 모델 대비
                if "thinking" not in str(e).lower():
                    raise
                r = _client_for(b).models.generate_content(
                    model=model or model_name(), contents=user,
                    config=_config(system, temperature, max_tokens, thinking=False))
            txt = (r.text or "").strip()
            if txt:
                return txt
            errs.append(f"{b['id']}:empty")
        except Exception as e:
            errs.append(f"{b['id']}:{str(e)[:70]}")
    raise RuntimeError("LLM 전체 폴백 실패 — " + " | ".join(errs))


def generate_stream(
    system: str | None,
    user: str,
    temperature: float = 0.85,
    max_tokens: int = 250,
    model: str | None = None,
):
    """폴백 체인으로 스트리밍 생성. 한 백엔드가 토큰을 흘리기 시작하면 그걸로 끝까지(중복 방지)."""
    errs = []
    for b in _backends():
        yielded = False
        try:
            for chunk in _client_for(b).models.generate_content_stream(
                    model=model or model_name(), contents=user,
                    config=_config(system, temperature, max_tokens)):
                if chunk.text:
                    yielded = True
                    yield chunk.text
            if yielded:
                return
            errs.append(f"{b['id']}:empty")
        except Exception as e:
            if yielded:
                return   # 이미 일부 전송됨 → 재시도하면 중복, 종료
            errs.append(f"{b['id']}:{str(e)[:70]}")
    # 전부 실패 → 아무것도 안 나옴(호출부가 폴백/에러 처리)


def _grounding_sources(response) -> list[dict]:
    """GenerateContentResponse의 grounding metadata에서 실제 웹 근거만 추출한다."""
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        return []
    metadata = getattr(candidates[0], "grounding_metadata", None)
    if metadata is None:
        return []

    # 검색 청크만 있고 문장-근거 연결이 없는 응답은 검증된 결과로 취급하지 않는다.
    if not (getattr(metadata, "grounding_supports", None) or []):
        return []

    sources: list[dict] = []
    seen: set[str] = set()
    for chunk in getattr(metadata, "grounding_chunks", None) or []:
        web = getattr(chunk, "web", None)
        uri = (getattr(web, "uri", None) or "").strip() if web else ""
        if not uri or uri in seen:
            continue
        seen.add(uri)
        sources.append({
            "title": (getattr(web, "title", None) or uri).strip(),
            "url": uri,
        })
    return sources


def _grounded_call(b: dict, system: str | None, user: str, max_tokens: int):
    # Gemini 2.5 Flash는 기본이 동적 사고(-1)라 짧은 검색 답변의 출력 토큰을
    # 내부 사고가 먼저 소진해 MAX_TOKENS + 빈 텍스트로 끝날 수 있다.
    # 검색은 이미 Google 근거가 핵심이므로 기본 0(사고 비활성화)으로 빠르게 응답한다.
    thinking_budget = int(os.environ.get("GEMINI_SEARCH_THINKING_BUDGET", "0"))
    config = types.GenerateContentConfig(
        system_instruction=system,
        temperature=0.2,
        max_output_tokens=max_tokens,
        tools=[types.Tool(google_search=types.GoogleSearch())],
        thinking_config=types.ThinkingConfig(thinking_budget=thinking_budget),
    )
    return _client_for(b).models.generate_content(
        model=search_model_name(), contents=user, config=config)


def generate_grounded(
    system: str | None,
    user: str,
    max_tokens: int = 300,
) -> dict:
    """Gemini 2.5 Flash + Google Search로 근거 있는 최신 답변을 생성한다.

    답변 텍스트뿐 아니라 실제 문장 근거가 연결된 웹 출처를 함께 반환한다. 전체 검색
    시간이 제한을 넘으면 다른 키로 자동 재시도하지 않고 SearchTimeoutError를 올린다.
    """
    timeout_s = float(os.environ.get("GEMINI_SEARCH_TIMEOUT_S", "12"))
    deadline = time.monotonic() + max(1.0, timeout_s)
    errs: list[str] = []

    for b in _backends():
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise SearchTimeoutError(f"Google 검색 시간 초과({timeout_s:g}초)")
        try:
            response = _search_pool.submit(
                _grounded_call, b, system, user, max_tokens
            ).result(timeout=remaining)
        except _FutureTimeout as exc:
            # 시간 초과는 중복 검색·중복 과금을 막기 위해 다른 키로 다시 호출하지 않는다.
            raise SearchTimeoutError(f"Google 검색 시간 초과({timeout_s:g}초)") from exc
        except Exception as exc:
            errs.append(f"{b['id']}:{str(exc)[:90]}")
            continue

        text = (getattr(response, "text", None) or "").strip()
        sources = _grounding_sources(response)
        if text and sources:
            return {"text": text, "sources": sources, "model": search_model_name()}
        # 호출 자체가 성공했지만 근거가 없으면 다른 키로 같은 검색을 반복하지 않는다.
        raise RuntimeError(f"{b['id']}: 검색 근거를 확인할 수 없음")

    raise RuntimeError("검색 근거를 확인할 수 없음 — " + " | ".join(errs))


def warmup() -> bool:
    """최우선 백엔드 예열."""
    bs = _backends()
    if not bs:
        return False
    try:
        _client_for(bs[0]).models.generate_content(
            model=model_name(), contents="hi",
            config=types.GenerateContentConfig(max_output_tokens=1))
        return True
    except Exception:
        return False
