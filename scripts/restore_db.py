# -*- coding: utf-8 -*-
"""DB 전체 복구 — 빈 PostgreSQL(신규 Supabase 프로젝트)에 스키마와 콘텐츠를 한 번에 올린다.

배경: 원래 Supabase 프로젝트가 삭제되면서(2026-09 확인) 콘텐츠 테이블이 통째로 사라졌다.
      teams·glossary·rules·umpire_signals는 평가 로그(docs/eval/responses.json)의 rag_context에
      찍혀 있던 실제 행을 역추출해 되살렸고, 페르소나는 컨펌본 5팀 + 신규 작성 5팀이다.

사용법:
    python scripts/restore_db.py            스키마 + 시드 적재
    python scripts/restore_db.py --embed    적재 후 임베딩 백필까지 (Gemini 키 필요)

.env의 DATABASE_URL을 쓴다. 모든 단계가 멱등이라 다시 돌려도 안전하다.
"""
import os
import pathlib
import subprocess
import sys
from urllib.parse import urlparse

import psycopg2

ROOT = pathlib.Path(__file__).resolve().parents[1]
API = ROOT / "services" / "api"
KB = ROOT / "data" / "knowledge-base"

# 적재 순서 고정: 스키마 → teams(FK 부모) → 나머지 콘텐츠.
# cheering·legends가 teams를 참조하므로 teams가 먼저 들어가야 한다.
STEPS = [
    ("스키마", API / "schema.sql"),
    ("게시판 스키마", API / "board_schema.sql"),
    ("푸시 스키마", API / "push_schema.sql"),
    ("구단 기본팩트", KB / "seed_teams.sql"),
    ("구단 페르소나", KB / "seed_personas.sql"),
    ("용어 사전", KB / "seed_glossary.sql"),
    ("규칙", KB / "seed_rules.sql"),
    ("심판 수신호", KB / "seed_umpire_signals.sql"),
    ("구단문화 청크", KB / "insert_kbo_culture_chunks.sql"),
    ("청크 추가분", KB / "seed_chunks_extra.sql"),
    ("구단문화 프로필", KB / "insert_team_culture_profiles.sql"),
    ("응원 문화", KB / "insert_cheering_from_kbo_culture.sql"),
    # ── 구글 드라이브 팀 원본 문서에서 파싱한 것 ──
    ("구장 안내", KB / "seed_stadiums.sql"),
    ("구장 특징 보정", ROOT / "scripts" / "update_stadium_features.sql"),
    ("기아 교통 보정", ROOT / "scripts" / "update_kia_transportation.sql"),
    ("삼성 버스 중복 제거", ROOT / "scripts" / "remove_samsung_duplicate_bus_info.sql"),
    ("레전드 선수", KB / "seed_legends.sql"),
    ("용어 보강·카테고리 교정", KB / "seed_glossary_extra.sql"),
    ("규칙 보강", KB / "seed_rules_extra.sql"),
    ("퀴즈 기본 문제", KB / "seed_quiz.sql"),
]

COUNTS = ["teams", "team_personas", "glossary", "rules", "umpire_signals",
          "knowledge_chunks", "team_culture_profiles", "cheering",
          "legends", "stadiums", "quiz"]


def _load_env():
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main():
    _load_env()
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit(".env에 DATABASE_URL이 없다 (새 Supabase 프로젝트 연결 문자열).")
    u = urlparse(url)
    print(f"대상 DB: {u.hostname}/{u.path.lstrip('/')}")

    # db_pg.py와 같은 방식(URL 파싱 → 키워드 인자) — 비밀번호 특수문자에 안전
    conn = psycopg2.connect(host=u.hostname, port=u.port or 5432, user=u.username,
                            password=u.password, dbname=u.path.lstrip("/"))
    conn.autocommit = True
    cur = conn.cursor()

    # DB 기본 타임존 KST — Supabase 기본값 UTC라 created_at이 9시간 밀리던 버그(docs/fix-timezone-kst.sql).
    # 그 파일의 기존행 +9h 보정부는 psql 전용 문법이고 빈 DB엔 불필요해서 ALTER만 적용한다.
    cur.execute("ALTER DATABASE postgres SET timezone = 'Asia/Seoul'")
    cur.execute("ALTER ROLE postgres SET timezone = 'Asia/Seoul'")
    print("  적용: DB 기본 타임존 Asia/Seoul")

    for label, path in STEPS:
        if not path.exists():
            print(f"  건너뜀 (파일 없음): {label} — {path.name}")
            continue
        cur.execute(path.read_text(encoding="utf-8"))
        print(f"  적용: {label} ({path.name})")

    print("\n적재 결과")
    for t in COUNTS:
        try:
            cur.execute(f"SELECT count(*) FROM {t}")
            print(f"  {t:<22} {cur.fetchone()[0]:>5}행")
        except Exception as e:          # 테이블이 없으면 이유만 찍고 계속
            conn.rollback()
            print(f"  {t:<22} 조회 실패: {str(e).splitlines()[0]}")
    conn.close()

    if "--embed" in sys.argv:
        print("\n임베딩 백필 (knowledge_chunks·glossary·rules)")
        subprocess.run([sys.executable, "embed_chunks.py"], cwd=API, check=True)
    else:
        print("\n다음: python services/api/embed_chunks.py  (벡터검색용 임베딩 백필)")


if __name__ == "__main__":
    main()
