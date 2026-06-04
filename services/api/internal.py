# -*- coding: utf-8 -*-
"""내부 트리거 엔드포인트 — Cloud Scheduler가 호출. 시크릿 헤더(INTERNAL_TOKEN)로 보호.

크롤·알림 스크립트를 subprocess로 실행 → 스크립트의 경로 가정·argv를 그대로 유지(컨테이너 호환).
크롤 출력은 CRAWL_DIR=/tmp/crawling(읽기전용 FS 회피)로 지정해서 배포.
"""
import os
import sys
import subprocess
import pathlib

from fastapi import APIRouter, Header, HTTPException, Query

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


@router.post("/notify")
def run_notify(test: int = Query(default=0), x_internal_token: str = Header(default="")):
    """경기 임박 알림 1회 실행 (Scheduler가 1~2분마다 호출). test=1이면 윈도우 무시 즉시 발송(점검용)."""
    _auth(x_internal_token)
    return _run("notify_games.py", timeout=110, args=["--test"] if test else None)


@router.post("/crawl")
def run_crawl(x_internal_token: str = Header(default="")):
    """데일리 크롤 파이프라인: 크롤 → 적재 → 프로필 → 대진표 (Scheduler가 1일 1회 호출)."""
    _auth(x_internal_token)
    steps = []
    for s in ("kbo_crawler.py", "ingest_mongo.py", "crawl_profiles.py", "crawl_schedule.py"):
        r = _run(s, timeout=540)
        steps.append(r)
        if r["returncode"] != 0:
            break   # 실패 시 중단
    return {"ok": all(s["returncode"] == 0 for s in steps), "steps": steps}
