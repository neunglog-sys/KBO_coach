# KBO 야구 챗봇 — 시스템 아키텍처

> 야구 초보 관람객용 도우미 챗봇. 10개 구단 캐릭터(페르소나)가 야구 규칙·용어·기록을 쉽게 설명.

## 1. 한눈에 보기

```
        프론트엔드 (앱/웹 — 미정)
             │   HTTPS (JSON + JWT 토큰)
             ▼
   ┌──────────────────────────────────────────┐
   │   FastAPI 백엔드  (services/api)            │
   └──┬───────────────┬───────────────────┬────┘
      │ 읽기           │ 읽기/쓰기          │ 호출
      ▼               ▼                   ▼
  MongoDB Atlas    PostgreSQL           LLM API
  (동적 야구기록)   (정적 야구정보+유저+RAG)  (페르소나 응답)
      ▲
      │ 매일 09:00 자동 적재
  크롤러 (services/crawler) ←─ KBO 사이트 크롤
```

**핵심 원칙: 프론트는 DB·LLM에 직접 접속하지 않는다.** 무조건 백엔드(FastAPI)를 거친다 (보안 + 비밀키 보호).

---

## 2. DB 분담 — 데이터 성격에 맞게 (Polyglot Persistence)

### 🍃 MongoDB Atlas — 동적 야구 기록 (매일 변함)
- **왜**: 매일 크롤링으로 스냅샷이 쌓이고, JSON 구조에 스키마 유연.
- **컬렉션**: `teamrank` `hitters` `pitchers` `games` `game_hitters` `game_pitchers` `players`
- **적재**: 크롤러가 **매일 09:00 자동** (크롤 → 적재 → 프로필). 백엔드는 **읽기 위주**.
- **연결**: `.env`의 `MONGO_URI`

### 🐘 PostgreSQL — 정적 야구정보 + 유저 + RAG (RDB 요구사항 충족)
거의 안 변하고 관계형인 데이터 + 유저/거래성 데이터.

**(a) 정적 야구 정보** — 팀이 수집·정리 중
| 테이블 | 핵심 컬럼 |
|---|---|
| `teams` | team_id(PK), code, name, city, founded, championships, history |
| `legends` | legend_id(PK), team_id(FK), name, position, era, note |
| `team_personas` | team_id(PK,FK), char_name, personality, tone, dialect |
| `rules` | rule_id(PK), topic, content |
| `glossary` | term_id(PK), term, abbr, category, definition |
| `umpire_signals` | signal_id(PK), name, meaning, description |
| `cheering` | id(PK), team_id(FK), type, description |
| `stadiums` | stadium_id(PK), team_id(FK), name, location, parking, subway, food |

**(b) 유저 데이터**
| 테이블 | 핵심 컬럼 | 관계 |
|---|---|---|
| `users` | user_id(PK), email(UNIQUE), password_hash, nickname | |
| `visits` | visit_id(PK), user_id(FK), visit_date, game_id, team_code, memo | users 1—N |
| `favorites` | user_id(FK), team_code, PK(user_id, team_code) | users N—M teams |
| `reviews`(선택) | review_id(PK), user_id(FK), game_id, rating, content | |

**(c) RAG 벡터** — `pgvector` 확장
| `knowledge_chunks` | id(PK), source, content, **embedding vector** | 룰·용어·구단역사 임베딩 → 의미 검색 |

- **연결**: `.env`의 `DATABASE_URL`
- 정적 정보를 RDB에 두면 → 야구 정보가 DB에 들어가고 + **RDB가 풍성(테이블·관계·조인 많음)해 요구사항에 잘 부합**.

### DB 간 참조
`visits.game_id`가 가리키는 경기는 **MongoDB**에 있음 → Postgres엔 game_id **값만 저장**, 백엔드가 필요시 Mongo에서 조회해 합침 (**앱 레벨 조인**, DB 간 FK 없음 — 폴리글랏에선 정상).

---

## 3. API 엔드포인트 (어느 DB 쓰는지 포함)

표시: ✅완성 · 🔵MVP · 🟡나중

| 메서드 · 경로 | 설명 | DB |
|---|---|---|
| **인증** | | |
| `POST /auth/register` | 회원가입 (비번 bcrypt 해시) | 🔵 PG |
| `POST /auth/login` | 로그인 → JWT 발급 | 🔵 PG |
| `GET /auth/me` | 내 정보 (토큰 필요) | 🔵 PG |
| **동적 기록** | | |
| `GET /standings` | 팀 순위표 | ✅ Mongo |
| `GET /hitters` `GET /pitchers` | 타자·투수 기록 | ✅/🔵 Mongo |
| `GET /players/{id}` | 선수 프로필+스탯 | ✅ Mongo |
| `GET /players/search?name=` | 선수 검색(동명이인) | 🔵 Mongo |
| `GET /games?date=` | 경기 결과 | ✅ Mongo |
| `GET /games/{gameId}/boxscore` | 경기별 선수 기록 | 🔵 Mongo |
| **정적 정보** | | |
| `GET /teams` `GET /teams/{id}` | 구단 목록·상세(역사·레전드) | 🔵 PG |
| `GET /teams/{id}/persona` | 캐릭터 말투·성격 설정 | 🔵 PG |
| `GET /glossary?q=` | 용어·약어 검색 | 🔵 PG |
| `GET /stadiums/{id}` | 구장 안내 | 🟡 PG |
| **챗봇 ★핵심** | | |
| `POST /chat` | 질문 → RAG + 페르소나 LLM 답변 | 🔵 PG+Mongo+LLM |
| **관람기록/부가** | | |
| `POST /visits` `GET /visits` | 관람기록 저장·조회 | 🔵 PG (+Mongo 조인) |
| `GET /visits/stats` `GET /recommendations` | 통계·추천 | 🟡 PG |
| `POST /favorites` `GET /favorites` | 즐겨찾기 구단 | 🟡 PG |
| `GET /weather?stadium=` | 구장 날씨·우천취소 | 🟡 기상청 API |

---

## 4. LLM 호출 흐름 — `POST /chat` (RAG + 페르소나) ★

```
POST /chat  { question, teamId(페르소나), sessionId }
  │
  1) 질문 분석 — 무엇을 묻나? (기록/숫자 · 규칙/용어 · 잡담/범위밖)
  │
  2) 검색 (RAG / 데이터 수집)
     ├─ 숫자·기록 질문   → MongoDB 정형 쿼리로 "정확한 값" (함수/툴 호출)
     │                     예: "오스틴 타율?" → db.hitters 조회
     ├─ 규칙·용어·구단정보 → PostgreSQL: 정형 조회(glossary/teams)
     │                     + knowledge_chunks 벡터검색(pgvector)
     └─ 페르소나 설정      → PostgreSQL team_personas (말투·성격·사투리)
  │
  3) 컨텍스트 조립 = (검색 결과) + (구단 페르소나)
  │
  4) LLM API 호출
     - system: 페르소나 + "초보자에게 쉽게 비유로"
               + 안전 규칙(모르면 모른다 / 야구 무관 질문은 선 긋기)
     - user: 질문 + 2)에서 모은 컨텍스트
  │
  5) 응답 반환 { answer, persona, sources }
```

### ⭐ 핵심 설계 원칙 (평가지표와 직결)
1. **숫자는 DB에서, 설명은 LLM이.** 선수 기록·순위 숫자는 LLM이 지어내지 않고 **DB 쿼리(함수호출)로 정확한 값**을 받아 전달 → 환각 방지. (= "설명 정확성")
2. **글 지식은 벡터검색(RAG).** 룰·용어·구단역사를 `knowledge_chunks`에 임베딩, 의미 검색으로 관련 내용만 LLM에 전달. (pgvector)
3. **페르소나·안전성은 system 프롬프트.** 캐릭터 말투 유지(페르소나 일관성), 모르는 건 솔직히/야구 무관 질문 거절(응답 거절 적절성).

> LLM 제공자는 교체 가능(Claude / OpenAI 등). API 키는 `.env`(`LLM_API_KEY`). 기법은 제공자 무관.

---

## 5. 로그인/인증 흐름 (PostgreSQL + JWT)

```
회원가입: POST /auth/register → 비번 bcrypt 해시 → users INSERT
로그인:   POST /auth/login → 비번 검증 → JWT 토큰 발급
보호 API: 헤더 Authorization: Bearer <JWT> → 백엔드 검증 → user_id 확보
          (visits, favorites 등 유저별 API는 토큰 필요)
```
- 비번 평문 저장 X → **bcrypt 해시**(passlib) · 토큰 **JWT**(python-jose), 시크릿은 `.env`

---

## 6. 환경변수 / 보안 (`.env` — git 제외)

```
MONGO_URI=mongodb+srv://...        # MongoDB Atlas (동적 기록)
DATABASE_URL=postgresql://...      # PostgreSQL (정적 정보 + 유저 + 벡터)
LLM_API_KEY=...                    # LLM 제공자 키
JWT_SECRET=...                     # 토큰 서명용
```
- `.env`는 깃에 안 올림(.gitignore). 팀 공유는 `.env.example` + 값은 비공개 채널.
- 모든 비밀키·DB접속은 **백엔드에만**. 프론트엔 두지 않음.

---

## 7. 폴더 매핑

| 폴더 | 역할 |
|---|---|
| `services/api` | FastAPI 백엔드 (이 문서의 API 전부) |
| `services/crawler` | KBO 크롤러 + Mongo 적재 (매일 09:00) |
| `services/ai-rag` | RAG·LLM 로직 (또는 api 내부) |
| `data/crawling` | 크롤 결과 JSON (원본은 Mongo) |
| `data/knowledge-base` | 정적 지식 원본(룰·용어·구단) → Postgres 적재 + 임베딩 소스 |
| `apps/android`, `apps/web` | 프론트엔드 |

---

## 8. 데이터 인벤토리 (수집/제작 필요)

- **동적 야구기록** (MongoDB) — 크롤러 자동 ✅
- **정적 야구정보** (PostgreSQL) — 팀 수집 중:
  - 구단 정보(연고지·창단·우승·역사·레전드)
  - 구단 페르소나(말투·성격·사투리)
  - 야구 규칙(경기 흐름·이닝·포지션)
  - 용어·약어 사전(ERA·OPS·타율…) ⭐핵심
  - 심판 수신호
  - 응원 문화(방식만, 가사 X)
  - 구장 안내(위치·주차·먹거리)
- **평가용**(제작): 룰·용어 테스트셋 50문항 / 입문자 예상질문 / 범위밖 질문셋
- **서브**: 날씨(기상청 API), 음성(STT/TTS)

## 9. MVP 우선순위
1. 인증(`/auth/*`) + PostgreSQL 셋업
2. 정적 정보 적재(teams·glossary·personas…) + 임베딩(`knowledge_chunks`)
3. 챗봇(`POST /chat`) — 프로젝트 핵심
4. 데이터 조회 API (Mongo 쪽 대부분 완성)
5. 관람기록(`/visits`) + 추천
6. (나중) 구장·날씨·음성
