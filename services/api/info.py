# -*- coding: utf-8 -*-
"""정적 야구정보 조회 (PostgreSQL): 구단·페르소나·용어·구장. (데이터 적재 전엔 빈 배열)"""
from fastapi import APIRouter, HTTPException
from db_pg import get_conn

router = APIRouter(tags=["info"])


@router.get("/teams")
def teams():
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT team_code, name, city, home_stadium, founded_year, championships "
                        "FROM teams ORDER BY team_code")
            rows = cur.fetchall()
        return {"count": len(rows), "teams": rows}
    finally:
        conn.close()


@router.get("/teams/{team_code}")
def team_detail(team_code: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM teams WHERE team_code = %s", (team_code,))
            team = cur.fetchone()
            if not team:
                raise HTTPException(status_code=404, detail="구단 없음")
            cur.execute("SELECT name, position, era, note, jersey_no FROM legends WHERE team_code = %s", (team_code,))
            legends = cur.fetchall()
        return {"team": team, "legends": legends}
    finally:
        conn.close()


@router.get("/teams/{team_code}/persona")
def team_persona(team_code: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM team_personas WHERE team_code = %s", (team_code,))
            persona = cur.fetchone()
        if not persona:
            raise HTTPException(status_code=404, detail="페르소나 없음(데이터 적재 전)")
        return persona
    finally:
        conn.close()


@router.get("/glossary")
def glossary(q: str | None = None):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            if q:
                cur.execute("SELECT * FROM glossary WHERE term ILIKE %s OR abbr ILIKE %s ORDER BY term",
                            (f"%{q}%", f"%{q}%"))
            else:
                cur.execute("SELECT * FROM glossary ORDER BY term")
            rows = cur.fetchall()
        return {"count": len(rows), "terms": rows}
    finally:
        conn.close()


STADIUM_ORDER_SQL = """
    CASE t.team_code
        WHEN 'LG' THEN 1
        WHEN 'OB' THEN 2
        WHEN 'WO' THEN 3
        WHEN 'SK' THEN 4
        WHEN 'KT' THEN 5
        WHEN 'HT' THEN 6
        WHEN 'SS' THEN 7
        WHEN 'LT' THEN 8
        WHEN 'HH' THEN 9
        WHEN 'NC' THEN 10
        ELSE 99
    END
"""


@router.get("/stadiums")
def stadiums():
    """Return every KBO team with its stadium data."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT
                    t.team_code,
                    t.name AS team_name,
                    t.city,
                    t.home_stadium,
                    s.stadium_id,
                    s.name,
                    s.location,
                    s.parking,
                    s.subway,
                    s.food,
                    s.stadium_size,
                    s.seat_count,
                    s.features,
                    s.ktx_info,
                    s.taxi_info,
                    s.bus_info,
                    s.parking_tip,
                    s.restaurants,
                    s.tourism,
                    s.accommodations,
                    s.reservation_site,
                    s.reservation_tip
                FROM teams t
                LEFT JOIN stadiums s ON s.team_code = t.team_code
                ORDER BY {STADIUM_ORDER_SQL}, s.stadium_id
                """
            )
            rows = cur.fetchall()
        return {"count": len(rows), "stadiums": rows}
    finally:
        conn.close()


@router.get("/stadiums/{team_code}")
def stadium(team_code: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    t.team_code,
                    t.name AS team_name,
                    t.city,
                    t.home_stadium,
                    s.*
                FROM teams t
                LEFT JOIN stadiums s ON s.team_code = t.team_code
                WHERE t.team_code = %s
                ORDER BY s.stadium_id
                """,
                (team_code.upper(),),
            )
            rows = cur.fetchall()
        if not rows:
            raise HTTPException(status_code=404, detail="구단을 찾을 수 없습니다.")
        return {"team_code": team_code.upper(), "stadiums": rows}
    finally:
        conn.close()


@router.get("/rules")
def rules(category: str | None = None):
    """야구 규칙 (category로 필터 가능)."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            if category:
                cur.execute("SELECT * FROM rules WHERE category = %s ORDER BY rule_id", (category,))
            else:
                cur.execute("SELECT * FROM rules ORDER BY rule_id")
            rows = cur.fetchall()
        return {"count": len(rows), "rules": rows}
    finally:
        conn.close()


@router.get("/cheering/{team_code}")
def cheering(team_code: str):
    """구단 응원 문화."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM cheering WHERE team_code = %s ORDER BY cheering_id", (team_code,))
            rows = cur.fetchall()
        return {"team_code": team_code, "count": len(rows), "cheering": rows}
    finally:
        conn.close()


@router.get("/teams/{team_code}/culture")
def team_culture(team_code: str):
    """구단 문화 프로필 (팬덤·응원 스타일·초보 팁 등)."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM team_culture_profiles WHERE team_code = %s", (team_code,))
            profile = cur.fetchone()
        if not profile:
            raise HTTPException(status_code=404, detail="문화 프로필 없음")
        return profile
    finally:
        conn.close()


@router.get("/umpire_signals")
def umpire_signals():
    """심판 수신호 (스트라이크·아웃·세이프 등)."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM umpire_signals ORDER BY signal_id")
            rows = cur.fetchall()
        return {"count": len(rows), "signals": rows}
    finally:
        conn.close()
