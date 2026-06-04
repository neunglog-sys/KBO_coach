# KBO 데일리 크롤러 (services/crawler)

KBO 기록을 매일 수집해 JSON으로 저장하고 MongoDB(Atlas)에 적재한다.
(KBO 공식 API 없음 → 공개 페이지 크롤링. 비상업·학습 목적.)

## 수집 항목

- **시즌 누적**: 팀 순위(`teamrank`), 타자(`hitters`), 투수(`pitchers`)
- **그 날 경기**: 결과(`games`), 타자별·투수별 박스스코어(`game_hitters`, `game_pitchers`)
- **선수 프로필**: `players` (생년월일·포지션·신장체중·경력·연봉·지명 등, playerId 기준)

## 스크립트

| 파일 | 역할 |
|---|---|
| `kbo_crawler.py` | 크롤 → `data/crawling/<기준일>/*.json` |
| `ingest_mongo.py` | 위 JSON → MongoDB `kbo` 적재(upsert) |
| `crawl_profiles.py` | 선수 프로필 → `players` 컬렉션 (신규 선수만 증분) |
| `run_daily.bat` | 위 3개를 순서대로 실행 (스케줄러용, 호스트 전용·git 미포함) |

## 설치

```bash
pip install -r requirements.txt
```

## 설정

프로젝트 루트에 `.env` 생성 (`.env.example` 참고):

```
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0
MONGO_DB=kbo
```

> `.env`는 git에 안 올라감. URI는 팀 채널로 공유받아 각자 생성. `pymongo[srv]` 필요(srv 주소).

## 실행

```bash
python kbo_crawler.py       # 크롤 → data/crawling/<기준일>/*.json
python ingest_mongo.py      # 위 JSON → MongoDB upsert
python crawl_profiles.py    # 선수 프로필 → players (신규만; --all 전체 재수집)
```

- 폴더명 = **데이터 기준일(마지막 경기일)**, 크롤한 날 아님.
- 선수는 **playerId**로 식별 → 같은 팀 동명이인(예: 이승현/삼성)도 안전하게 구분.
- JSON 메타: `{dataset, scope, as_of_game_date|game_date, collected_date, count, records[]}`, 숫자는 숫자 타입·빈값은 null.

## 자동화

Windows 작업 스케줄러 `KBO_Daily_Crawl` — 매일 09:00 `run_daily.bat` 실행 = **크롤 → MongoDB 적재 → 선수 프로필(신규만)** 한 번에.

- 로그: `logs/kbo_daily.log` (매 실행 덮어씀, git 제외)
- 아침 9시인 이유: 평일 야간경기·연장까지 전날 데이터가 다 확정된 뒤라 안전.
- `run_daily.bat`은 호스트 PC 전용(파이썬 경로 하드코딩)이라 git 미포함.

## 크롤 실패 시 대처 (장애 대응)

**1) 로그부터 확인** — `logs/kbo_daily.log`. CRAWL / INGEST / PROFILES 중 **어디서 / 무슨 에러**인지 나옴.

**2) 대부분은 재실행하면 끝** (일시적 네트워크·타임아웃):

```bash
python services/crawler/kbo_crawler.py     # 크롤만
python services/crawler/ingest_mongo.py    # 적재만
# 또는 run_daily.bat 전체 재실행
```

> ⭐ **재실행은 항상 안전** — 날짜 폴더 + upsert 구조라 중복 안 생기고 덮어씀. 실패하면 부담 없이 다시 돌리면 됨.

**3) 증상별 원인·대처**

| 로그 증상 | 원인 | 대처 |
|---|---|---|
| `필수 컬럼 … 표 없음 / 구조 변경 의심` | KBO 페이지 구조 변경 | 크롤러 파싱 수정 필요 → 크롤러 담당에게 |
| 빈 테이블 / `검색 결과가 없습니다` | 세션 쿠키 문제 | 재실행(홈 먼저 방문하게 돼있음). 계속되면 KBO 차단 의심 |
| ingest 연결 실패 / timeout | Atlas 인터넷·IP·URI | `.env` MONGO_URI, Atlas Network Access(`0.0.0.0/0`), 인터넷 확인 |
| 작업이 아예 안 돎 | 09:00에 PC 꺼져있었음 | `StartWhenAvailable`이라 PC 켜지면 자동 실행. 작업스케줄러 `LastTaskResult`(0=성공) 확인 |

**4) 못 받은 날 복구**

- 순위·선수 **누적기록**은 항상 "최신 상태" → **오늘 다시 돌리면 자동 복구**(어제까지 반영된 값이 들어옴).
- 특정 **과거 날짜의 경기결과·박스스코어**를 놓쳤으면 → 그 날짜로 별도 재크롤 필요 (현재 크롤러는 '마지막 경기일' 자동 처리).

**5) 에스컬레이션**

- 구조 변경(파싱 에러) → 크롤러 담당자에게. 일시적 에러 → 그냥 재실행, 보고 불필요.

## 비고

- 매일 쌓이는 `data/crawling/<날짜>/`는 git에 올리지 않음 — **원본(source of truth)은 MongoDB**.
- 경기 박스스코어(`game_*`)엔 playerId가 없어 players와는 이름+팀으로 연결(동명이인만 주의).
