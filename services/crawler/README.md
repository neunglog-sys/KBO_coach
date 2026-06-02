# KBO 데일리 크롤러 (services/crawler)

KBO 기록을 매일 수집해 JSON으로 저장하고 MongoDB에 적재한다.
(KBO 공식 API 없음 → 공개 페이지 크롤링. 비상업·학습 목적.)

## 수집 항목
- **시즌 누적**: 팀 순위(`teamrank`), 타자(`hitters`), 투수(`pitchers`)
- **그 날 경기**: 결과(`games`), 타자별·투수별 박스스코어(`game_hitters`, `game_pitchers`)

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
> `.env`는 git에 안 올라감. URI는 팀 채널로 공유받아 각자 생성.

## 실행
```bash
python kbo_crawler.py     # 크롤 → data/crawling/<기준일>/*.json
python ingest_mongo.py    # 위 JSON → MongoDB(kbo) upsert
```
- 폴더명 = **데이터 기준일(마지막 경기일)**, 크롤한 날 아님.
- 선수는 **playerId**로 식별 → 같은 팀 동명이인(예: 이승현/삼성)도 안전하게 구분.
- JSON 메타: `{dataset, scope, as_of_game_date|game_date, collected_date, count, records[]}`, 숫자는 숫자 타입·빈값은 null.

## 자동화
Windows 작업 스케줄러 `KBO_Daily_Crawl` — 매일 09:00 크롤 자동 실행.
(아침 9시인 이유: 평일 야간경기·연장까지 전날 데이터가 다 확정된 뒤라 안전)
적재는 현재 수동(`python ingest_mongo.py`).

## 비고
- 매일 쌓이는 `data/crawling/<날짜>/`는 git에 올리지 않음 — **원본(source of truth)은 MongoDB**.
