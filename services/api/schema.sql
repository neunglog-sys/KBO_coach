-- KBO 챗봇 — PostgreSQL 스키마 (유저/관람기록)
-- 정적 야구정보 테이블(teams, glossary 등)은 데이터 수집 후 추가 예정.

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    fav_team_code VARCHAR(4),
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

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
    era VARCHAR(30), -- 활약 시기
    note TEXT
);

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
    category VARCHAR(30)              -- 규칙/용어/기록/관람/역사
);
