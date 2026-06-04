#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KBO 데일리 크롤러
- 수집: ① 팀 순위표 ② 타자 기록(전체 선수, 팀별) ③ 투수 기록(전체 선수, 팀별) ④ 어제 경기 결과/스코어
- 매일 1회 실행 권장 (Windows 작업 스케줄러 / cron)

★ 예전 크롤러가 "어느 날부터 갑자기 안 되는" 흔한 이유 3가지 방어:
  1) 세션 쿠키: KBO 기록 페이지는 ASP.NET 세션 쿠키가 있어야 표가 채워진다.
     → 홈을 먼저 1회 방문해 세션을 확보한 뒤 같은 세션으로 요청.
  2) 구조 변경: 컬럼이 바뀌면 즉시 에러로 알려주도록 검증.
  3) URL 변경: 과거 /TeamRank/TeamRank.aspx 는 죽음 → /Record/TeamRank/TeamRank.aspx 사용.

★ 선수 전체 수집 방법:
  - "전체 보기"는 규정타석/이닝 충족 선수만 보여줌(타자 50명 등). 비규정 선수는 빠짐.
  - 팀(ddlTeam)별로 필터하면 그 팀의 전 선수가 나옴 → 10개 팀 순회해서 합치면 전 선수(~300명).
  - 페이지 넘김: 페이저 버튼은 __doPostBack 링크 → __EVENTTARGET=...ucPager$btnNoN +
    직전 응답의 __VIEWSTATE/__EVENTVALIDATION을 함께 POST. (hfPage만 바꾸면 같은 페이지 반환됨)

★ 어제 경기(스코어)는 /ws/Schedule.asmx/GetScheduleList.
  form-urlencoded + 파라미터명 srIdList(srId 아님) + 헤더 X-Requested-With 이면 requests로 통과.

사용법:  python kbo_crawler.py
출력:    output/<데이터 기준일 YYYY-MM-DD>/*.json
         ※ 폴더명 = 그 데이터의 '경기 기준일'(마지막 경기일), 크롤한 날이 아님.
           예) 6/1 새벽 크롤 → 5/31 경기까지 반영 → output/2026-05-31/
         teamrank / hitters / pitchers  (그 날까지 시즌누적) +
         games / games_hitters / games_pitchers  (그 날 경기 결과·선수별)
         메타: {dataset, scope, as_of_game_date|game_date, collected_date, count, records[]}
         숫자는 숫자 타입, 빈값(&nbsp; 등)은 null.
"""
from __future__ import annotations
import os, sys, time, json, re, math, datetime, pathlib
import html as htmllib
from io import StringIO
import requests
import pandas as pd
from lxml import html as LH

BASE = "https://www.koreabaseball.com"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
REQUEST_DELAY = 1.5     # 대상 사이 간격(초)
PAGE_DELAY = 0.8        # 페이지/팀 넘김 간격(초)
MAX_PAGES = 50          # 팀당 페이지 폭주 방지 상한

# KBO 팀 코드 (ddlTeam) — 레거시 약자 주의: SS=삼성, HT=KIA, HH=한화, OB=두산, SK=SSG, LT=롯데, WO=키움
TEAM_CODES = ["LG", "KT", "SS", "HT", "HH", "OB", "NC", "SK", "LT", "WO"]

# (출력명, 경로, 표 식별 필수컬럼, 팀별순회 여부)
TARGETS = [
    ("teamrank", "/Record/TeamRank/TeamRank.aspx",          ["팀명", "승", "패"],  False),
    ("hitters",  "/Record/Player/HitterBasic/Basic1.aspx",  ["선수명", "AVG"],     True),
    ("pitchers", "/Record/Player/PitcherBasic/Basic1.aspx", ["선수명", "ERA"],     True),
]

SCHEDULE_API = "/ws/Schedule.asmx/GetScheduleList"
BOXSCORE_API = "/ws/Schedule.asmx/GetBoxScoreScroll"
KNOWN_PARKS = {"잠실", "고척", "문학", "수원", "대전", "대구",
               "창원", "사직", "광주", "울산", "포항", "청주", "마산"}
# gameId의 팀 약자 → 팀명
CODE2NAME = {"LG": "LG", "KT": "KT", "SS": "삼성", "HT": "KIA", "HH": "한화",
             "OB": "두산", "NC": "NC", "SK": "SSG", "LT": "롯데", "WO": "키움"}


def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s)
    s = htmllib.unescape(s)          # &nbsp;→\xa0, &amp;→& 등 엔티티 디코딩
    return re.sub(r"\s+", " ", s).strip()   # \xa0 등 공백 정리


def make_session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9"})
    s.get(BASE + "/", timeout=30).raise_for_status()
    return s


def _get(session, url) -> str:
    r = session.get(url, headers={"Referer": BASE + "/"}, timeout=40)
    r.raise_for_status()
    return r.content.decode("utf-8", "replace")


def _post(session, url, form) -> str:
    r = session.post(url, data=form, headers={"Referer": url}, timeout=40)
    r.raise_for_status()
    return r.content.decode("utf-8", "replace")


def coerce(v):
    """DB 친화: 빈값(''/'-'/nbsp)→None, 정수/실수 문자열→숫자, 나머지는 문자열."""
    if v is None or (isinstance(v, float) and math.isnan(v)):
        return None
    s = str(v).strip()
    if s in ("", "-", "nan", "None"):
        return None
    if re.fullmatch(r"-?\d+", s):
        return int(s)
    if re.fullmatch(r"-?\d*\.\d+", s):
        return float(s)
    return s


def save_json(path: pathlib.Path, df: pd.DataFrame, meta: dict) -> int:
    """DataFrame → {메타 + records[]} JSON 파일. 숫자는 숫자 타입, 빈값은 null."""
    records = [{k: coerce(v) for k, v in row.items()} for row in df.to_dict("records")]
    payload = {**meta, "count": len(records), "records": records}
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(records)


# ---------- ① ~ ③ 시즌 누적 기록 ----------
def _player_ids(text: str) -> list:
    """데이터 표(tData) 각 행의 선수 고유 playerId를 행 순서대로 추출.
    (선수 페이지에만 있음. 동명이인 구분용 — 순위표엔 없어서 [] 반환)"""
    try:
        doc = LH.fromstring(text)
    except Exception:
        return []
    for tbl in doc.xpath('//table[contains(@class,"tData")]'):
        ids, ok = [], True
        for tr in tbl.xpath('.//tbody/tr'):
            a = tr.xpath('.//a[contains(@href,"playerId")]')
            if not a:
                ok = False
                break
            m = re.search(r"playerId=(\d+)", a[0].get("href", ""))
            ids.append(m.group(1) if m else None)
        if ok and ids:
            return ids
    return []


def _table(text: str, required_cols: list[str]) -> pd.DataFrame:
    df = None
    for t in pd.read_html(StringIO(text)):
        cols = [str(c) for c in t.columns]
        if all(any(req in c for c in cols) for req in required_cols):
            df = t
            break
    if df is None:
        raise RuntimeError(f"필수 컬럼 {required_cols} 가진 표 없음 → 사이트 구조 변경 의심")
    # 선수 고유 ID 부착 (행 수가 맞을 때만 — 동명이인 안전 구분)
    ids = _player_ids(text)
    if ids and len(ids) == len(df):
        df = df.copy()
        df.insert(0, "playerId", ids)
    return df


def _form_fields(doc) -> dict:
    f = {}
    for inp in doc.xpath("//input[@name]"):
        f[inp.get("name")] = inp.get("value") or ""
    for sel in doc.xpath("//select[@name]"):
        opts = sel.xpath(".//option[@selected]") or sel.xpath(".//option")
        f[sel.get("name")] = opts[0].get("value", "") if len(opts) else ""
    return f


def _pager(doc):
    pages, cur = {}, None
    for a in doc.xpath('//a[contains(@id,"ucPager_btnNo")]'):
        txt = a.text_content().strip()
        if not txt.isdigit():
            continue
        m = re.search(r"__doPostBack\('([^']+)'", a.get("href", ""))
        if m:
            pages[int(txt)] = m.group(1)
        if "on" in (a.get("class") or ""):
            cur = int(txt)
    return pages, cur


def _collect_pages(session, url, required_cols, start_html) -> list[pd.DataFrame]:
    """현재 페이지(start_html)부터 페이저를 따라 끝까지 수집."""
    frames, visited, html = [], set(), start_html
    for _ in range(MAX_PAGES):
        doc = LH.fromstring(html)
        pages, cur = _pager(doc)
        cur = cur or 1
        if cur in visited:
            break
        visited.add(cur)
        frames.append(_table(html, required_cols))
        nxt = cur + 1
        if nxt not in pages:
            break
        form = _form_fields(doc)
        form["__EVENTTARGET"] = pages[nxt]
        form["__EVENTARGUMENT"] = ""
        time.sleep(PAGE_DELAY)
        html = _post(session, url, form)
    return frames


def fetch_record(session, path, required_cols, by_team) -> pd.DataFrame:
    url = BASE + path
    html = _get(session, url)
    if not by_team:
        frames = _collect_pages(session, url, required_cols, html)
    else:
        doc = LH.fromstring(html)
        team_field = next(se.get("name") for se in doc.xpath("//select[@name]")
                          if se.get("name").endswith("ddlTeam$ddlTeam"))
        base_form = _form_fields(doc)   # 초기 GET 폼을 팀 선택 기준값으로 재사용
        frames = []
        for code in TEAM_CODES:
            f = dict(base_form)
            f[team_field] = code
            f["__EVENTTARGET"] = team_field
            f["__EVENTARGUMENT"] = ""
            time.sleep(PAGE_DELAY)
            team_html = _post(session, url, f)
            frames += _collect_pages(session, url, required_cols, team_html)
    df = pd.concat(frames, ignore_index=True).drop_duplicates().reset_index(drop=True)
    if len(df) == 0:
        raise RuntimeError(f"행 0개 → 세션 문제 의심: {path}")
    return df


# ---------- ④ 어제 경기 결과 ----------
def parse_play(text: str):
    t = strip_html(text)
    m = re.match(r"^(.+?)\s+(\d+)\s+vs\s+(\d+)\s+(.+)$", t)
    if m:
        return m.group(1), int(m.group(2)), int(m.group(3)), m.group(4), "종료"
    m = re.match(r"^(.+?)\s+vs\s+(.+)$", t)
    if m:
        return m.group(1).strip(), None, None, m.group(2).strip(), "예정"
    return None


def fetch_games(session, target: datetime.date) -> pd.DataFrame:
    payload = {"leId": "1", "srIdList": "0,9,6",
               "seasonId": str(target.year), "gameMonth": f"{target.month:02d}", "teamId": ""}
    headers = {"X-Requested-With": "XMLHttpRequest",
               "Referer": BASE + "/Schedule/Schedule.aspx",
               "Accept": "application/json, text/javascript, */*; q=0.01"}
    r = session.post(BASE + SCHEDULE_API, data=payload, headers=headers, timeout=40)
    r.raise_for_status()
    rows = json.loads(r.text).get("rows", [])
    want = f"{target.month:02d}.{target.day:02d}"
    games, cur = [], ""
    for row in rows:
        cells = row["row"]
        if cells and cells[0].get("Class") == "day":
            cur = strip_html(cells[0]["Text"])
        if not cur.startswith(want):
            continue
        play = next((c for c in cells if c.get("Class") == "play"), None)
        if not play:
            continue
        parsed = parse_play(play["Text"])
        if not parsed:
            continue
        away, a_sc, h_sc, home, status = parsed
        tcell = next((c for c in cells if c.get("Class") == "time"), None)
        park = next((strip_html(c["Text"]) for c in cells if strip_html(c["Text"]) in KNOWN_PARKS), "")
        gid = ""
        for c in cells:
            m = re.search(r"gameId=([0-9A-Za-z]+)", c["Text"])
            if m:
                gid = m.group(1)
                break
        games.append({"날짜": target.isoformat(),
                      "시간": strip_html(tcell["Text"]) if tcell else "",
                      "원정팀": away, "원정점수": a_sc,
                      "홈팀": home, "홈점수": h_sc,
                      "구장": park, "상태": status, "gameId": gid})
    return pd.DataFrame(games)


# ---------- ⑤ 어제 경기 선수별 박스스코어 ----------
def _rows(js: str):
    return json.loads(js).get("rows", [])


def fetch_boxscore(session, gid: str):
    """한 경기(gameId)의 타자/투수 선수별 기록 → (hitters[list], pitchers[list])."""
    r = session.post(BASE + BOXSCORE_API,
                     data={"leId": "1", "srId": "0", "seasonId": gid[:4], "gameId": gid},
                     headers={"X-Requested-With": "XMLHttpRequest",
                              "Referer": BASE + "/Schedule/GameCenter/Main.aspx"}, timeout=40)
    r.raise_for_status()
    d = json.loads(r.text)
    teams = [CODE2NAME.get(gid[8:10], gid[8:10]), CODE2NAME.get(gid[10:12], gid[10:12])]
    hitters, pitchers = [], []
    for idx, el in enumerate(d.get("arrHitter", [])):
        t1, t3 = _rows(el["table1"]), _rows(el["table3"])
        for i in range(min(len(t1), len(t3))):
            c1 = [strip_html(c["Text"]) for c in t1[i]["row"]]
            c3 = [strip_html(c["Text"]) for c in t3[i]["row"]]
            if len(c1) < 3 or not c1[2] or len(c3) < 5:
                continue
            hitters.append({"gameId": gid, "팀": teams[idx], "타순": c1[0], "위치": c1[1], "선수명": c1[2],
                            "타수": c3[0], "안타": c3[1], "타점": c3[2], "득점": c3[3], "시즌타율": c3[4]})
    for idx, el in enumerate(d.get("arrPitcher", [])):
        for row in _rows(el["table"]):
            c = [strip_html(x["Text"]) for x in row["row"]]
            if len(c) < 17 or not c[0]:
                continue
            pitchers.append({"gameId": gid, "팀": teams[idx], "선수명": c[0], "등판": c[1], "결과": c[2],
                             "승": c[3], "패": c[4], "세": c[5], "이닝": c[6], "상대타자": c[7], "투구수": c[8],
                             "타수": c[9], "피안타": c[10], "홈런": c[11], "사사구": c[12], "삼진": c[13],
                             "실점": c[14], "자책": c[15], "평균자책": c[16]})
    return hitters, pitchers


def fetch_boxscores(session, games_df) -> tuple:
    """어제 종료된 모든 경기의 박스스코어를 모아 (hitters_df, pitchers_df) 반환."""
    H, P = [], []
    for _, g in games_df.iterrows():
        if g.get("상태") != "종료" or not g.get("gameId"):
            continue
        h, p = fetch_boxscore(session, g["gameId"])
        H += h
        P += p
        time.sleep(PAGE_DELAY)
    return pd.DataFrame(H), pd.DataFrame(P)


def find_last_games(session, yday: datetime.date, cached_df):
    """스냅샷 기준일 = 마지막으로 경기가 끝난 날. (그 날짜, 그 날 경기 DataFrame) 반환.
    어제(yday)에 경기 있으면 어제, 휴식일 등이면 그 전으로 거슬러 찾음(최대 10일)."""
    if cached_df is not None and len(cached_df) and (cached_df["상태"] == "종료").any():
        return yday, cached_df
    d = yday if cached_df is None else yday - datetime.timedelta(days=1)
    for _ in range(10):
        try:
            df = fetch_games(session, d)
        except Exception:
            df = None
        if df is not None and len(df) and (df["상태"] == "종료").any():
            return d, df
        d -= datetime.timedelta(days=1)
    return yday, (cached_df if cached_df is not None else pd.DataFrame())


def main() -> int:
    today = datetime.date.today()
    print(f"[{datetime.datetime.now():%H:%M:%S}] KBO 크롤 시작 (크롤일 {today})")
    session = make_session()
    ok = fail = 0

    # 데이터 기준일 = 마지막 경기일. 폴더명·메타 모두 이 날짜 기준 (크롤한 날 아님)
    yday = today - datetime.timedelta(days=1)
    try:
        cached = fetch_games(session, yday)
    except Exception as e:
        print(f"  [WARN] 어제 경기 조회 실패: {e}", file=sys.stderr)
        cached = None
    data_date, games_df = find_last_games(session, yday, cached)
    ddir = data_date.isoformat()
    # 출력 위치: 기본 data/crawling/, 컨테이너(읽기전용 FS)에선 CRAWL_DIR=/tmp/crawling 등으로 지정
    _base = os.environ.get("CRAWL_DIR") or str(pathlib.Path(__file__).resolve().parents[2] / "data" / "crawling")
    outdir = pathlib.Path(_base) / ddir
    outdir.mkdir(parents=True, exist_ok=True)
    print(f"  데이터 기준일: {ddir}  → {outdir}")

    # ① ~ ③ 시즌 누적 (기준일까지 반영)
    for name, path, req, by_team in TARGETS:
        try:
            df = fetch_record(session, path, req, by_team)
            n = save_json(outdir / f"{name}.json", df,
                          {"dataset": name, "scope": "season_cumulative",
                           "as_of_game_date": ddir, "collected_date": today.isoformat()})
            print(f"  [OK]   {name}: {n}건")
            ok += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}", file=sys.stderr)
            fail += 1
        time.sleep(REQUEST_DELAY)

    # ④ 그 날 경기 결과
    gmeta = {"dataset": "games", "scope": "single_day", "game_date": ddir,
             "collected_date": today.isoformat()}
    try:
        n = save_json(outdir / "games.json", games_df, gmeta)
        print(f"  [OK]   games({ddir}): {n}경기" if n else f"  [OK]   games({ddir}): 경기 없음")
        ok += 1
    except Exception as e:
        print(f"  [FAIL] games: {e}", file=sys.stderr)
        fail += 1

    # ⑤ 그 날 경기 선수별 박스스코어
    if len(games_df):
        try:
            hit_df, pit_df = fetch_boxscores(session, games_df)
            nh = save_json(outdir / "games_hitters.json", hit_df, {**gmeta, "dataset": "game_hitters"})
            npi = save_json(outdir / "games_pitchers.json", pit_df, {**gmeta, "dataset": "game_pitchers"})
            print(f"  [OK]   boxscore: 타자 {nh}명 / 투수 {npi}명")
            ok += 1
        except Exception as e:
            print(f"  [FAIL] boxscore: {e}", file=sys.stderr)
            fail += 1

    print(f"완료: 성공 {ok} / 실패 {fail}")
    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
