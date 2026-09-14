-- 자동 생성(복구): 평가 로그 docs/eval/responses.json의 rag_context에 찍힌 실제 DB 행을 역추출.
-- 원본 Supabase 프로젝트 삭제(2026-09 확인)로 소실된 콘텐츠를 되살린 것이라 재실행 안전(ON CONFLICT/중복검사).

-- rules: 규칙. 집계행(심판 수신호)은 umpire_signals 테이블로 분리 적재.

INSERT INTO rules (category, topic, content)
SELECT '규칙', '이닝과 초·말', '경기는 일반적으로 9이닝으로 진행된다. 각 이닝은 초와 말로 나뉘며, 보통 초에는 원정팀이, 말에는 홈팀이 공격한다. 9이닝이 끝났을 때 더 많은 점수를 낸 팀이 승리한다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '이닝과 초·말');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '승리 조건', '정규 9이닝 종료 후 점수가 더 높은 팀이 승리한다. 점수가 같으면 연장전으로 이어진다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '승리 조건');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '베이스를 도는 순서', '타자가 공을 치고 1루-2루-3루-홈 순서로 한 바퀴 돌아 홈에 들어오면 1점이다. 순서를 건너뛰면 진루가 인정되지 않는다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '베이스를 도는 순서');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '득점 방법', '득점은 주자가 1루, 2루, 3루를 차례로 밟고 홈 플레이트를 밟는 것이 유일한 방법이다. 주자가 홈에 들어올 때마다 1점이 올라간다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '득점 방법');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '파울이란', '타자가 친 공이 파울 라인 바깥으로 나가면 파울이다. 2스트라이크 이후에는 파울을 계속 쳐도 삼진이 되지 않아 타석이 길어질 수 있다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '파울이란');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '스트라이크 존이란', '투수가 던진 공이 타자의 어깨와 무릎 사이를 지나는 네모난 공간(스트라이크 존)을 통과하면 스트라이크, 벗어나면 볼로 판정된다. 타자가 방망이를 휘두르지 않아도 이 공간을 지나가면 스트라이크다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '스트라이크 존이란');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '경기의 기본 흐름', '야구는 두 팀이 공격과 수비를 번갈아 하며 점수를 내는 스포츠다. 공격팀은 주자가 1루-2루-3루를 거쳐 홈에 들어오면 1점을 얻고, 수비팀은 타자와 주자를 아웃시켜 실점을 막는다. 한 팀이 3아웃을 당하면 공수가 교대된다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '경기의 기본 흐름');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '아웃과 세이프', '주자가 베이스에 들어갈 때 살았으면 세이프, 죽었으면 아웃이다. 심판은 아웃이면 주먹을 위로 들어 올리고, 세이프면 양팔을 옆으로 펼쳐 표시한다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '아웃과 세이프');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '친다고 다 안타는 아니다', '공을 치고 1루까지 살아서 가면 안타지만, 수비가 공을 잡아 1루에 먼저 보내면 아웃이다. 결국 주자와 송구 중 누가 더 빠르냐의 싸움이다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '친다고 다 안타는 아니다');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '볼카운트 읽는 법(B-S-O)', '전광판의 B는 볼(4개면 볼넷), S는 스트라이크(3개면 삼진), O는 아웃(3개면 공수교대)을 뜻한다. 3볼 2스트라이크를 풀카운트라 하며 다음 공 하나로 볼넷이나 삼진이 갈린다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '볼카운트 읽는 법(B-S-O)');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '삼진', '스트라이크가 3개 쌓여 타자가 아웃되는 것.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '삼진');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '태그 아웃', '공을 든 수비수가 베이스에서 떨어져 있는 주자의 몸을 글러브나 공으로 터치하면 아웃된다. 공을 갖지 않은 손으로 터치하면 무효다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '태그 아웃');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '파울 처리 규칙', '스트라이크 0~1개일 때 파울은 스트라이크 1개로 카운트된다. 스트라이크 2개일 때 친 파울은 스트라이크로 치지 않아 타석이 계속 유지된다. 단, 파울 플라이를 수비가 잡으면 아웃이다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '파울 처리 규칙');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '지명타자 제도', '지명타자(DH)는 수비를 하지 않고 타격만 담당하는 선수로, 보통 투수를 대신해 타석에 들어선다. 타격 능력이 좋은 선수를 기용하기 위한 제도다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '지명타자 제도');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '도루', '투수가 투구하는 사이 주자가 다음 베이스로 달려가 훔치는 것. 수비가 송구해 태그하면 도루 실패로 아웃된다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '도루');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '연장전 이닝 (2025)', '2025시즌부터 KBO 정규시즌 연장전은 11회까지로 축소되었다. 11회까지 동점이면 무승부로 처리된다. (이전에는 12회까지 진행했다.)'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '연장전 이닝 (2025)');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '볼넷', '볼이 4개 쌓이면 타자는 1루로 걸어 나가 출루한다. 이를 볼넷이라 한다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '볼넷');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '병살', '한 번의 연속된 수비 플레이로 아웃 2개를 잡는 것. 예를 들어 무사 1루에서 병살이 나오면 한 번에 무사 1루에서 2사 주자 없음으로 상황이 바뀌어 경기 흐름을 크게 바꾼다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '병살');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '고의낙구', '수비수가 병살 등을 노리고 잡을 수 있는 뜬공이나 라인드라이브를 일부러 떨어뜨리는 행위. 심판이 선언하면 타자는 아웃 처리되고 주자는 원래 베이스에 묶인다. 인필드 플라이와 목적은 비슷하나 적용 상황이 다르다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '고의낙구');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '인필드 플라이', '무사 또는 1사에 주자 1·2루 또는 만루일 때, 내야수가 평범하게 잡을 수 있는 내야 뜬공이 뜨면 심판이 인필드 플라이를 선언하고 타자는 자동 아웃된다. 수비가 일부러 공을 떨어뜨려 병살을 만드는 것을 막기 위한 규칙이다. 선언 후에는 포스 상황이 사라지므로 주자는 위험을 감수하고 진루할 수 있다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '인필드 플라이');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '보크', '주자가 있을 때 투수가 투구나 견제 동작을 속이는 등 규칙을 위반하면 보크가 선언된다. 보크가 선언되면 모든 주자는 한 루씩 진루한다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '보크');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '한국시리즈', '한국시리즈는 KBO 리그의 최종 우승팀을 가리는 7전 4선승제 시리즈다(먼저 4승 하는 팀이 우승). 토너먼트가 아니라 계단식 포스트시즌의 마지막 단계로, 정규시즌 1위는 한국시리즈에 직행하고 2위는 플레이오프, 3위는 준플레이오프에서 기다리며, 4위와 5위가 와일드카드 결정전부터 아래에서 위로 올라오는 방식이다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '한국시리즈');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '스트라이크 판정 조건', '공이 스트라이크 존을 통과하거나, 타자가 헛스윙하거나, 2스트라이크 전에 친 공이 파울이 되면 스트라이크로 카운트된다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '스트라이크 판정 조건');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '163', '1-6-3 병살: 투수(1)가 타구를 잡아 2루를 커버하는 유격수(6)에게 송구해 주자를 아웃시키고, 유격수가 다시 1루수(3)에게 송구해 타자까지 아웃시키는 병살이다. 숫자는 수비 위치 기록 번호로 1 투수, 2 포수, 3 1루수, 4 2루수, 5 3루수, 6 유격수, 7 좌익수, 8 중견수, 9 우익수를 뜻한다. 가장 흔한 6-4-3 병살은 유격수→2루수→1루수 순서다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '163');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '수비 위치 기록 번호', '야구 기록에서는 수비 포지션을 숫자로 표기한다. 1 투수, 2 포수, 3 1루수, 4 2루수, 5 3루수, 6 유격수, 7 좌익수, 8 중견수, 9 우익수. 예를 들어 6-4-3 병살은 유격수에서 2루수, 다시 1루수로 공이 이어진 병살을 뜻한다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '수비 위치 기록 번호');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '내야 기본 규격', '정규 야구장의 루 사이 거리는 90피트(약 27.43m), 투수판에서 홈플레이트까지는 60피트 6인치(약 18.44m), 마운드 높이는 10인치(약 25.4cm)다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '내야 기본 규격');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '플라이 아웃', '타자가 친 공이 땅에 닿기 전에 수비수가 잡으면 타자는 아웃된다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '플라이 아웃');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '땅볼 아웃', '타자가 친 땅볼을 수비가 잡아 주자보다 먼저 베이스로 송구하면 아웃된다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '땅볼 아웃');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '태그업(리터치)', '주자가 베이스에 있을 때 타자가 플라이를 치면, 주자는 수비가 공을 잡은 뒤 베이스를 다시 밟고 출발해야 다음 루로 진루할 수 있다. 잡히기 전에 미리 출발하면 원래 베이스로 돌아가야 한다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '태그업(리터치)');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '삼진 아웃', '스트라이크가 3개 쌓이면 타자는 삼진으로 아웃된다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '삼진 아웃');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '잠실야구장의 투수 친화성', '잠실야구장은 중앙 펜스 약 125m, 좌우 약 100m, 좌우중간 약 120m로 KBO 구장 중 넓은 편이다. 외야가 넓고 중앙·좌우중간이 깊어 큰 타구도 홈런이 되지 않고 잡히는 경우가 많아 투수 친화적인 구장으로 평가된다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '잠실야구장의 투수 친화성');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '구장 크기가 경기에 미치는 영향', '같은 타구라도 작은 구장에서는 홈런이 되지만 큰 구장에서는 외야 플라이로 잡힐 수 있다. 따라서 선수 성적이나 경기 예측을 분석할 때는 홈구장 크기, 펜스 거리, 구장별 득점 환경을 함께 고려해야 한다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '구장 크기가 경기에 미치는 영향');
