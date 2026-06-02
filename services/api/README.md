# KBO 백엔드 API (services/api)

FastAPI 백엔드. 프론트 ↔ **이 API** ↔ MongoDB(동적 기록) + PostgreSQL(유저·정적정보).
프론트는 DB·LLM에 직접 안 붙고 이 API만 호출한다.

## 설치
```bash
pip install -r requirements.txt
```

## 설정 (.env — 프로젝트 루트, git 제외)
`.env.example` 참고해서 값 채우기 (값은 팀 비공개 채널로 공유):
```
MONGO_URI=...        # MongoDB Atlas (동적 기록)
MONGO_DB=kbo
DATABASE_URL=...     # PostgreSQL (Supabase — 유저·정적정보)
JWT_SECRET=...       # 로그인 토큰 서명
```

## DB 테이블 생성 (PostgreSQL, 1회)
```bash
python setup_db.py      # users·visits·favorites + teams·glossary 등 11개 테이블
```

## 실행
```bash
uvicorn main:app --app-dir services/api --port 8000
```
→ http://127.0.0.1:8000/docs  (Swagger에서 바로 테스트)

## 엔드포인트
| 메서드 · 경로 | 설명 | DB |
|---|---|---|
| `GET /` | 헬스체크 | — |
| `POST /auth/register` `POST /auth/login` `GET /auth/me` | 회원가입·로그인(JWT)·내정보 | PG |
| `GET /standings` | 팀 순위표 | Mongo |
| `GET /hitters` `GET /pitchers` | 타자·투수 기록(team·limit) | Mongo |
| `GET /players/search?name=` | 선수 검색(동명이인) | Mongo |
| `GET /players/{id}` | 선수 프로필+스탯 | Mongo |
| `GET /games?date=` | 경기 결과 | Mongo |
| `GET /games/{gameId}/boxscore` | 경기별 선수기록 | Mongo |
| `GET /teams` `GET /teams/{code}` | 구단 목록·상세(역사·레전드) | PG |
| `GET /teams/{code}/persona` | 캐릭터 페르소나 | PG |
| `GET /glossary?q=` | 용어·약어 검색 | PG |
| `GET /stadiums/{code}` | 구장 안내 | PG |
| `POST /visits` `GET /visits` | 관람기록 저장·조회 (JWT) | PG |
| `GET /visits/stats` `GET /recommendations` | 통계·추천 (JWT) | PG |
| `POST /favorites` `GET /favorites` | 즐겨찾기 구단 (JWT) | PG |
| `POST /chat` | 챗봇 RAG+페르소나 | PG+Mongo+LLM |
| `GET /weather?stadium=` | 구장 날씨 | 기상청 |

> 정적정보(teams·glossary·persona·stadiums)는 **데이터 적재 전엔 빈 응답**. DBeaver/SQL로 채우면 자동 반영.
> `/chat`·`/weather`는 **스켈레톤** — `.env`에 `LLM_API_KEY` / `KMA_API_KEY` 넣어야 실제 동작.

## 파일
| 파일 | 역할 |
|---|---|
| `main.py` | 앱 + 동적기록(Mongo) 엔드포인트 + 라우터 연결 |
| `auth.py` | 인증 (bcrypt + JWT) |
| `info.py` · `visits.py` · `chat.py` · `weather.py` | 정적정보 · 관람기록 · 챗봇 · 날씨 라우터 |
| `db.py` / `db_pg.py` | MongoDB / PostgreSQL 연결 |
| `schema.sql` · `setup_db.py` | PostgreSQL 테이블 정의·생성 |

## 인증 사용법
1. `POST /auth/login` → `token` 받기
2. 보호 API(visits·favorites)는 헤더 `Authorization: Bearer <token>`
