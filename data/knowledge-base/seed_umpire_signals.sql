-- 자동 생성(복구): 평가 로그의 '심판 수신호(공식)' 집계 문자열을 행으로 분해.

INSERT INTO umpire_signals (name, meaning, description)
SELECT '스트라이크', '투구가 스트라이크', '오른팔(주먹)을 옆/앞으로 크게 뻗으며 ''스트라이크'' 콜. 삼진 땐 특히 큰 동작'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '스트라이크');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '볼', '투구가 존을 벗어남', '수신호 없이 ''볼'' 콜만. 4볼이면 타자 1루 출루'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '볼');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '아웃', '타자·주자 아웃', '주먹 쥔 손을 위로 들어올리며 ''아웃'''
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '아웃');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '세이프', '주자가 살았음', '양팔을 수평으로 쫙 펼침'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '세이프');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '파울', '타구가 파울 지역', '양손을 머리 위로 들며 ''파울'' 콜'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '파울');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '페어', '타구가 인플레이', '콜 없이 팔로 페어 지역(그라운드 안)을 가리킴'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '페어');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '홈런', '담장 넘긴 홈런', '검지를 머리 위로 들어 원을 그리며 빙빙 돌림'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '홈런');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '타임', '경기 일시정지', '양손을 머리 위로 번쩍 들어올림'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '타임');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '플레이', '경기 시작·재개', '한 손으로 투수를 가리키며 ''플레이'''
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '플레이');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '인필드 플라이', '내야 플라이 자동 아웃', '검지를 하늘로 수직으로 뻗으며 ''인필드 플라이'' 콜'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '인필드 플라이');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '몸에 맞는 공', '투구가 타자 맞음', '타자에게 1루 진루 지시'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '몸에 맞는 공');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '보크', '투수 반칙 동작', '''보크'' 콜, 주자 한 베이스 진루'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '보크');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '체크스윙(하프스윙)', '스윙 여부 어필', '주심이 애매할 때 1·3루심에게 손으로 가리켜 ''스윙했나?'' 확인 요청 → 베이스심이 판정'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '체크스윙(하프스윙)');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '카운트 알림', '볼-스트라이크 카운트 안내', '양손 손가락으로 볼(왼손)·스트라이크(오른손) 수를 표시'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '카운트 알림');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '퇴장', '감독·선수 퇴장', '팔을 크게 뻗어 바깥쪽으로 내치며 ''퇴장'''
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '퇴장');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '그라운드 룰 더블', '인정 2루타', '손가락 두 개를 들어올림. 타구가 바운드 후 펜스 넘김/관중석 들어감'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '그라운드 룰 더블');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '헛스윙(스윙 삼진)', '헛스윙도 스트라이크', '스트라이크와 같은 동작. 헛스윙 3번째면 삼진'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '헛스윙(스윙 삼진)');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '파울팁', '살짝 스친 타구', '한 손으로 다른 손등을 쓸어내린 뒤 스트라이크. 포수가 잡으면 스트라이크'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '파울팁');

INSERT INTO umpire_signals (name, meaning, description)
SELECT '고의4구', '고의 볼넷', '요즘 KBO는 투구 없이 사인으로 진행, 타자 바로 1루'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '고의4구');

-- 괄호 중첩으로 자동 분해에서 빠진 1건 수기 보정
INSERT INTO umpire_signals (name, meaning, description)
SELECT '비디오 판독', '판정 재확인(챌린지)', '양손 검지로 허공에 네모(사각형)를 그림'
WHERE NOT EXISTS (SELECT 1 FROM umpire_signals WHERE name = '비디오 판독');
