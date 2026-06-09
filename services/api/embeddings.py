# -*- coding: utf-8 -*-
"""Gemini 임베딩 공용 모듈 — 청크 백필(embed_chunks.py)과 /chat 질의에서 함께 사용.

google-genai 클라이언트(llm.get_client)를 공유 → Vertex/AI Studio 설정을 그대로 따른다.
모델·차원은 기존 저장 벡터와 동일해야 검색이 맞으므로 gemini-embedding-001 / 768 유지.
"""
import os

from google.genai import types

import llm

EMBED_MODEL = os.environ.get("EMBED_MODEL", "gemini-embedding-001")
EMBED_DIM = int(os.environ.get("EMBED_DIM", "768"))   # pgvector 인덱스 한계(2000) 이내


def embed_text(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    """텍스트 → 임베딩 벡터. 문서는 RETRIEVAL_DOCUMENT, 질의는 RETRIEVAL_QUERY."""
    r = llm.get_client().models.embed_content(
        model=EMBED_MODEL, contents=text,
        config=types.EmbedContentConfig(task_type=task_type, output_dimensionality=EMBED_DIM))
    return list(r.embeddings[0].values)


def to_pgvector(vec: list[float]) -> str:
    """리스트 → pgvector 리터럴 문자열 '[1,2,3]'."""
    return "[" + ",".join(str(x) for x in vec) + "]"
