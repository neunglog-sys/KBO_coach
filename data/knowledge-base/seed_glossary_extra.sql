-- 자동 생성(2026-09 복구): 구글 드라이브 팀 원본 문서에서 파싱.
-- 재실행 안전(중복 검사 / ON CONFLICT).

-- glossary 보강: 야구_기본규칙_용어정리.md 표 전체. 기존 행은 정의 유지하고 category만 원본 소제목으로 교정.
-- (chat.py 오타추정이 '심화은어'·'관람문화'를 제외하므로 카테고리가 맞아야 은어가 오타로 붙지 않는다)

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '1단계' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '1단계', NULL, '관람문화', '룰 익히기 — 중계 캐스터·해설의 상황 설명을 들으며 자연스럽게 이해'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '1단계');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '2단계' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '2단계', NULL, '관람문화', '응원 문화 즐기기 — 응원가, 응원석 분위기를 먼저 즐기기'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '2단계');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '3단계' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '3단계', NULL, '관람문화', '선수 이름 익히기 — 응원하는 팀의 주요 선수부터 천천히'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '3단계');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '표현' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '표현', NULL, '관람문화', '의미'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '표현');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '직관' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '직관', NULL, '관람문화', '경기장에 직접 가서 보는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '직관');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '집관' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '집관', NULL, '관람문화', '집에서 중계로 보는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '집관');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '홈/원정' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '홈/원정', NULL, '관람문화', '우리 팀 구장 경기 / 상대 팀 구장 경기'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '홈/원정');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '치맥' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '치맥', NULL, '관람문화', '야구장에서 치킨과 맥주를 즐기는 문화'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '치맥');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '응원가' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '응원가', NULL, '관람문화', '팀·선수별 응원 노래 (구단 공식 채널·나무위키에서 미리 가사 확인 가능)'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '응원가');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '떼창' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '떼창', NULL, '관람문화', '응원석이 다 같이 응원가를 부르는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '떼창');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '구분' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '구분', NULL, '관람문화', '설명'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '구분');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '이닝' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '이닝', NULL, '관람문화', '경기의 기본 단위'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '이닝');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '초' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '초', NULL, '관람문화', '원정팀이 공격하는 차례'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '초');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '말' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '말', NULL, '관람문화', '홈팀이 공격하는 차례'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '말');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '3아웃' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '3아웃', NULL, '관람문화', '공격 종료 조건'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '3아웃');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '득점' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '득점', NULL, '관람문화', '주자가 홈에 들어오면 1점'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '득점');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '승리조건' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '승리 조건', NULL, '관람문화', '9이닝 종료 후 더 많은 점수를 얻은 팀이 승리'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '승리조건');

UPDATE glossary SET category = '공격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '타자' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '타자', NULL, '공격', '공을 치는 선수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '타자');

UPDATE glossary SET category = '공격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '주자' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '주자', NULL, '공격', '베이스에 나가 있는 공격팀 선수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '주자');

UPDATE glossary SET category = '공격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '출루' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '출루', NULL, '공격', '타자가 아웃되지 않고 베이스에 나가는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '출루');

UPDATE glossary SET category = '공격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '안타' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '안타', NULL, '공격', '타자가 공을 쳐서 1루 이상 진루하는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '안타');

UPDATE glossary SET category = '공격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '2루타' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '2루타', NULL, '공격', '타자가 공을 치고 2루까지 진루하는 안타'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '2루타');

UPDATE glossary SET category = '공격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '3루타' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '3루타', NULL, '공격', '타자가 공을 치고 3루까지 진루하는 안타'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '3루타');

UPDATE glossary SET category = '공격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '홈런' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '홈런', NULL, '공격', '타자가 공을 쳐서 홈까지 들어오는 타격'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '홈런');

UPDATE glossary SET category = '공격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '타점' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '타점', NULL, '공격', '타자의 플레이로 주자가 득점했을 때 기록되는 수치'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '타점');

UPDATE glossary SET category = '공격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '도루' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '도루', NULL, '공격', '주자가 수비 틈을 타 다음 베이스로 가는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '도루');

UPDATE glossary SET category = '공격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '희생번트' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '희생번트', NULL, '공격', '본인은 아웃되더라도 주자를 진루시키기 위한 번트'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '희생번트');

UPDATE glossary SET category = '공격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '희생플라이' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '희생플라이', NULL, '공격', '외야 플라이로 주자가 홈에 들어오게 하는 플레이'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '희생플라이');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '투수' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '투수', NULL, '수비투수', '타자에게 공을 던지는 선수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '투수');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '포수' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '포수', NULL, '수비투수', '투수의 공을 받는 선수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '포수');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '스트라이크' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '스트라이크', NULL, '수비투수', '타자가 헛스윙했거나 스트라이크 존을 통과한 공'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '스트라이크');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '볼' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '볼', NULL, '수비투수', '스트라이크 존을 벗어난 공'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '볼');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '삼진' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '삼진', NULL, '수비투수', '스트라이크 3개로 타자가 아웃되는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '삼진');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '볼넷' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '볼넷', NULL, '수비투수', '볼 4개로 타자가 1루에 출루하는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '볼넷');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '사구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '사구', NULL, '수비투수', '투수가 던진 공이 타자의 몸에 맞아 출루하는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '사구');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '병살' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '병살', NULL, '수비투수', '한 번의 수비 플레이로 아웃 2개를 잡는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '병살');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '실책' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '실책', NULL, '수비투수', '수비수가 처리할 수 있는 공을 놓치거나 잘못 처리하는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '실책');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '폭투' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '폭투', NULL, '수비투수', '투수가 포수가 잡기 어렵게 던진 공'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '폭투');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '포일' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '포일', NULL, '수비투수', '포수가 잡을 수 있는 공을 놓치는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '포일');

UPDATE glossary SET category = '수비투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '보크' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '보크', NULL, '수비투수', '투수가 규칙에 어긋나는 동작을 해 주자에게 진루권이 주어지는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '보크');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, 'AVG')
WHERE REPLACE(term, ' ', '') = '타율' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '타율', 'AVG', '기록지표', '안타 ÷ 타수. 타자의 기본 타격 정확도'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '타율');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, 'OBP')
WHERE REPLACE(term, ' ', '') = '출루율' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '출루율', 'OBP', '기록지표', '얼마나 자주 베이스에 나가는지. 공격 기회 창출 능력'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '출루율');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, 'SLG')
WHERE REPLACE(term, ' ', '') = '장타율' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '장타율', 'SLG', '기록지표', '한 타수당 얼마나 많은 루타를 얻는지. 장타력 판단'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '장타율');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'OPS' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'OPS', NULL, '기록지표', '출루율 + 장타율. 타자의 종합 공격력'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'OPS');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, 'ERA')
WHERE REPLACE(term, ' ', '') = '평균자책점' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '평균자책점', 'ERA', '기록지표', '9이닝 기준 평균 자책점. 실점 억제 능력'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '평균자책점');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'WHIP' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'WHIP', NULL, '기록지표', '이닝당 출루 허용률. 주자를 얼마나 내보내는지'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'WHIP');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, 'K')
WHERE REPLACE(term, ' ', '') = '탈삼진' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '탈삼진', 'K', '기록지표', '삼진을 잡은 횟수. 타자를 직접 제압하는 능력'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '탈삼진');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, 'HR')
WHERE REPLACE(term, ' ', '') = '피홈런' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '피홈런', 'HR', '기록지표', '허용한 홈런 수. 장타 억제 능력'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '피홈런');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, 'W')
WHERE REPLACE(term, ' ', '') = '승' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '승', 'W', '기록지표', '승리투수 기록. 팀 승리에 관여한 결과 지표'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '승');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, 'SV')
WHERE REPLACE(term, ' ', '') = '세이브' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '세이브', 'SV', '기록지표', '리드를 지키고 경기를 끝낸 기록. 마무리 투수 평가'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '세이브');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, 'HLD')
WHERE REPLACE(term, ' ', '') = '홀드' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '홀드', 'HLD', '기록지표', '중간계투가 리드를 유지한 기록. 불펜 투수 평가'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '홀드');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'WAR' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'WAR', NULL, '기록지표', '대체 선수 대비 승리 기여도. 선수의 종합 가치'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'WAR');

UPDATE glossary SET category = '기록지표', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'WPA' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'WPA', NULL, '기록지표', '승리 확률 기여도. 중요한 순간의 영향력'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'WPA');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '끝내기' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '끝내기', NULL, '경기상황', '마지막 공격에서 점수를 내며 경기를 바로 끝내는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '끝내기');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '끝내기안타' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '끝내기 안타', NULL, '경기상황', '끝내기 상황에서 나온 안타'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '끝내기안타');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '끝내기홈런' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '끝내기 홈런', NULL, '경기상황', '끝내기 상황에서 나온 홈런'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '끝내기홈런');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '백투백홈런' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '백투백 홈런', NULL, '경기상황', '두 타자가 연속으로 홈런을 치는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '백투백홈런');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '삼자범퇴' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '삼자범퇴', NULL, '경기상황', '한 이닝에 타자 3명을 모두 아웃시키는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '삼자범퇴');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '만루' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '만루', NULL, '경기상황', '1루, 2루, 3루에 모두 주자가 있는 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '만루');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '득점권' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '득점권', NULL, '경기상황', '주자가 2루 또는 3루에 있어 안타 하나로 득점 가능성이 큰 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '득점권');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '잔루' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '잔루', NULL, '경기상황', '이닝 종료 시 베이스에 남아 득점하지 못한 주자'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '잔루');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '빅이닝' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '빅이닝', NULL, '경기상황', '한 이닝에 많은 점수를 낸 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '빅이닝');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '클러치' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '클러치', NULL, '경기상황', '중요한 순간에 좋은 결과를 내는 능력'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '클러치');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '스윕' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '스윕', NULL, '경기상황', '3연전/시리즈에서 한 팀이 모두 승리하는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '스윕');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '위닝시리즈' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '위닝시리즈', NULL, '경기상황', '3연전 등에서 더 많이 이긴 시리즈'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '위닝시리즈');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '루징시리즈' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '루징시리즈', NULL, '경기상황', '3연전 등에서 더 많이 진 시리즈'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '루징시리즈');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '연장전' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '연장전', NULL, '경기상황', '정규 이닝 이후에도 동점일 때 추가로 진행하는 경기'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '연장전');

UPDATE glossary SET category = '경기상황', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '콜드게임' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '콜드게임', NULL, '경기상황', '일정 점수 차나 날씨 등으로 경기를 조기 종료하는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '콜드게임');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '거포' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '거포', NULL, '타격', '홈런과 장타를 많이 치는 타자'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '거포');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '똑딱이' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '똑딱이', NULL, '타격', '장타보다는 단타 위주로 치는 타자'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '똑딱이');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '공갈포' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '공갈포', NULL, '타격', '타율은 낮지만 홈런은 많이 치는 타자'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '공갈포');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '컨택' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '컨택', NULL, '타격', '공을 맞히는 능력'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '컨택');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '선구안' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '선구안', NULL, '타격', '볼과 스트라이크를 구분하는 능력'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '선구안');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '장타' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '장타', NULL, '타격', '2루타 이상 또는 큰 타구를 의미'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '장타');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '밀어치기' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '밀어치기', NULL, '타격', '타자가 타구를 반대 방향으로 보내는 타격'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '밀어치기');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '당겨치기' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '당겨치기', NULL, '타격', '타자가 자기 타격 방향 쪽으로 강하게 치는 타격'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '당겨치기');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '테이블세터' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '테이블세터', NULL, '타격', '1~2번 타자처럼 출루해 득점 기회를 만드는 타순'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '테이블세터');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '클린업트리오' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '클린업 트리오', NULL, '타격', '보통 3~5번 중심 타선을 의미'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '클린업트리오');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '하위타선' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '하위타선', NULL, '타격', '7~9번 타순처럼 뒤쪽 타순'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '하위타선');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '대타' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '대타', NULL, '타격', '기존 타자 대신 타석에 들어서는 선수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '대타');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '번트' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '번트', NULL, '타격', '방망이에 공을 가볍게 맞혀 굴리는 작전'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '번트');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '작전야구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '작전야구', NULL, '타격', '번트, 도루, 히트앤런 등 작전을 많이 쓰는 야구'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '작전야구');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '배드볼히터' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '배드볼 히터', NULL, '타격', '나쁜 공도 잘 치는 타자'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '배드볼히터');

UPDATE glossary SET category = '타격', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '눈야구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '눈야구', NULL, '타격', '선구안을 바탕으로 볼넷을 잘 얻는 스타일'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '눈야구');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '에이스' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '에이스', NULL, '투수', '팀에서 가장 믿을 만한 1선발급 투수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '에이스');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '선발' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '선발', NULL, '투수', '경기 시작부터 던지는 투수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '선발');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '불펜' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '불펜', NULL, '투수', '교체 투수들이 준비하거나 중간계투진 전체를 의미'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '불펜');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '중간계투' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '중간계투', NULL, '투수', '선발과 마무리 사이에 등판하는 투수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '중간계투');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '셋업맨' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '셋업맨', NULL, '투수', '마무리 전 중요한 이닝을 맡는 투수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '셋업맨');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '마무리' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '마무리', NULL, '투수', '경기 마지막을 책임지는 투수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '마무리');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '클로저' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '클로저', NULL, '투수', '마무리 투수를 영어식으로 부르는 말'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '클로저');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '롱릴리프' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '롱릴리프', NULL, '투수', '긴 이닝을 던지는 구원 투수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '롱릴리프');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '필승조' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '필승조', NULL, '투수', '이기고 있는 경기에서 투입되는 핵심 불펜'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '필승조');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '추격조' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '추격조', NULL, '투수', '지고 있지만 따라갈 가능성이 있을 때 나오는 불펜'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '추격조');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '패전조' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '패전조', NULL, '투수', '점수 차가 큰 상황에서 나오는 불펜을 비공식적으로 부르는 말'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '패전조');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '이닝이터' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '이닝이터', NULL, '투수', '많은 이닝을 안정적으로 던지는 투수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '이닝이터');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '제구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '제구', NULL, '투수', '원하는 위치에 공을 던지는 능력'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '제구');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '구위' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '구위', NULL, '투수', '공의 힘, 회전, 무브먼트 등 타자가 치기 어려운 정도'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '구위');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '실투' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '실투', NULL, '투수', '투수가 의도한 위치와 다르게 던진 공'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '실투');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '볼질' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '볼질', NULL, '투수', '볼을 많이 던져 제구가 흔들리는 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '볼질');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '불쇼' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '불쇼', NULL, '투수', '불펜이 리드를 지키지 못하고 실점하는 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '불쇼');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '방화' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '방화', NULL, '투수', '불펜 투수가 승리 상황을 망치는 것을 비유적으로 표현'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '방화');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '장작쌓기' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '장작 쌓기', NULL, '투수', '주자를 계속 내보내 위기를 키우는 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '장작쌓기');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '블론세이브' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '블론세이브', NULL, '투수', '세이브 상황에서 리드를 지키지 못한 기록'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '블론세이브');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '완봉' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '완봉', NULL, '투수', '한 투수가 상대팀을 무득점으로 막고 끝까지 던진 경기'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '완봉');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '완투' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '완투', NULL, '투수', '한 투수가 경기 끝까지 교체 없이 던지는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '완투');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '노히트노런' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '노히트노런', NULL, '투수', '안타 없이 실점도 거의 없이 막는 대기록'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '노히트노런');

UPDATE glossary SET category = '투수', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '퍼펙트게임' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '퍼펙트게임', NULL, '투수', '한 명의 주자도 내보내지 않고 끝내는 경기'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '퍼펙트게임');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '키스톤콤비' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '키스톤 콤비', NULL, '수비주루', '2루수와 유격수 조합'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '키스톤콤비');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '핫코너' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '핫코너', NULL, '수비주루', '3루를 의미. 강한 타구가 자주 와서 붙은 표현'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '핫코너');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '호수비' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '호수비', NULL, '수비주루', '뛰어난 수비 플레이'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '호수비');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '알까기' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '알까기', NULL, '수비주루', '야수가 공을 다리 사이로 빠뜨리는 실수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '알까기');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '송구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '송구', NULL, '수비주루', '공을 던져 전달하는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '송구');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '악송구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '악송구', NULL, '수비주루', '수비수가 잘못 던진 공'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '악송구');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '중계플레이' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '중계플레이', NULL, '수비주루', '외야에서 홈이나 내야로 공을 연결해 던지는 플레이'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '중계플레이');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '백업' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '백업', NULL, '수비주루', '송구가 빠졌을 때를 대비해 뒤를 받쳐주는 수비'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '백업');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '포스아웃' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '포스아웃', NULL, '수비주루', '주자가 반드시 다음 베이스로 가야 하는 상황에서 베이스를 밟아 아웃시키는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '포스아웃');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '태그아웃' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '태그아웃', NULL, '수비주루', '공을 가진 수비수가 주자에게 태그해 아웃시키는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '태그아웃');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '태그업' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '태그업', NULL, '수비주루', '플라이볼이 잡힌 뒤 주자가 다음 베이스로 진루하는 플레이'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '태그업');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '런다운' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '런다운', NULL, '수비주루', '주자를 두 베이스 사이에 몰아넣고 잡는 플레이'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '런다운');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '주루사' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '주루사', NULL, '수비주루', '주자가 베이스를 달리다 아웃되는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '주루사');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '견제' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '견제', NULL, '수비주루', '투수가 주자를 묶기 위해 베이스로 공을 던지는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '견제');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '도루저지' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '도루저지', NULL, '수비주루', '포수가 도루하려는 주자를 잡아내는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '도루저지');

UPDATE glossary SET category = '수비주루', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '슬라이딩' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '슬라이딩', NULL, '수비주루', '베이스에 미끄러져 들어가는 동작'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '슬라이딩');

UPDATE glossary SET category = '약어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'RBI' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'RBI', NULL, '약어', '타점'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'RBI');

UPDATE glossary SET category = '약어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'AVG' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'AVG', NULL, '약어', '타율'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'AVG');

UPDATE glossary SET category = '약어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'OBP' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'OBP', NULL, '약어', '출루율'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'OBP');

UPDATE glossary SET category = '약어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'SLG' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'SLG', NULL, '약어', '장타율'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'SLG');

UPDATE glossary SET category = '약어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'ERA' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'ERA', NULL, '약어', '평균자책점'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'ERA');

UPDATE glossary SET category = '약어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'QS+' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'QS+', NULL, '약어', '7이닝 이상 3자책점 이하로 던진 경기'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'QS+');

UPDATE glossary SET category = '약어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'HLD' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'HLD', NULL, '약어', '홀드'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'HLD');

UPDATE glossary SET category = '약어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'GIDP' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'GIDP', NULL, '약어', '병살타'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'GIDP');

UPDATE glossary SET category = '약어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = 'LOB' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT 'LOB', NULL, '약어', '잔루'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = 'LOB');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '원정' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '원정', NULL, '관람문화', '상대팀 구장에 가서 응원하거나 경기하는 것'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '원정');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '홈경기' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '홈경기', NULL, '관람문화', '자기 팀 구장에서 하는 경기'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '홈경기');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '응원석' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '응원석', NULL, '관람문화', '응원단과 팬들이 모여 응원하는 좌석'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '응원석');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '매진' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '매진', NULL, '관람문화', '경기장 좌석이 모두 판매된 상태'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '매진');

UPDATE glossary SET category = '관람문화', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '더그아웃' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '더그아웃', NULL, '관람문화', '선수단이 대기하는 공간'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '더그아웃');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '야알못' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '야알못', NULL, '심화은어', '야구를 잘 모르는 사람'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '야알못');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '야잘알' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '야잘알', NULL, '심화은어', '야구를 잘 아는 사람'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '야잘알');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '고인물' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '고인물', NULL, '심화은어', '오래 봐서 야구판 사정을 잘 아는 팬'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '고인물');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '뉴비' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '뉴비', NULL, '심화은어', '야구를 보기 시작한 지 얼마 안 된 팬'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '뉴비');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '크보' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '크보', NULL, '심화은어', 'KBO를 한국식으로 읽은 표현'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '크보');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '국밥' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '국밥', NULL, '심화은어', '꾸준히 기본 이상을 해주는 선수나 플레이'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '국밥');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '낭만야구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '낭만야구', NULL, '심화은어', '계산보다 감정, 서사, 극적인 장면이 강한 야구'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '낭만야구');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '변비야구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '변비야구', NULL, '심화은어', '주자는 많이 나가지만 점수를 잘 못 내는 경기'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '변비야구');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '뻥야구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '뻥야구', NULL, '심화은어', '홈런이나 장타에 의존하는 경기 스타일'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '뻥야구');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '스몰볼' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '스몰볼', NULL, '심화은어', '번트, 도루, 작전 등으로 한 점씩 짜내는 야구'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '스몰볼');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '빅볼' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '빅볼', NULL, '심화은어', '장타와 홈런 중심의 공격 야구'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '빅볼');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '관리야구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '관리야구', NULL, '심화은어', '투수 이닝, 선수 체력, 불펜 소모를 조절하는 운영'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '관리야구');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '총력전' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '총력전', NULL, '심화은어', '중요한 경기에서 가능한 전력을 모두 쓰는 운영'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '총력전');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '탱킹' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '탱킹', NULL, '심화은어', '좋은 신인 지명 등을 위해 낮은 성적을 감수한다는 의미로 쓰이는 표현'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '탱킹');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '리빌딩' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '리빌딩', NULL, '심화은어', '팀 전력을 장기적으로 다시 만드는 과정'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '리빌딩');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '윈나우' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '윈나우', NULL, '심화은어', '지금 당장 우승을 목표로 전력을 몰아붙이는 운영'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '윈나우');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '가을야구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '가을야구', NULL, '심화은어', '포스트시즌을 뜻하는 표현'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '가을야구');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '위닝멘탈리티' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '위닝 멘탈리티', NULL, '심화은어', '이기는 팀 특유의 분위기나 경험을 말할 때 쓰는 표현'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '위닝멘탈리티');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '멘붕' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '멘붕', NULL, '심화은어', '결정적 실수나 역전패로 멘탈이 무너진 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '멘붕');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '멸망전' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '멸망전', NULL, '심화은어', '두 약팀 또는 라이벌이 절박하게 맞붙는 경기'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '멸망전');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '대첩' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '대첩', NULL, '심화은어', '점수가 많이 나거나 극적인 역전이 나온 명경기/막장경기'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '대첩');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '참사' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '참사', NULL, '심화은어', '대량 실점, 수비 실책, 충격적인 패배를 말할 때 쓰는 표현'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '참사');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '졌잘싸' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '졌잘싸', NULL, '심화은어', '졌지만 잘 싸웠다는 뜻'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '졌잘싸');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '이겼지만찝찝' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '이겼지만 찝찝', NULL, '심화은어', '승리했지만 경기 내용이 좋지 않았을 때'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '이겼지만찝찝');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '승요' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '승요', NULL, '심화은어', '직접 보러 간 경기에서 팀이 이기는 사람, 승리 요정'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '승요');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '패요' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '패요', NULL, '심화은어', '직접 보러 간 경기에서 팀이 지는 사람, 패배 요정'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '패요');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '직관승' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '직관승', NULL, '심화은어', '경기장에 직접 가서 본 경기에서 승리'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '직관승');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '직관패' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '직관패', NULL, '심화은어', '경기장에 직접 가서 본 경기에서 패배'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '직관패');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '말머리' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '말머리', NULL, '심화은어', '커뮤니티 글 제목 앞에 붙이는 팀 약칭 표시'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '말머리');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '분탕' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '분탕', NULL, '심화은어', '일부러 싸움을 일으키거나 분위기를 흐리는 사람'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '분탕');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '갤주' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '갤주', NULL, '심화은어', '특정 갤러리에서 상징처럼 언급되는 인물'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '갤주');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '개념글' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '개념글', NULL, '심화은어', '추천을 많이 받아 상단에 올라간 글'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '개념글');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '불판' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '불판', NULL, '심화은어', '실시간 경기 중계를 댓글로 달며 보는 게시글'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '불판');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '장작' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '장작', NULL, '심화은어', '실점 위기에서 주자를 계속 내보내는 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '장작');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '작가' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '작가', NULL, '심화은어', '경기 흐름을 극적으로 망쳐 드라마를 쓰는 투수에게 붙는 조롱형 표현'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '작가');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '도망가는점수' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '도망가는 점수', NULL, '심화은어', '리드 상황에서 추가로 내는 중요한 점수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '도망가는점수');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '추격하는점수' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '추격하는 점수', NULL, '심화은어', '지고 있는 팀이 따라붙는 점수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '추격하는점수');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '쐐기점' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '쐐기점', NULL, '심화은어', '승부를 거의 결정짓는 추가 득점'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '쐐기점');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '클러치상황' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '클러치 상황', NULL, '심화은어', '경기 후반, 득점권 등 승부에 큰 영향을 주는 순간'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '클러치상황');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '영양가' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '영양가', NULL, '심화은어', '기록 숫자보다 실제 경기 흐름에 얼마나 도움이 됐는지를 말할 때 쓰는 표현'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '영양가');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '무사만루무득' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '무사만루 무득', NULL, '심화은어', '아웃이 없는 만루 기회에서 점수를 못 낸 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '무사만루무득');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '잔루만루' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '잔루 만루', NULL, '심화은어', '만루 기회를 살리지 못하고 이닝이 끝난 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '잔루만루');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '테이블세터가밥상차림' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '테이블세터가 밥상 차림', NULL, '심화은어', '1~2번 타자가 출루해 중심타선 앞에 기회를 만든 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '테이블세터가밥상차림');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '클린업이밥상엎음' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '클린업이 밥상 엎음', NULL, '심화은어', '중심타선이 득점 기회를 살리지 못한 상황'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '클린업이밥상엎음');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '수비요정' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '수비요정', NULL, '심화은어', '수비를 매우 잘하는 선수'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '수비요정');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '자동문' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '자동문', NULL, '심화은어', '수비 범위가 좁거나 실책이 많은 선수를 비유'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '자동문');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '어깨가좋다' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '어깨가 좋다', NULL, '심화은어', '송구 능력이 좋다는 뜻'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '어깨가좋다');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '발야구' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '발야구', NULL, '심화은어', '도루, 주루, 빠른 발을 적극 활용하는 야구'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '발야구');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '주루센스' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '주루센스', NULL, '심화은어', '베이스를 도는 판단력과 상황 판단 능력'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '주루센스');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '뇌주루' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '뇌주루', NULL, '심화은어', '무리하거나 이해하기 어려운 주루 플레이'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '뇌주루');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '홈런공장' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '홈런공장', NULL, '심화은어', '홈런이 자주 나오는 구장이나 타선을 말함'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '홈런공장');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '투수무덤' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '투수무덤', NULL, '심화은어', '투수가 불리한 구장 또는 투수들이 자주 무너지는 환경'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '투수무덤');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '투수친화구장' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '투수친화구장', NULL, '심화은어', '홈런과 득점이 비교적 적어 투수에게 유리한 구장'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '투수친화구장');

UPDATE glossary SET category = '심화은어', abbr = COALESCE(abbr, NULL)
WHERE REPLACE(term, ' ', '') = '타자친화구장' AND category = '기본용어';
INSERT INTO glossary (term, abbr, category, definition)
SELECT '타자친화구장', NULL, '심화은어', '홈런과 장타가 비교적 잘 나오는 구장'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE REPLACE(term, ' ', '') = '타자친화구장');
