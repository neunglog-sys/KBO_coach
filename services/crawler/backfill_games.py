#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""경기별 데이터 백필 — 크롤이 멈췄던 구간의 '그 날 경기' 데이터만 날짜별로 다시 수집.

kbo_crawler.py에 --date를 과거로 주면 안 되는 이유:
  팀 순위·타자·투수 시즌 누적 기록은 KBO 페이지가 '현재' 값만 보여줘서,
  과거 날짜 폴더에 오늘 기준 누적이 저장되고 그대로 적재되면 날짜별 이력이 오염된다.
그래서 여기서는 games / game_hitters / game_pitchers / game_scoreboards 만 만든다.

사용법:
    python backfill_games.py 2026-07-09 2026-09-12     # 시작일 종료일(포함)
    python ingest_mongo.py 2026-07-09                  # 이후 날짜별 적재 (또는 --ingest 옵션)
    python backfill_games.py 2026-07-09 2026-09-12 --ingest
"""
import datetime
import json
import os
import pathlib
import random
import subprocess
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import kbo_crawler as kc  # noqa: E402


def backfill_day(session, d: datetime.date, base: pathlib.Path) -> str:
    games_df = kc.fetch_games(session, d)
    if not len(games_df) or not (games_df["상태"] == "종료").any():
        return "경기 없음"
    ddir = d.isoformat()
    today = datetime.date.today().isoformat()
    outdir = base / ddir
    outdir.mkdir(parents=True, exist_ok=True)

    gmeta = {"dataset": "games", "scope": "single_day", "game_date": ddir, "collected_date": today}
    n = kc.save_json(outdir / "games.json", games_df, gmeta)

    hit_df, pit_df = kc.fetch_boxscores(session, games_df)
    nh = kc.save_json(outdir / "games_hitters.json", hit_df, {**gmeta, "dataset": "game_hitters"})
    npi = kc.save_json(outdir / "games_pitchers.json", pit_df, {**gmeta, "dataset": "game_pitchers"})

    sb_recs = kc.fetch_scoreboards(session, games_df).to_dict("records")
    for rec in sb_recs:
        rec["date"] = ddir
        rec["game_date"] = ddir
        rec["collected_date"] = today
    (outdir / "games_scoreboards.json").write_text(json.dumps(
        {"dataset": "game_scoreboards", "scope": "single_day", "game_date": ddir,
         "collected_date": today, "count": len(sb_recs), "records": sb_recs},
        ensure_ascii=False, indent=2), encoding="utf-8")
    return f"{n}경기 / 타자 {nh} / 투수 {npi} / 스코어보드 {len(sb_recs)}"


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        print(__doc__)
        return 2
    start, end = (datetime.date.fromisoformat(a) for a in args)
    ingest = "--ingest" in sys.argv
    base = pathlib.Path(kc.__file__).resolve().parents[2] / "data" / "crawling"
    session = kc.make_session()

    done, fail = [], []
    d = start
    while d <= end:
        try:
            msg = backfill_day(session, d, base)
            print(f"[{d}] {msg}", flush=True)
            if "경기 없음" not in msg:
                done.append(d.isoformat())
        except Exception as e:
            print(f"[{d}] 실패: {e}", file=sys.stderr, flush=True)
            fail.append(d.isoformat())
        time.sleep(kc.REQUEST_DELAY + random.uniform(0, 1.0))
        d += datetime.timedelta(days=1)

    print(f"\n수집 완료: 경기일 {len(done)}일 / 실패 {len(fail)}일 {fail if fail else ''}", flush=True)
    if ingest:
        ingester = pathlib.Path(__file__).resolve().parent / "ingest_mongo.py"
        for ddir in done:
            # 인코딩 명시 필수 — 윈도우 기본(cp949)으로 한글 출력을 읽다 실패하면 stdout이 None이 된다
            r = subprocess.run([sys.executable, str(ingester), ddir], capture_output=True, text=True,
                               encoding="utf-8", errors="replace",
                               env={**os.environ, "PYTHONIOENCODING": "utf-8"})
            last = ((r.stdout or "").strip().splitlines() or ["(출력 없음)"])
            print(f"  적재 {ddir}: {'OK' if r.returncode == 0 else '실패'} {last[0][:60]}", flush=True)
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
