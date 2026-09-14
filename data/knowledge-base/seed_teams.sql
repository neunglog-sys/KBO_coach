-- 자동 생성(복구): 평가 로그 docs/eval/responses.json의 rag_context에 찍힌 실제 DB 행을 역추출.
-- 원본 Supabase 프로젝트 삭제(2026-09 확인)로 소실된 콘텐츠를 되살린 것이라 재실행 안전(ON CONFLICT/중복검사).

-- teams: 10개 구단 기본팩트 (챗봇 구단팩트 RAG 근거)

INSERT INTO teams (team_code, name, city, home_stadium, founded_year, championships, history)
VALUES ('HH', '한화 이글스', '대전', '대전 한화생명 볼파크', 1986, 1, '빙그레 이글스(1986~1993) → 한화 이글스(1994~). 제7구단으로 창단해 빙그레 시절 강팀(1988~92 준우승 다수)이었다. 1999년 유일한 한국시리즈 우승. 2025년 19년 만에 한국시리즈에 진출했으나 LG에 1-4로 패해 준우승.')
ON CONFLICT (team_code) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city,
  home_stadium=EXCLUDED.home_stadium, founded_year=EXCLUDED.founded_year,
  championships=EXCLUDED.championships, history=EXCLUDED.history;

INSERT INTO teams (team_code, name, city, home_stadium, founded_year, championships, history)
VALUES ('OB', '두산 베어스', '서울', '잠실야구장', 1982, 6, 'OB 베어스(1982~1998) → 두산 베어스(1999~). 1982년 원년 초대 챔피언. ''화수분 야구''로 꾸준히 선수를 배출하며 ''미라클 두산''(2015~2021 7년 연속 한국시리즈 진출) 시대를 열었다. 우승: 1982·1995·2001·2015·2016·2019.')
ON CONFLICT (team_code) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city,
  home_stadium=EXCLUDED.home_stadium, founded_year=EXCLUDED.founded_year,
  championships=EXCLUDED.championships, history=EXCLUDED.history;

INSERT INTO teams (team_code, name, city, home_stadium, founded_year, championships, history)
VALUES ('HT', 'KIA 타이거즈', '광주', '광주-기아 챔피언스 필드', 1982, 12, '해태 타이거즈(1982~2001) → KIA 타이거즈(2001~). ''해태 왕조''(1980~90년대, 김응용 감독)를 이루며 한국시리즈 12회 진출에 12회 전승이라는 ''불패 신화''를 남겼다. 우승: 해태 1983·1986·1987·1988·1989·1991·1993·1996·1997, KIA 2009·2017·2024. KBO 통산 최다 우승(12회) 구단.')
ON CONFLICT (team_code) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city,
  home_stadium=EXCLUDED.home_stadium, founded_year=EXCLUDED.founded_year,
  championships=EXCLUDED.championships, history=EXCLUDED.history;

INSERT INTO teams (team_code, name, city, home_stadium, founded_year, championships, history)
VALUES ('KT', 'KT 위즈', '수원', '수원 KT위즈파크', 2013, 1, 'KT 위즈(2013 창단, 2015년 1군 진입), KBO 막내(제10구단). 1군 진입 7년 만인 2021년 통합우승하며 신생·막내 구단 최초의 통합우승을 달성했다.')
ON CONFLICT (team_code) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city,
  home_stadium=EXCLUDED.home_stadium, founded_year=EXCLUDED.founded_year,
  championships=EXCLUDED.championships, history=EXCLUDED.history;

INSERT INTO teams (team_code, name, city, home_stadium, founded_year, championships, history)
VALUES ('LG', 'LG 트윈스', '서울', '잠실야구장', 1982, 4, 'MBC 청룡(1982~1989) → LG 트윈스(1990~). 1990·1994년 우승 후 긴 침체를 겪다 2023년 29년 만에 우승. 2025년에는 한화를 꺾고 통합우승(김현수 한국시리즈 MVP)하며 재도약. 우승: 1990·1994·2023·2025.')
ON CONFLICT (team_code) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city,
  home_stadium=EXCLUDED.home_stadium, founded_year=EXCLUDED.founded_year,
  championships=EXCLUDED.championships, history=EXCLUDED.history;

INSERT INTO teams (team_code, name, city, home_stadium, founded_year, championships, history)
VALUES ('LT', '롯데 자이언츠', '부산', '사직야구장', 1982, 2, '롯데 자이언츠(1982~), 원년부터 모기업·명칭이 동일한 구단. 1984년 최동원의 한국시리즈 혼자 4승 신화로 우승, 1992년 두 번째 우승. 1992년 이후 우승 가뭄이 길어져 21세기 우승 경험이 없는 유일한 원년 구단(2025 기준). 부산을 대표하는 열정적 팬덤으로 유명.')
ON CONFLICT (team_code) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city,
  home_stadium=EXCLUDED.home_stadium, founded_year=EXCLUDED.founded_year,
  championships=EXCLUDED.championships, history=EXCLUDED.history;

INSERT INTO teams (team_code, name, city, home_stadium, founded_year, championships, history)
VALUES ('NC', 'NC 다이노스', '창원', '창원 NC파크', 2011, 1, 'NC 다이노스(2011 창단, 2013년 1군 진입), 엔씨소프트가 모기업인 제9구단. 창단 9년 만인 2020년 통합우승하며 신생 구단의 빠른 성공 사례로 꼽힌다.')
ON CONFLICT (team_code) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city,
  home_stadium=EXCLUDED.home_stadium, founded_year=EXCLUDED.founded_year,
  championships=EXCLUDED.championships, history=EXCLUDED.history;

INSERT INTO teams (team_code, name, city, home_stadium, founded_year, championships, history)
VALUES ('SK', 'SSG 랜더스', '인천', '인천 SSG 랜더스필드', 2000, 5, 'SK 와이번스(2000~2021) → SSG 랜더스(2021~). 김성근 감독의 ''SK 왕조''(2007~2010)로 강팀 반열에 올랐다. 2022년 SSG가 개막부터 종료까지 단 한 번도 1위를 내주지 않은 ''와이어 투 와이어'' 통합우승 달성. 우승: SK 2007·2008·2010·2018, SSG 2022.')
ON CONFLICT (team_code) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city,
  home_stadium=EXCLUDED.home_stadium, founded_year=EXCLUDED.founded_year,
  championships=EXCLUDED.championships, history=EXCLUDED.history;

INSERT INTO teams (team_code, name, city, home_stadium, founded_year, championships, history)
VALUES ('SS', '삼성 라이온즈', '대구', '대구 삼성 라이온즈 파크', 1982, 8, '삼성 라이온즈(1982~), 원년부터 모기업·명칭이 바뀌지 않은 구단. 2002년 첫 한국시리즈 우승 이후 ''삼성 왕조''(2011~2014 통합 4연패)라는 전무후무한 기록을 세웠다. 우승: 1985(통합)·2002·2005·2006·2011·2012·2013·2014 (1985 통합우승 포함 8회, 한국시리즈 우승 7회).')
ON CONFLICT (team_code) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city,
  home_stadium=EXCLUDED.home_stadium, founded_year=EXCLUDED.founded_year,
  championships=EXCLUDED.championships, history=EXCLUDED.history;

INSERT INTO teams (team_code, name, city, home_stadium, founded_year, championships, history)
VALUES ('WO', '키움 히어로즈', '서울', '고척스카이돔', 2008, 0, '우리 히어로즈(2008) → 넥센 히어로즈(2010~2018) → 키움 히어로즈(2019~). 현대 유니콘스 해체 후 모기업 없이 네이밍 스폰서로 운영되는 독특한 구단. 2014·2019·2022년 한국시리즈에 진출했으나 우승은 없어, KBO에서 유일하게 우승 경험이 없는 구단.')
ON CONFLICT (team_code) DO UPDATE SET name=EXCLUDED.name, city=EXCLUDED.city,
  home_stadium=EXCLUDED.home_stadium, founded_year=EXCLUDED.founded_year,
  championships=EXCLUDED.championships, history=EXCLUDED.history;
