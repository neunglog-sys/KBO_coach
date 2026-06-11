# -*- coding: utf-8 -*-
"""구장 날씨·우천취소 — 기상청 단기예보(VilageFcst) 프록시.

엔드포인트:
  GET /weather?stadium=&date=       (호환) 키 없으면 스켈레톤
  GET /weather/now?stadium=         현재(가장 가까운 시각) 하늘상태 → 프론트 날씨 애니메이션용
  GET /weather/cancel?stadium=&date=&time=   경기 시간대 우천취소 위험도

설정: .env 에 KMA_API_KEY (기상청 단기예보 서비스키). 없으면 안전하게 note 반환.
"""
import math
import os
from datetime import datetime, timedelta

import requests
from fastapi import APIRouter

router = APIRouter(tags=["weather"])

KMA_KEY = os.environ.get("KMA_API_KEY")
KMA_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst"

STADIUMS = {
    "잠실야구장": {"lat": 37.5120673, "lon": 127.071827},
    "고척스카이돔": {"lat": 37.4980629, "lon": 126.8670625, "is_dome": True},
    "SSG랜더스필드": {"lat": 37.4375724, "lon": 126.6932064},
    "수원KT위즈파크": {"lat": 37.2997553, "lon": 127.0096685},
    "광주-KIA챔피언스필드": {"lat": 35.1681242, "lon": 126.8891056},
    "대구삼성라이온즈파크": {"lat": 35.8409032, "lon": 128.6814894},
    "사직야구장": {"lat": 35.1940316, "lon": 129.0615183},
    "창원NC파크": {"lat": 35.2225967, "lon": 128.5822292},
    "대전한화생명볼파크": {"lat": 36.3164159, "lon": 127.4311572},
}

PTY_MAP = {"0": "없음", "1": "비", "2": "비/눈", "3": "눈", "4": "소나기"}
SKY_MAP = {"1": "맑음", "3": "구름많음", "4": "흐림"}


def _latlon_to_grid(lat: float, lon: float):
    RE, GRID = 6371.00877, 5.0
    SLAT1, SLAT2, OLON, OLAT, XO, YO = 30.0, 60.0, 126.0, 38.0, 43, 136
    D = math.pi / 180.0
    re = RE / GRID
    s1, s2, ol, oa = SLAT1 * D, SLAT2 * D, OLON * D, OLAT * D
    sn = math.tan(math.pi * 0.25 + s2 * 0.5) / math.tan(math.pi * 0.25 + s1 * 0.5)
    sn = math.log(math.cos(s1) / math.cos(s2)) / math.log(sn)
    sf = math.tan(math.pi * 0.25 + s1 * 0.5)
    sf = math.pow(sf, sn) * math.cos(s1) / sn
    ro = math.tan(math.pi * 0.25 + oa * 0.5)
    ro = re * sf / math.pow(ro, sn)
    ra = math.tan(math.pi * 0.25 + lat * D * 0.5)
    ra = re * sf / math.pow(ra, sn)
    theta = lon * D - ol
    if theta > math.pi:
        theta -= 2.0 * math.pi
    if theta < -math.pi:
        theta += 2.0 * math.pi
    theta *= sn
    nx = int(math.floor(ra * math.sin(theta) + XO + 0.5))
    ny = int(math.floor(ro - ra * math.cos(theta) + YO + 0.5))
    return nx, ny


def _base_date_time():
    """발표 슬롯(02·05·08·11·14·17·20·23시) 중, 발행지연(~45분) 감안해 안전한 최신 슬롯."""
    target = datetime.now() - timedelta(minutes=45)
    ymd = target.strftime("%Y%m%d")
    hm = target.strftime("%H%M")
    for s in ("2300", "2000", "1700", "1400", "1100", "0800", "0500", "0200"):
        if hm >= s:
            return ymd, s
    y = (target - timedelta(days=1)).strftime("%Y%m%d")
    return y, "2300"


def _fetch_forecast(nx: int, ny: int):
    """기상청 단기예보 item 리스트. 실패 시 [] (앱 안 죽게)."""
    base_date, base_time = _base_date_time()
    params = {
        "serviceKey": KMA_KEY,
        "pageNo": 1,
        "numOfRows": 1000,
        "dataType": "JSON",
        "base_date": base_date,
        "base_time": base_time,
        "nx": nx,
        "ny": ny,
    }
    try:
        r = requests.get(KMA_URL, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        if data.get("response", {}).get("header", {}).get("resultCode") != "00":
            return []
        return data["response"]["body"]["items"]["item"]
    except Exception:
        return []


def _group_by_time(items):
    out: dict[str, dict] = {}
    for it in items:
        out.setdefault(it["fcstDate"] + it["fcstTime"], {})[it["category"]] = it["fcstValue"]
    return out


def _condition(sky: str, pty: str):
    """애니메이션 키 + 한글 라벨."""
    if pty in ("1", "4"):
        return "rain", "비"
    if pty == "3":
        return "snow", "눈"
    if pty == "2":
        return "sleet", "비/눈"
    if sky == "1":
        return "clear", "맑음"
    if sky == "3":
        return "cloudy", "구름많음"
    if sky == "4":
        return "overcast", "흐림"
    return "clear", "맑음"


def _normalize_game_time(game_time: str) -> str:
    g = game_time.replace(":", "")
    return f"{int(g[:2]):02d}00"


def _game_time_range(target_date: str, game_time: str, hours: int = 3):
    start = datetime.strptime(target_date + _normalize_game_time(game_time), "%Y%m%d%H%M")
    return [
        {
            "date": (start + timedelta(hours=i)).strftime("%Y%m%d"),
            "time": (start + timedelta(hours=i)).strftime("%H%M"),
        }
        for i in range(hours + 1)
    ]


def _cancel_score(pop: int, pty: str, pcp: str) -> int:
    score = pop * 0.6
    if pty == "1":
        score += 25
    elif pty == "4":
        score += 20
    elif pty in ("2", "3"):
        score += 15
    if pcp and pcp != "강수없음":
        if "mm" in pcp:
            try:
                amt = float(pcp.replace("mm", "").strip())
                score += 25 if amt >= 10 else 20 if amt >= 5 else 15 if amt >= 1 else 10 if amt > 0 else 0
            except ValueError:
                score += 10
        else:
            score += 10
    return int(min(score, 100))


# ===== 엔드포인트 =====
@router.get("/weather")
def weather(stadium: str | None = None, date: str | None = None):
    """(호환용) 키 없으면 스켈레톤, 있으면 현재 날씨로 위임."""
    if not KMA_KEY:
        return {"note": "KMA_API_KEY 미설정 — .env에 키 추가 필요", "stadium": stadium, "date": date}
    return weather_now(stadium or "잠실야구장")


@router.get("/weather/now")
def weather_now(stadium: str = "잠실야구장"):
    """현재(가장 가까운 예보 시각) 하늘상태 → 날씨 애니메이션용."""
    if not KMA_KEY:
        return {"configured": False, "condition": "clear", "label": "맑음", "note": "KMA_API_KEY 미설정"}
    st = STADIUMS.get(stadium)
    if not st:
        return {"configured": True, "error": "등록되지 않은 경기장", "stadium": stadium}

    nx, ny = _latlon_to_grid(st["lat"], st["lon"])
    grouped = _group_by_time(_fetch_forecast(nx, ny))
    if not grouped:
        return {"configured": True, "stadium": stadium, "condition": "clear",
                "label": "맑음", "note": "예보 데이터 없음(폴백)"}

    now_key = datetime.now().strftime("%Y%m%d%H00")
    keys = sorted(grouped.keys())
    key = next((k for k in keys if k >= now_key), keys[0])  # 현재 이후 가장 가까운 시각
    w = grouped[key]
    sky, pty = w.get("SKY", "1"), w.get("PTY", "0")
    cond, label = _condition(sky, pty)
    return {
        "configured": True,
        "stadium": stadium,
        "date": key[:8],
        "time": key[8:],
        "condition": cond,  # clear / cloudy / overcast / rain / snow / sleet
        "label": label,
        "sky": SKY_MAP.get(sky, "정보없음"),
        "pty": PTY_MAP.get(pty, "정보없음"),
        "rain_probability": int(w.get("POP", 0)),
        "temperature": w.get("TMP", "정보없음"),
    }


@router.get("/weather/cancel")
def weather_cancel(stadium: str, date: str, time: str):
    """경기 시간대(시작~+3h) 우천취소 위험도."""
    if not KMA_KEY:
        return {"success": False, "message": "KMA_API_KEY 미설정"}
    if stadium not in STADIUMS:
        return {"success": False, "message": "등록되지 않은 경기장입니다."}
    st = STADIUMS[stadium]
    if st.get("is_dome"):
        return {"success": True, "stadium": stadium, "target_date": date, "game_time": time,
                "cancel_risk_score": 0, "cancel_risk": "매우 낮음",
                "message": "실내 돔구장이라 우천취소 가능성은 매우 낮습니다."}

    nx, ny = _latlon_to_grid(st["lat"], st["lon"])
    grouped = _group_by_time(_fetch_forecast(nx, ny))
    targets = {t["date"] + t["time"] for t in _game_time_range(date, time, 3)}
    window = {k: v for k, v in grouped.items() if k in targets}
    if not window:
        return {"success": False, "stadium": stadium, "message": "경기 시간대 예보 데이터가 없습니다."}

    worst, max_score = None, -1
    for k in sorted(window):
        w = window[k]
        score = _cancel_score(int(w.get("POP", 0)), w.get("PTY", "0"), w.get("PCP", "강수없음"))
        if score > max_score:
            max_score = score
            worst = {
                "date": k[:8], "time": k[8:], "temperature": w.get("TMP", "정보없음"),
                "rain_probability": int(w.get("POP", 0)),
                "rain_type": PTY_MAP.get(w.get("PTY", "0"), "정보없음"),
                "rain_amount": w.get("PCP", "강수없음"),
                "sky": SKY_MAP.get(w.get("SKY", ""), "정보없음"),
                "cancel_risk_score": score,
            }

    if max_score >= 70:
        risk, msg = "높음", "비 예보가 강해 우천취소 가능성이 있어요. 경기 전 공식 공지를 확인하세요."
    elif max_score >= 40:
        risk, msg = "보통", "비 예보가 있어 경기 진행 여부가 변동될 수 있어요."
    else:
        risk, msg = "낮음", "현재 예보 기준 우천취소 가능성은 낮아 보여요."

    return {"success": True, "stadium": stadium, "target_date": date, "game_time": time,
            "cancel_risk_score": max_score, "cancel_risk": risk, "worst_weather": worst,
            "message": msg}
