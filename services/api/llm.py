# -*- coding: utf-8 -*-
"""Gemini 공용 클라이언트 — google-genai SDK 래퍼.

GOOGLE_GENAI_USE_VERTEXAI=true 면 Vertex AI(서비스계정 인증, GCP 결제=크레딧 사용),
아니면 AI Studio(GEMINI_API_KEY). 챗 생성/스트리밍/임베딩이 같은 클라이언트를 공유한다.

설정(.env):
  GOOGLE_GENAI_USE_VERTEXAI=true        # Vertex 사용
  GOOGLE_CLOUD_PROJECT=kboai-5dea0      # GCP 프로젝트(크레딧 붙은 곳)
  GOOGLE_CLOUD_LOCATION=global          # Gemini는 global에서 제공
  GOOGLE_APPLICATION_CREDENTIALS=...    # 서비스계정 JSON 경로(로컬). Cloud Run은 연결된 SA 사용
  GEMINI_MODEL=gemini-3.1-flash-lite    # (선택)
  # AI Studio 폴백 시: GEMINI_API_KEY
"""
import os
import threading

from google import genai
from google.genai import types

_client = None
_lock = threading.Lock()


def model_name() -> str:
    return os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")


def use_vertex() -> bool:
    # env는 호출 시점에 읽는다(.env 로드 순서에 의존하지 않게).
    return os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() in ("true", "1", "yes")


def get_client():
    """genai 클라이언트(싱글톤). Vertex/AI Studio를 env로 선택."""
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                if use_vertex():
                    _client = genai.Client(
                        vertexai=True,
                        project=os.environ["GOOGLE_CLOUD_PROJECT"],
                        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "global"),
                    )
                else:
                    _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


def llm_ready() -> bool:
    """호출 가능 상태인지(키/프로젝트 설정 여부)."""
    if use_vertex():
        return bool(os.environ.get("GOOGLE_CLOUD_PROJECT"))
    return bool(os.environ.get("GEMINI_API_KEY"))


def _config(system: str | None, temperature: float, max_tokens: int):
    return types.GenerateContentConfig(
        system_instruction=system,
        temperature=temperature,
        max_output_tokens=max_tokens,
    )


def generate(system: str | None, user: str, temperature: float = 0.85, max_tokens: int = 250) -> str:
    """단일 생성 → 답변 텍스트."""
    r = get_client().models.generate_content(
        model=model_name(), contents=user, config=_config(system, temperature, max_tokens))
    return (r.text or "").strip()


def generate_stream(system: str | None, user: str, temperature: float = 0.85, max_tokens: int = 250):
    """스트리밍 생성 → 텍스트 조각 제너레이터."""
    for chunk in get_client().models.generate_content_stream(
            model=model_name(), contents=user, config=_config(system, temperature, max_tokens)):
        if chunk.text:
            yield chunk.text


def warmup() -> bool:
    """연결·모델 예열용 미니 호출."""
    try:
        get_client().models.generate_content(
            model=model_name(), contents="hi",
            config=types.GenerateContentConfig(max_output_tokens=1))
        return True
    except Exception:
        return False
