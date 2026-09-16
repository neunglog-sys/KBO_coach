-- KBO 챗봇 — PostgreSQL 스키마 (유저/관람기록)
-- 정적 야구정보 테이블(teams, glossary 등)은 데이터 수집 후 추가 예정.

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    fav_team_code VARCHAR(4),
    gender VARCHAR(8) CHECK (gender IS NULL OR gender IN ('man', 'girl')),
    buddy_nickname VARCHAR(10),
    is_guest BOOLEAN NOT NULL DEFAULT FALSE,
    guest_expires_at TIMESTAMPTZ,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_guest_expiry
    ON users (guest_expires_at)
    WHERE is_guest = TRUE;

CREATE TABLE IF NOT EXISTS visits (
    visit_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    game_id VARCHAR(20), -- MongoDB games의 gameId 참조(값만)
    team_code VARCHAR(4),
    stadium VARCHAR(50),
    memo TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    team_code VARCHAR(4) NOT NULL,
    PRIMARY KEY (user_id, team_code)
);

CREATE INDEX IF NOT EXISTS idx_visits_user ON visits (user_id);

CREATE TABLE IF NOT EXISTS my_baseball_records (
    record_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
    record_date DATE NOT NULL,
    game_id VARCHAR(20),
    team_code VARCHAR(4),
    stadium VARCHAR(50),
    mood VARCHAR(16) CHECK (
        mood IS NULL OR mood IN (
            'win_happy',
            'draw_calm',
            'loss_sad'
        )
    ),
    memo TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_my_baseball_records_user ON my_baseball_records (user_id);

CREATE INDEX IF NOT EXISTS idx_my_baseball_records_user_date ON my_baseball_records (user_id, record_date DESC);

-- ===== 정적 야구정보 (데이터는 수집 후 적재; 지금은 테이블만) =====

CREATE TABLE IF NOT EXISTS teams (
    team_code VARCHAR(4) PRIMARY KEY, -- LG, KT, SS, HT, HH, OB, NC, SK, LT, WO
    name VARCHAR(50) NOT NULL, -- 예: LG 트윈스
    city VARCHAR(50),
    home_stadium VARCHAR(50),
    founded_year INTEGER,
    championships INTEGER,
    history TEXT
);

CREATE TABLE IF NOT EXISTS legends ( -- 레전드/유명 선수
    legend_id SERIAL PRIMARY KEY,
    team_code VARCHAR(4) REFERENCES teams (team_code),
    name VARCHAR(50) NOT NULL,
    position VARCHAR(20),
    era VARCHAR(100), -- 활약 시기 (드라이브 원본의 소속 시기는 최대 51자)
    note TEXT,
    jersey_no VARCHAR(10) -- 영구결번 번호(KBO 공식, 영구결번 선수만 채움). 2026-06-15 기준
);

ALTER TABLE legends ALTER COLUMN era TYPE VARCHAR(100);

CREATE TABLE IF NOT EXISTS team_personas (
    team_code varchar(4) PRIMARY KEY,
    team_name varchar(50) NOT NULL,
    definition text,
    personality_keywords text,
    personality_core text,
    speaking_features text,
    response_style text
);

CREATE TABLE IF NOT EXISTS rules ( -- 야구 규칙
    rule_id SERIAL PRIMARY KEY,
    category VARCHAR(50),
    topic VARCHAR(100) NOT NULL,
    content TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS glossary ( -- 용어·약어 사전
    term_id SERIAL PRIMARY KEY,
    term VARCHAR(50) NOT NULL,
    abbr VARCHAR(20),
    category VARCHAR(30),
    definition TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS umpire_signals ( -- 심판 수신호
    signal_id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    meaning VARCHAR(100),
    description TEXT
);

CREATE TABLE IF NOT EXISTS cheering ( -- 응원 문화 (방식만)
    cheering_id SERIAL PRIMARY KEY,
    team_code VARCHAR(4) REFERENCES teams (team_code),
    type VARCHAR(50), -- 막대풍선/떼창/응원단 등
    description TEXT
);

CREATE TABLE IF NOT EXISTS stadiums ( -- 구장 안내
    stadium_id SERIAL PRIMARY KEY,
    team_code VARCHAR(4) REFERENCES teams (team_code),
    name VARCHAR(50) NOT NULL,
    location VARCHAR(200),
    parking TEXT,
    subway VARCHAR(100),
    food TEXT,
    stadium_size TEXT,
    seat_count TEXT,
    features TEXT,
    ktx_info TEXT,
    taxi_info TEXT,
    bus_info TEXT,
    parking_tip TEXT,
    restaurants TEXT,
    tourism TEXT,
    accommodations TEXT,
    reservation_site TEXT,
    reservation_tip TEXT
);

ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS stadium_size TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS seat_count TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS features TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS ktx_info TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS taxi_info TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS bus_info TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS parking_tip TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS restaurants TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS tourism TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS accommodations TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS reservation_site TEXT;
ALTER TABLE stadiums ADD COLUMN IF NOT EXISTS reservation_tip TEXT;

CREATE TABLE IF NOT EXISTS quiz ( -- 다마고치 OX 퀴즈
    quiz_id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer BOOLEAN NOT NULL,          -- O=true, X=false
    explanation TEXT,
    difficulty VARCHAR(10),           -- 왕초보/초보/중급/고급
    category VARCHAR(30),             -- 규칙/용어/기록/관람/역사
    source VARCHAR(10) DEFAULT 'manual',
    created_for_user_key TEXT,
    source_question TEXT,
    main_topic TEXT
);

CREATE TABLE IF NOT EXISTS user_question_history (
    question_id SERIAL PRIMARY KEY,
    user_key TEXT NOT NULL,
    question TEXT NOT NULL,
    main_topic TEXT,
    answer_text TEXT,
    rag_context TEXT,
    origin TEXT NOT NULL DEFAULT 'chat',
    asked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_key, question)
);

-- ===== RAG(pgvector) 관련 — 2026-09 복구 시 추가 =====
-- 원본 DB에만 있고 이 파일에 빠져 있던 테이블·컬럼. 신규 프로젝트에서 스키마만으로
-- 챗봇 RAG가 그대로 서게 하려면 반드시 필요하다. (embed_chunks.py가 임베딩을 채운다)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS knowledge_chunks ( -- 구단 문화·팩트 청크 (벡터검색 대상)
    chunk_id SERIAL PRIMARY KEY,
    source VARCHAR(200),
    team_code VARCHAR(4),             -- NULL이면 전 구단 공통 청크
    category VARCHAR(50),
    title VARCHAR(200),
    content TEXT NOT NULL,
    basis_date DATE,
    embedding vector(768)             -- embeddings.EMBED_DIM 기본값과 일치
);

-- Google Search에서 실제 출처가 확인된 최신 정보의 단기 RAG 캐시.
-- 영구 지식과 분리하고 expires_at 이후 자동으로 재사용하지 않는다.
CREATE TABLE IF NOT EXISTS web_knowledge_cache (
    cache_id BIGSERIAL PRIMARY KEY,
    query_key TEXT NOT NULL,
    question TEXT NOT NULL,
    team_code VARCHAR(4) NOT NULL DEFAULT '',
    answer TEXT NOT NULL,
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    embedding vector(768),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE (query_key, team_code)
);
CREATE INDEX IF NOT EXISTS idx_web_knowledge_expiry ON web_knowledge_cache (expires_at);

CREATE TABLE IF NOT EXISTS team_culture_profiles ( -- 구단별 응원·팬덤 문화 요약
    team_code VARCHAR(4) PRIMARY KEY,
    culture_summary TEXT,
    fandom_style TEXT,
    cheer_style TEXT,
    signature_items TEXT,
    beginner_tip TEXT,
    caution TEXT,
    basis_date DATE,
    updated_at TIMESTAMP NOT NULL DEFAULT now()   -- 적재 SQL의 ON CONFLICT가 갱신
);
ALTER TABLE team_culture_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT now();

-- 용어·규칙도 임베딩 폴백(오타 추정·의미 근접 규칙)에 쓰이므로 컬럼이 필요하다.
ALTER TABLE glossary ADD COLUMN IF NOT EXISTS embedding vector(768);
ALTER TABLE rules ADD COLUMN IF NOT EXISTS embedding vector(768);

-- cheering 적재 SQL이 쓰는 출처 컬럼(원본 DB에는 있었으나 이 파일에 누락돼 있었음)
ALTER TABLE cheering ADD COLUMN IF NOT EXISTS source VARCHAR(255);
ALTER TABLE cheering ADD COLUMN IF NOT EXISTS basis_date DATE;
