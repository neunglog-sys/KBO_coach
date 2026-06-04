# -*- coding: utf-8 -*-
"""
KBO 야구 챗봇 백엔드 (FastAPI).
실행:  uvicorn main:app --reload --app-dir services/api
문서:  http://127.0.0.1:8000/docs
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from db import db, latest_date
from auth import router as auth_router
from info import router as info_router
from visits import router as visits_router
from chat import router as chat_router
from weather import router as weather_router
from board import router as board_router
from my_records import router as my_records_router
from push import router as push_router
from internal import router as internal_router
from attendance import router as attendance_router
from quiz import router as quiz_router

app = FastAPI(title="KBO Baseball Helper API", version="0.1.0")

# CORS — 프론트(다른 도메인)에서 호출 허용. Bearer 토큰 방식이라 쿠키(credentials) 미사용.
# 기본은 전체 허용(데모). 운영 시 CORS_ORIGINS="https://a.com,https://b.com"로 제한 가능.
_origins = os.environ.get("CORS_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins.split(",")] if _origins != "*" else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth_router, info_router, visits_router, chat_router, weather_router,
          board_router, my_records_router, push_router, internal_router, attendance_router,
          quiz_router):
    app.include_router(r)


@app.get("/")
def health():
    """헬스체크 — 서버 + Mongo 연결."""
    return {"status": "ok", "db": db.name, "collections": db.list_collection_names()}


# ===== 동적 야구 기록 (MongoDB) =====
@app.get("/standings")
def get_standings(date: str | None = None):
    d = date or latest_date("teamrank")
    rows = list(db.teamrank.find({"date": d}, {"_id": 0}).sort("순위", 1))
    return {"date": d, "count": len(rows), "standings": rows}


@app.get("/hitters")
def get_hitters(team: str | None = None, limit: int = 20, date: str | None = None):
    d = date or latest_date("hitters")
    query = {"date": d}
    if team:
        query["팀명"] = team
    rows = list(db.hitters.find(query, {"_id": 0}).sort("AVG", -1).limit(limit))
    return {"date": d, "count": len(rows), "hitters": rows}


@app.get("/pitchers")
def get_pitchers(team: str | None = None, limit: int = 20, date: str | None = None):
    d = date or latest_date("pitchers")
    query = {"date": d}
    if team:
        query["팀명"] = team
    rows = list(db.pitchers.find(query, {"_id": 0}).sort("ERA", 1).limit(limit))
    return {"date": d, "count": len(rows), "pitchers": rows}


@app.get("/players/search")
def search_players(name: str):
    """이름으로 선수 검색 (부분일치, 동명이인 모두 반환)."""
    rows = list(db.players.find({"name": {"$regex": name}}, {"_id": 0}).limit(20))
    return {"count": len(rows), "players": rows}


@app.get("/players/{player_id}")
def get_player(player_id: int):
    profile = db.players.find_one({"playerId": player_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="선수를 찾을 수 없음")
    hitting = db.hitters.find_one({"playerId": player_id}, {"_id": 0}, sort=[("date", -1)])
    pitching = db.pitchers.find_one({"playerId": player_id}, {"_id": 0}, sort=[("date", -1)])
    return {"profile": profile, "hitting": hitting, "pitching": pitching}


@app.get("/games")
def get_games(date: str | None = None):
    d = date or latest_date("games")
    rows = list(db.games.find({"date": d}, {"_id": 0}))
    return {"date": d, "count": len(rows), "games": rows}


@app.get("/schedule")
def get_schedule(date: str | None = None):
    d = date or latest_date("schedule")
    rows = list(db.schedule.find({"date": d}, {"_id": 0}))
    return {"date": d, "count": len(rows), "schedule": rows}


@app.get("/games/{game_id}/boxscore")
def get_boxscore(game_id: str):
    """경기별 선수 박스스코어 (타자·투수)."""
    hitters = list(db.game_hitters.find({"gameId": game_id}, {"_id": 0}))
    pitchers = list(db.game_pitchers.find({"gameId": game_id}, {"_id": 0}))
    if not hitters and not pitchers:
        raise HTTPException(status_code=404, detail="경기 기록 없음")
    return {"gameId": game_id, "hitters": hitters, "pitchers": pitchers}
