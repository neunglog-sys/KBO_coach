# -*- coding: utf-8 -*-
"""구장 날씨·우천취소 (서브) — 기상청 API 프록시. 현재 스켈레톤(KMA_API_KEY 필요)."""
import os
from fastapi import APIRouter

router = APIRouter(tags=["weather"])


@router.get("/weather")
def weather(stadium: str | None = None, date: str | None = None):
    if not os.environ.get("KMA_API_KEY"):
        return {"note": "기상청 API 키(KMA_API_KEY .env) 미설정 — 스켈레톤",
                "stadium": stadium, "date": date}
    # TODO: 구장→좌표 매핑 후 기상청 apihub 호출, 강수확률로 우천취소 여부 추정
    return {"stadium": stadium, "date": date, "weather": None}
