# KBO 백엔드 API (services/api)

앱 ↔ **이 API** ↔ MongoDB Atlas. 데이터 제공 (+ 추후 RAG 챗봇).
프론트(코틀린/웹 등)는 이 API의 JSON만 소비 — 프론트 스택과 무관하게 개발 가능.

## 설치 & 실행
```bash
pip install -r services/api/requirements.txt
uvicorn main:app --reload --app-dir services/api
```
→ http://127.0.0.1:8000/docs  (자동 API 문서 Swagger, 여기서 바로 테스트)

## 엔드포인트 (현재)
| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/` | 헬스체크 (서버+DB 연결) |
| GET | `/standings` | 팀 순위표 (최신) |
| GET | `/hitters?team=LG&limit=10` | 타자 기록 (타율순) |
| GET | `/players/{playerId}` | 선수 프로필 + 시즌 스탯 |
| GET | `/games?date=2026-05-31` | 경기 결과 |

## 설정
DB 접속은 루트 `.env`의 `MONGO_URI` / `MONGO_DB` 사용 (git 제외).

## 다음 단계
- `POST /chat` : RAG(지식+스탯 검색) + 구단 페르소나 LLM 응답
