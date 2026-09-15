-- 자동 생성(2026-09 복구): 구글 드라이브 팀 원본 문서에서 파싱.
-- 재실행 안전(중복 검사 / ON CONFLICT).

-- rules 보강: 용어정리 문서에 있으나 복구분(평가 로그)에 없던 규칙.

INSERT INTO rules (category, topic, content)
SELECT '규칙', '포스 아웃', '주자가 반드시 다음 루로 가야 하는 상황(뒤 주자나 타자에게 밀려나는 경우)에서, 공을 가진 수비수가 그 베이스를 먼저 밟으면 주자를 태그하지 않아도 아웃이다. 예를 들어 1루 주자는 타자가 땅볼을 치면 2루로 가야 하므로 2루 포스 아웃이 가능하다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '포스 아웃');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '낫아웃', '1루에 주자가 없거나 2아웃일 때, 세 번째 스트라이크를 포수가 제대로 잡지 못하면 삼진이 기록되더라도 타자가 1루로 뛸 수 있다. 수비가 타자나 1루를 먼저 태그·송구해야 아웃이 된다. "삼진인데 왜 뛰지?" 싶은 장면이 이것이다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '낫아웃');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '풀카운트', '3볼 2스트라이크 상황. 다음 공 하나로 볼넷(볼)이나 삼진(스트라이크)이 갈릴 수 있는 긴장 상황이다. 단 2스트라이크 이후 파울은 스트라이크로 세지 않아 풀카운트가 계속 이어질 수 있다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '풀카운트');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '병살 표기', '병살은 공이 거쳐 간 수비 번호를 순서대로 적는다. 6-4-3은 유격수→2루수→1루수, 4-6-3은 2루수→유격수→1루수, 5-4-3은 3루수→2루수→1루수, 1-6-3은 투수→유격수→1루수, 3-6-3은 1루수→유격수→1루수, 1-2-3은 투수→포수→1루수 순서다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '병살 표기');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '투구 코스 9구역', '포수와 투수는 스트라이크 존을 3×3, 9개 구역으로 나눠 코스를 표현한다. 5번 한가운데는 실투가 되기 쉬운 위험한 코스이고, 8번 하단은 낮게 제구해 땅볼을 유도할 때, 2번 상단은 빠른 공으로 헛스윙을 유도할 때 자주 쓴다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '투구 코스 9구역');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '몸쪽 바깥쪽', '몸쪽과 바깥쪽은 타자가 어느 쪽 타석에 서는지에 따라 바뀐다. 우타자에게는 포수 기준 오른쪽이 몸쪽, 왼쪽이 바깥쪽이고, 좌타자에게는 반대로 포수 기준 왼쪽이 몸쪽, 오른쪽이 바깥쪽이다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '몸쪽 바깥쪽');

INSERT INTO rules (category, topic, content)
SELECT '규칙', '포지션 구분', '수비 9명은 배터리(투수·포수), 내야수(1루수·2루수·3루수·유격수), 외야수(좌익수·중견수·우익수)로 나뉜다. 배터리는 투구와 포구, 내야수는 땅볼 처리와 병살, 외야수는 멀리 날아간 타구 처리와 홈 송구를 맡는다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '포지션 구분');

INSERT INTO rules (category, topic, content)
SELECT '관람', '처음 야구 볼 때 관전 팁', '규칙을 다 외우지 않아도 된다. 중계 해설을 들으며 룰을 익히고, 응원가와 응원석 분위기를 먼저 즐긴 뒤, 응원하는 팀의 주요 선수 이름부터 천천히 익히면 된다. 응원 팀 하나를 정해 10경기 정도 보면 규칙이 자연스럽게 익숙해진다.'
WHERE NOT EXISTS (SELECT 1 FROM rules WHERE topic = '처음 야구 볼 때 관전 팁');
