# -*- coding: utf-8 -*-
"""Gemini 임베딩 공용 모듈 — 청크 백필(embed_chunks.py)과 /chat 질의에서 함께 사용."""
import os
import requests

EMBED_MODEL = os.environ.get("EMBED_MODEL", "gemini-embedding-001")
EMBED_DIM = int(os.environ.get("EMBED_DIM", "768"))   # pgvector 인덱스 한계(2000) 이내
EMBED_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBED_MODEL}:embedContent"


def embed_text(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    """텍스트 → 임베딩 벡터. 문서는 RETRIEVAL_DOCUMENT, 질의는 RETRIEVAL_QUERY."""
    key = os.environ["GEMINI_API_KEY"]
    r = requests.post(
        EMBED_URL, params={"key": key},
        json={
            "model": f"models/{EMBED_MODEL}",
            "content": {"parts": [{"text": text}]},
            "taskType": task_type,
            "outputDimensionality": EMBED_DIM,
        }, timeout=30)
    r.raise_for_status()
    return r.json()["embedding"]["values"]


def to_pgvector(vec: list[float]) -> str:
    """리스트 → pgvector 리터럴 문자열 '[1,2,3]'."""
    return "[" + ",".join(str(x) for x in vec) + "]"
