#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
선수 프로필 크롤 → MongoDB 'players' 컬렉션 (playerId 기준).

프로필(생년월일·포지션·경력·연봉 등)은 거의 안 변하므로 매일 돌릴 필요 없음.
hitters/pitchers 컬렉션의 playerId 중 'players'에 아직 없는 선수만 증분 수집한다.

사용법:
    python crawl_profiles.py            # players에 없는 신규 선수만
    python crawl_profiles.py --all      # 전체 재수집(갱신; 연봉 등 시즌초 갱신용)
    python crawl_profiles.py --limit 5  # 테스트용 N명만
환경변수 MONGO_URI / MONGO_DB 사용 (.env 자동 로드)
"""
import sys, os, re, time, pathlib
import requests
from lxml import html as LH
from pymongo import MongoClient

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
BASE = "https://www.koreabaseball.com"
# 타자/투수 상세 둘 다 같은 player_info를 보여줌 — 하나 안 되면 다른 걸로 폴백
DETAIL_URLS = [
    "/Record/Player/HitterDetail/Basic.aspx?playerId={}",
    "/Record/Player/PitcherDetail/Basic.aspx?playerId={}",
]
DELAY = 0.3

LABEL_MAP = {
    "선수명": "name", "등번호": "backNo", "생년월일": "birth", "포지션": "position",
    "신장/체중": "physical", "경력": "career", "입단 계약금": "signingBonus",
    "연봉": "salary", "지명순위": "draft", "입단년도": "debutYear",
}


def _load_dotenv(path: pathlib.Path):
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_ROOT = pathlib.Path(__file__).resolve().parents[2]
_load_dotenv(_ROOT / ".env")
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGO_DB", "kbo")


def _t(s: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", s.replace("&nbsp;", " "))).strip()


def _parse(cont) -> dict:
    prof = {}
    team = cont.xpath('.//h4[contains(@class,"team")]')
    if team:
        prof["team"] = _t(team[0].text_content())
    for li in cont.xpath('.//li[strong]'):
        strong = _t(li.xpath('./strong')[0].text_content())
        label = strong.rstrip(":").strip()
        full = _t(li.text_content())
        val = full[len(strong):].strip() if full.startswith(strong) else full.replace(strong, "", 1).strip()
        prof[LABEL_MAP.get(label, label)] = val
    if isinstance(prof.get("backNo"), str):
        m = re.search(r"\d+", prof["backNo"])
        if m:
            prof["backNo"] = int(m.group())
    return prof


def fetch_profile(session, pid) -> dict | None:
    for tmpl in DETAIL_URLS:
        try:
            r = session.get(BASE + tmpl.format(pid), headers={"Referer": BASE + "/"}, timeout=40)
            r.raise_for_status()
            doc = LH.fromstring(r.content.decode("utf-8", "replace"))
            conts = doc.xpath('//div[contains(@class,"player_info")]')
            if conts and conts[0].xpath('.//li[strong]'):
                prof = _parse(conts[0])
                if prof.get("name"):
                    prof["playerId"] = int(pid)
                    return prof
        except Exception:
            continue
    return None


def main() -> int:
    refresh_all = "--all" in sys.argv
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=8000)
    client.server_info()
    db = client[DB_NAME]

    ids = set()
    for coll in ["hitters", "pitchers"]:
        ids |= set(db[coll].distinct("playerId"))
    ids = {int(i) for i in ids if i is not None}
    if not refresh_all:
        ids -= set(int(i) for i in db["players"].distinct("playerId"))
    targets = sorted(ids)
    if limit:
        targets = targets[:limit]
    print(f"수집 대상: {len(targets)}명 ({'전체갱신' if refresh_all else '신규만'}{f', limit {limit}' if limit else ''})")

    sess = requests.Session()
    sess.headers.update({"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9"})
    sess.get(BASE + "/", timeout=30)

    ok = fail = 0
    for i, pid in enumerate(targets, 1):
        prof = fetch_profile(sess, pid)
        if prof:
            db["players"].update_one({"playerId": pid}, {"$set": prof}, upsert=True)
            ok += 1
        else:
            print(f"  [FAIL] playerId={pid} 프로필 없음", file=sys.stderr)
            fail += 1
        if i % 50 == 0:
            print(f"  ...{i}/{len(targets)}")
        time.sleep(DELAY)

    print(f"완료: 성공 {ok} / 실패 {fail} / players 총 {db['players'].count_documents({})}명")
    return 1 if fail and not ok else 0


if __name__ == "__main__":
    sys.exit(main())
