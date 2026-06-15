# -*- coding: utf-8 -*-
"""내부 트리거 엔드포인트 — Cloud Scheduler가 호출. 시크릿 헤더(INTERNAL_TOKEN)로 보호.

크롤·알림 스크립트를 subprocess로 실행 → 스크립트의 경로 가정·argv를 그대로 유지(컨테이너 호환).
크롤 출력은 CRAWL_DIR=/tmp/crawling(읽기전용 FS 회피)로 지정해서 배포.
"""
import os
import sys
import subprocess
import pathlib
import datetime

from fastapi import APIRouter, Header, HTTPException, Query

from db_pg import get_conn
from session_metrics import completion_rate

router = APIRouter(prefix="/internal", tags=["internal"])

_ROOT = pathlib.Path(__file__).resolve().parents[2]           # repo root (컨테이너=/workspace)
_CRAWLER = _ROOT / "services" / "crawler"
_TOKEN = os.environ.get("INTERNAL_TOKEN")


def _auth(token: str):
    if not _TOKEN or token != _TOKEN:
        raise HTTPException(status_code=401, detail="unauthorized")


def _run(script: str, timeout: int, args: list[str] | None = None) -> dict:
    p = subprocess.run([sys.executable, str(_CRAWLER / script)] + (args or []),
                       cwd=str(_ROOT), capture_output=True, text=True, timeout=timeout)
    out = (p.stdout or "") + (("\n[stderr]\n" + p.stderr) if p.returncode else "")
    return {"script": script, "returncode": p.returncode, "tail": out[-1500:]}


@router.get("/completion-rate")
def get_completion_rate(x_internal_token: str = Header(default="")):
    """세션 완료율(텍스트·음성 채팅) 집계 — session_metrics가 기록한 시작/정상종료 이벤트 기준."""
    _auth(x_internal_token)
    return completion_rate()


@router.post("/notify")
def run_notify(test: int = Query(default=0), x_internal_token: str = Header(default="")):
    """경기 임박 알림 1회 실행 (Scheduler가 1~2분마다 호출). test=1이면 윈도우 무시 즉시 발송(점검용)."""
    _auth(x_internal_token)
    return _run("notify_games.py", timeout=110, args=["--test"] if test else None)


@router.post("/lineup")
def run_lineup(date: str | None = Query(default=None), x_internal_token: str = Header(default="")):
    """당일 선발 라인업 크롤 → Mongo kbo.lineups upsert.
    Scheduler가 하루 3회(13:00/16:00/17:30 KST) 호출 — 주말 14·17시, 평일 18:30 경기를
    각각 시작 ~1시간 전에 수집. upsert라 중복 호출 안전. date(YYYYMMDD) 지정 시 그 날짜."""
    _auth(x_internal_token)
    return _run("crawl_lineup.py", timeout=120, args=[date] if date else None)


@router.post("/crawl")
def run_crawl(date: str | None = Query(default=None), x_internal_token: str = Header(default="")):
    """데일리 크롤 파이프라인: 크롤 → 적재 → 프로필 → 대진표.
    date(YYYY-MM-DD) 지정 시 그 날을 기준일로 크롤(경기 종료 직후 야간 트리거용). 미지정=어제(정기 9시 백업).
    백업(date 없음) 호출은 그 날 크롤이 이미 성공했으면(crawl_done 마커) 건너뜀."""
    _auth(x_internal_token)
    datadate = date or (datetime.date.today() - datetime.timedelta(days=1)).isoformat()
    done_key = f"crawl_done_{datadate}"

    # 정기 백업 호출만 중복 체크 — 야간 트리거(date 지정)는 notify가 이미 1회 게이트했으니 그대로 진행.
    if date is None:
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1 FROM notified_events WHERE event_key = %s", (done_key,))
                if cur.fetchone():
                    return {"ok": True, "skipped": f"already crawled {datadate}"}
        finally:
            conn.close()

    steps = []
    for s in ("kbo_crawler.py", "ingest_mongo.py", "crawl_profiles.py", "crawl_schedule.py"):
        args = [f"--date={date}"] if (date and s == "kbo_crawler.py") else None
        r = _run(s, timeout=540, args=args)
        steps.append(r)
        if r["returncode"] != 0:
            break   # 실패 시 중단

    ok = all(s["returncode"] == 0 for s in steps)
    if ok:   # 성공했을 때만 마커 기록 → 실패 시 9시 백업이 다시 시도
        conn = get_conn()
        try:
            with conn, conn.cursor() as cur:
                cur.execute("INSERT INTO notified_events (event_key) VALUES (%s) ON CONFLICT DO NOTHING",
                            (done_key,))
        finally:
            conn.close()
    return {"ok": ok, "date": datadate, "steps": steps}
