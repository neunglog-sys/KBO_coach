-- 자동 생성(복구): 평가 로그 rag_context에서 되살린 청크 중 리포 시드(62건)에 없던 것.

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', NULL, 'team_fact', '베이스 간 거리', '야구 내야는 정사각형(다이아몬드) 모양이다. 1루·2루·3루·홈 네 베이스 사이 거리는 모두 같은 27.43m(90피트)다. 정삼각형이 아니라 정사각형이므로 홈에서 2루까지의 대각선 거리는 약 38.8m로 더 멀다. 투수판에서 홈플레이트까지는 18.44m로 베이스 간 거리와는 다르다.', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = '베이스 간 거리');

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', NULL, 'team_fact', '최근 한국시리즈 우승팀 연표', '최근 한국시리즈 우승팀: 2020년 NC 다이노스, 2021년 KT 위즈, 2022년 SSG 랜더스, 2023년 LG 트윈스, 2024년 KIA 타이거즈, 2025년 LG 트윈스(상대: 한화 이글스).', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = '최근 한국시리즈 우승팀 연표');

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', 'HH', 'team_fact', '한화 이글스 한국시리즈 우승 기록', '한화 이글스(빙그레 이글스 포함)는 한국시리즈 통산 1회 우승했다(1999). 2025년 한국시리즈에 진출했으나 LG 트윈스에 패해 준우승했다.', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = '한화 이글스 한국시리즈 우승 기록');

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', 'HT', 'team_fact', 'KIA 타이거즈 한국시리즈 우승 기록', 'KIA 타이거즈(해태 타이거즈 포함)는 한국시리즈 통산 12회 우승으로 최다 우승 구단이다. 가장 최근 우승은 2024년이다. 한국시리즈 진출 시 우승 확률이 매우 높은 전통의 강호다.', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = 'KIA 타이거즈 한국시리즈 우승 기록');

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', 'KT', 'team_fact', 'KT 위즈 한국시리즈 우승 기록', 'KT 위즈는 2021년 한국시리즈에서 두산 베어스를 꺾고 창단 첫 우승을 달성했다(통산 1회, 통합우승).', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = 'KT 위즈 한국시리즈 우승 기록');

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', 'LG', 'team_fact', 'LG 트윈스 한국시리즈 우승 기록', 'LG 트윈스는 한국시리즈에서 통산 4회 우승했다(1990, 1994, 2023, 2025). 가장 최근 우승은 2025년으로, 2025 한국시리즈에서 한화 이글스를 꺾고 우승했다. 2023년 우승은 29년 만의 우승이라 큰 화제였다.', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = 'LG 트윈스 한국시리즈 우승 기록');

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', 'LT', 'team_fact', '롯데 자이언츠 한국시리즈 우승 기록', '롯데 자이언츠는 한국시리즈 통산 2회 우승했다(1984, 1992). 1992년 이후 우승이 없어 KBO에서 가장 오래 우승하지 못한 구단이며, 그래서 팬들의 우승 염원이 매우 강하다.', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = '롯데 자이언츠 한국시리즈 우승 기록');

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', 'NC', 'team_fact', 'NC 다이노스 한국시리즈 우승 기록', 'NC 다이노스는 2020년 한국시리즈에서 두산 베어스를 꺾고 창단 첫 우승을 달성했다(통산 1회). 우승 세리머니로 ''집행검''을 들어올린 장면이 유명하다.', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = 'NC 다이노스 한국시리즈 우승 기록');

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', 'OB', 'team_fact', '두산 베어스 한국시리즈 우승 기록', '두산 베어스(OB 베어스 포함)는 한국시리즈 통산 6회 우승했다(1982, 1995, 2001, 2015, 2016, 2019). 가장 최근 우승은 2019년이다. 2015~2021년 7년 연속 한국시리즈에 진출했다.', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = '두산 베어스 한국시리즈 우승 기록');

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', 'SK', 'team_fact', 'SSG 랜더스 한국시리즈 우승 기록', 'SSG 랜더스는 전신 SK 와이번스 시절 4회(2007, 2008, 2010, 2018), SSG로 2022년 1회 — 프랜차이즈 통산 5회 우승했다. 가장 최근 우승은 2022년(와이어 투 와이어 우승)이다.', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = 'SSG 랜더스 한국시리즈 우승 기록');

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', 'SS', 'team_fact', '삼성 라이온즈 한국시리즈 우승 기록', '삼성 라이온즈는 한국시리즈 통산 8회 우승했다. 2011년부터 2014년까지 4년 연속 통합우승을 달성했으며, 가장 최근 우승은 2014년이다.', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = '삼성 라이온즈 한국시리즈 우승 기록');

INSERT INTO knowledge_chunks (source, team_code, category, title, content, basis_date)
SELECT '복구(평가로그)', 'WO', 'team_fact', '키움 히어로즈 한국시리즈 우승 기록', '키움 히어로즈는 아직 한국시리즈 우승이 없다(통산 0회). 2014, 2019, 2022년 한국시리즈에 진출해 준우승했다.', '2026-06-16'
WHERE NOT EXISTS (SELECT 1 FROM knowledge_chunks WHERE title = '키움 히어로즈 한국시리즈 우승 기록');
