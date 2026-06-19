# -*- coding: utf-8 -*-
"""Gemini 임베딩 공용 모듈 — 청크 백필(embed_chunks.py)과 /chat 질의에서 함께 사용.

google-genai 클라이언트(llm._backends/_client_for)를 공유 → Vertex/AI Studio 설정을 그대로 따른다.
모델·차원은 기존 저장 벡터와 동일해야 검색이 맞으므로 gemini-embedding-001 / 768 유지.

Vertex 임베딩 엔드포인트가 간헐적으로 8~10초 지연되어 /chat 응답시간 꼬리(p95)를 끌어올리던 문제 →
  1) 결과 캐시(LRU): 질의는 반복이 많아 적중 시 임베딩 0초.
  2) 타임아웃 폴백: 한 백엔드가 EMBED_TIMEOUT_S 넘으면 다음 백엔드(다른 계정/공급자)로 자동 전환.
     (generate()의 폴백 체인과 동일 사상 — 동일 모델 유지, 계정/공급자만 전환)
"""
import os
import threading
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, TimeoutError as _FutureTimeout

from google.genai import types

import llm

EMBED_MODEL = os.environ.get("EMBED_MODEL", "gemini-embedding-001")
EMBED_DIM = int(os.environ.get("EMBED_DIM", "768"))   # pgvector 인덱스 한계(2000) 이내
# 이 시간을 넘기면 해당 백엔드 호출을 끊고 다음 백엔드로 폴백(평소 0.3~0.4s, 느릴 때 8~10s).
EMBED_TIMEOUT_S = float(os.environ.get("EMBED_TIMEOUT_S", "3"))

_CACHE_MAX = 2000
_cache: "OrderedDict[tuple, list]" = OrderedDict()
_cache_lock = threading.Lock()
# 타임아웃 래핑용 — 느린 호출이 워커를 점유해도 신규 호출은 막히지 않게 넉넉히.
_pool = ThreadPoolExecutor(max_workers=32, thread_name_prefix="embed")


def _embed_call(b: dict, text: str, task_type: str) -> list[float]:
    r = llm._client_for(b).models.embed_content(
        model=EMBED_MODEL, contents=text,
        config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=EMBED_DIM))
    return list(r.embeddings[0].values)


def embed_text(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    """텍스트 → 임베딩 벡터 (문서는 RETRIEVAL_DOCUMENT, 질의는 RETRIEVAL_QUERY).

    캐시 적중 시 즉시 반환. 미적중 시 백엔드를 우선순위대로 시도하되 각 호출에
    EMBED_TIMEOUT_S 타임아웃을 걸어, 느리거나 실패하면 다음 백엔드로 전환한다.
    """
    key = (task_type, text)
    with _cache_lock:
        hit = _cache.get(key)
        if hit is not None:
            _cache.move_to_end(key)
            return hit

    errs: list[str] = []
    for b in llm._backends():
        try:
            vec = _pool.submit(_embed_call, b, text, task_type).result(timeout=EMBED_TIMEOUT_S)
        except _FutureTimeout:
            # 타임아웃된 호출은 백그라운드에서 끝나면 정리됨(결과는 버림). 다음 백엔드로.
            errs.append(f"{b['id']}:timeout>{EMBED_TIMEOUT_S}s")
            continue
        except Exception as e:
            errs.append(f"{b['id']}:{str(e)[:60]}")
            continue
        with _cache_lock:
            _cache[key] = vec
            _cache.move_to_end(key)
            while len(_cache) > _CACHE_MAX:
                _cache.popitem(last=False)
        return vec
    raise RuntimeError("임베딩 전체 폴백 실패 — " + " | ".join(errs))


def to_pgvector(vec: list[float]) -> str:
    """리스트 → pgvector 리터럴 문자열 '[1,2,3]'."""
    return "[" + ",".join(str(x) for x in vec) + "]"
