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
"""
import os
import threading

from google import genai
from google.genai import types

_clients: dict = {}
_lock = threading.Lock()


def model_name() -> str:
    return os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")


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


def _config(system, temperature, max_tokens):
    return types.GenerateContentConfig(system_instruction=system, temperature=temperature,
                                       max_output_tokens=max_tokens)


def generate(system: str | None, user: str, temperature: float = 0.85, max_tokens: int = 250) -> str:
    """폴백 체인으로 단일 생성. 백엔드 순서대로 시도, 429/오류 시 다음으로 자동 전환."""
    errs = []
    for b in _backends():
        try:
            r = _client_for(b).models.generate_content(
                model=model_name(), contents=user, config=_config(system, temperature, max_tokens))
            txt = (r.text or "").strip()
            if txt:
                return txt
            errs.append(f"{b['id']}:empty")
        except Exception as e:
            errs.append(f"{b['id']}:{str(e)[:70]}")
    raise RuntimeError("LLM 전체 폴백 실패 — " + " | ".join(errs))


def generate_stream(system: str | None, user: str, temperature: float = 0.85, max_tokens: int = 250):
    """폴백 체인으로 스트리밍 생성. 한 백엔드가 토큰을 흘리기 시작하면 그걸로 끝까지(중복 방지)."""
    errs = []
    for b in _backends():
        yielded = False
        try:
            for chunk in _client_for(b).models.generate_content_stream(
                    model=model_name(), contents=user, config=_config(system, temperature, max_tokens)):
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
