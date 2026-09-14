-- 자동 생성(복구): 평가 로그 docs/eval/responses.json의 rag_context에 찍힌 실제 DB 행을 역추출.
-- 원본 Supabase 프로젝트 삭제(2026-09 확인)로 소실된 콘텐츠를 되살린 것이라 재실행 안전(ON CONFLICT/중복검사).

-- glossary: 용어 사전. category='기본용어' — chat.py 오타추정 쿼리가 NOT IN 필터를 쓰므로 NULL 금지.

INSERT INTO glossary (term, category, definition)
SELECT '안타', '기본용어', '타자가 공을 쳐서 1루 이상 진루하는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '안타');

INSERT INTO glossary (term, category, definition)
SELECT '사구', '기본용어', '투수가 던진 공이 타자의 몸에 맞아 출루하는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '사구');

INSERT INTO glossary (term, category, definition)
SELECT '제구', '기본용어', '원하는 위치에 공을 던지는 능력.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '제구');

INSERT INTO glossary (term, category, definition)
SELECT '송구', '기본용어', '공을 던져 전달하는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '송구');

INSERT INTO glossary (term, category, definition)
SELECT '견제', '기본용어', '투수가 주자를 묶기 위해 베이스로 공을 던지는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '견제');

INSERT INTO glossary (term, category, definition)
SELECT '포수', '기본용어', '투수의 공을 받고 수비를 조율하는 선수.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '포수');

INSERT INTO glossary (term, category, definition)
SELECT '응원석', '기본용어', '응원단과 팬들이 모여 응원하는 좌석.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '응원석');

INSERT INTO glossary (term, category, definition)
SELECT '보크', '기본용어', '투수가 규칙에 어긋나는 동작을 해 주자에게 진루권이 주어지는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '보크');

INSERT INTO glossary (term, category, definition)
SELECT '직관', '기본용어', '경기장에 직접 가서 보는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '직관');

INSERT INTO glossary (term, category, definition)
SELECT '방화', '기본용어', '구원 투수가 승리 상황을 망치는 것을 비유적으로 표현.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '방화');

INSERT INTO glossary (term, category, definition)
SELECT '타자', '기본용어', '공을 치는 선수.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '타자');

INSERT INTO glossary (term, category, definition)
SELECT '주자', '기본용어', '베이스에 나가 있는 공격팀 선수.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '주자');

INSERT INTO glossary (term, category, definition)
SELECT '투수', '기본용어', '타자에게 공을 던지는 선수.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '투수');

INSERT INTO glossary (term, category, definition)
SELECT '홈런', '기본용어', '타자가 공을 쳐서 한 번에 홈까지 들어오는 타격.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '홈런');

INSERT INTO glossary (term, category, definition)
SELECT '홈경기', '기본용어', '자기 팀 구장에서 하는 경기.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '홈경기');

INSERT INTO glossary (term, category, definition)
SELECT '눈야구', '기본용어', '선구안을 바탕으로 볼넷을 잘 얻는 스타일.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '눈야구');

INSERT INTO glossary (term, category, definition)
SELECT '이닝', '기본용어', '경기의 기본 단위. 초와 말로 나뉜다.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '이닝');

INSERT INTO glossary (term, category, definition)
SELECT '초', '기본용어', '한 이닝에서 원정팀이 공격하는 차례.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '초');

INSERT INTO glossary (term, category, definition)
SELECT '말', '기본용어', '한 이닝에서 홈팀이 공격하는 차례.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '말');

INSERT INTO glossary (term, category, definition)
SELECT '스트라이크', '기본용어', '타자가 헛스윙했거나 스트라이크 존을 통과한 공.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '스트라이크');

INSERT INTO glossary (term, category, definition)
SELECT '볼', '기본용어', '스트라이크 존을 벗어난 공.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '볼');

INSERT INTO glossary (term, category, definition)
SELECT '삼진', '기본용어', '스트라이크 3개로 타자가 아웃되는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '삼진');

INSERT INTO glossary (term, category, definition)
SELECT '아웃', '기본용어', '타자나 주자가 타격이나 주루 자격을 잃는 것. 아웃이 되면 해당 타자나 주자는 더그아웃으로 돌아가야 한다. 한 이닝에 아웃이 세 번 선언되면 그 이닝은 끝나며, 다음 이닝으로 넘어간다.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '아웃');

INSERT INTO glossary (term, category, definition)
SELECT '파울', '기본용어', '타자가 친 공이 1루·3루 파울 라인 바깥쪽에 떨어지거나 바깥으로 나가는 것. 스트라이크가 0개나 1개일 때 파울은 스트라이크 1개로 카운트되지만, 2스트라이크 이후의 파울은 스트라이크로 세지 않아 삼진이 되지 않고 타석이 계속된다(단, 파울 플라이를 수비가 잡으면 아웃, 2스트라이크에서 번트가 파울이 되면 삼진).'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '파울');

INSERT INTO glossary (term, category, definition)
SELECT '작가', '기본용어', '경기 흐름을 극적으로 망쳐 드라마를 쓰는 투수에게 붙는 조롱형 표현.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '작가');

INSERT INTO glossary (term, category, definition)
SELECT '번트', '기본용어', '방망이에 공을 가볍게 맞혀 굴리는 작전.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '번트');

INSERT INTO glossary (term, category, definition)
SELECT '도루', '기본용어', '주자가 수비 틈을 타 다음 베이스로 가는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '도루');

INSERT INTO glossary (term, category, definition)
SELECT '연장전', '기본용어', '정규 이닝 이후에도 동점일 때 추가로 진행하는 경기.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '연장전');

INSERT INTO glossary (term, category, definition)
SELECT '타율', '기본용어', '안타를 타수로 나눈 값. 타자의 기본 타격 정확도를 나타낸다. 3할(0.300) 이상이면 잘 치는 타자로 평가받고, 리그 전체에서도 손꼽히는 수준이다.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '타율');

INSERT INTO glossary (term, category, definition)
SELECT '평균자책점', '기본용어', '9이닝 기준 투수가 내준 자책점 평균. 실점 억제 능력을 본다.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '평균자책점');

INSERT INTO glossary (term, category, definition)
SELECT '득점', '기본용어', '주자가 홈에 들어와 점수를 얻는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '득점');

INSERT INTO glossary (term, category, definition)
SELECT '타점', '기본용어', '타자의 플레이로 주자가 득점했을 때 기록되는 수치.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '타점');

INSERT INTO glossary (term, category, definition)
SELECT '만루', '기본용어', '1루, 2루, 3루에 모두 주자가 있는 상황.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '만루');

INSERT INTO glossary (term, category, definition)
SELECT '병살', '기본용어', '한 번의 수비 플레이로 아웃 2개를 잡는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '병살');

INSERT INTO glossary (term, category, definition)
SELECT '볼넷', '기본용어', '볼 4개로 타자가 1루에 출루하는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '볼넷');

INSERT INTO glossary (term, category, definition)
SELECT '대주자', '기본용어', '진루한 타자나 주자를 대신해 본루를 제외한 베이스에 들어서는 주자. 경기 후반이나 득점이 필요한 중요한 순간에 발이 느린 선수가 출루했을 때 발이 빠른 선수들이 대주자로 투입되는 경우가 많다. 대주자 역할만을 위해 1군에서 기용되는 선수들도 있다.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '대주자');

INSERT INTO glossary (term, category, definition)
SELECT '대타', '기본용어', '기존 타자 대신 타석에 들어서는 선수.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '대타');

INSERT INTO glossary (term, category, definition)
SELECT '마무리', '기본용어', '경기 마지막을 책임지는 투수.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '마무리');

INSERT INTO glossary (term, category, definition)
SELECT '선발', '기본용어', '경기 시작부터 던지는 투수.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '선발');

INSERT INTO glossary (term, category, definition)
SELECT '끝내기 안타', '기본용어', '끝내기 상황에서 나온 안타.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '끝내기 안타');

INSERT INTO glossary (term, category, definition)
SELECT '끝내기', '기본용어', '마지막 공격에서 점수를 내며 경기를 바로 끝내는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '끝내기');

INSERT INTO glossary (term, category, definition)
SELECT '인필드 플라이', '기본용어', '아웃카운트가 1개 이하이고, 1루와 2루에 주자가 있는 상황(만루 포함)에서의 내야 플라이. 고의 낙구를 이용한 병살이나 삼중살을 방지하기 위해, 야수가 충분히 잡을 수 있다고 판단되면 미리 플라이 아웃을 선언할 수 있다.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '인필드 플라이');

INSERT INTO glossary (term, category, definition)
SELECT '희생플라이', '기본용어', '외야 플라이로 주자가 홈에 들어오게 하는 플레이.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '희생플라이');

INSERT INTO glossary (term, category, definition)
SELECT '희생번트', '기본용어', '본인은 아웃되더라도 주자를 진루시키기 위한 번트.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '희생번트');

INSERT INTO glossary (term, category, definition)
SELECT '와일드피치', '기본용어', '폭투의 영어 표현(wild pitch). 투수가 포수가 잡을 수 없을 만큼 빠지게 던져 주자가 진루하는 것으로, 투수의 잘못으로 기록된다. 포수가 잡을 수 있던 공을 놓친 포일(패스트볼)과 구분된다.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '와일드피치');

INSERT INTO glossary (term, category, definition)
SELECT '포일', '기본용어', '포수가 잡을 수 있는 공을 놓치는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '포일');

INSERT INTO glossary (term, category, definition)
SELECT '견제구', '기본용어', '타자가 안타나 사사구 등으로 출루하여 베이스에 가 있을 때, 투수가 타자를 아웃시킬 목적으로 그 베이스에 송구하는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '견제구');

INSERT INTO glossary (term, category, definition)
SELECT '호수비', '기본용어', '뛰어난 수비 플레이.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '호수비');

INSERT INTO glossary (term, category, definition)
SELECT 'OPS', '기본용어', '출루율과 장타율을 더한 값. 타자의 종합 공격력을 본다.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = 'OPS');

INSERT INTO glossary (term, category, definition)
SELECT '세이브', '기본용어', '리드를 지키고 경기를 끝낸 마무리 투수의 기록.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '세이브');

INSERT INTO glossary (term, category, definition)
SELECT 'WHIP', '기본용어', '이닝당 출루(안타+볼넷) 허용률. 주자를 얼마나 내보내는지를 본다.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = 'WHIP');

INSERT INTO glossary (term, category, definition)
SELECT 'WAR', '기본용어', '대체 선수 대비 승리 기여도. 선수의 종합 가치를 하나의 숫자로 나타낸다.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = 'WAR');

INSERT INTO glossary (term, category, definition)
SELECT '승', '기본용어', '승리투수에게 주어지는 기록.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '승');

INSERT INTO glossary (term, category, definition)
SELECT '원정', '기본용어', '상대팀 구장에 가서 응원하거나 경기하는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '원정');

INSERT INTO glossary (term, category, definition)
SELECT '거포', '기본용어', '홈런과 장타를 많이 치는 타자.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '거포');

INSERT INTO glossary (term, category, definition)
SELECT '삼중살', '기본용어', '타자의 타격 후 수비수가 그 타구를 잡아 3명의 주자를 아웃시키는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '삼중살');

INSERT INTO glossary (term, category, definition)
SELECT '도루자', '기본용어', '주자가 도루를 시도하다가 실패하여 아웃당하는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '도루자');

INSERT INTO glossary (term, category, definition)
SELECT '주루사', '기본용어', '주자가 베이스를 달리다 아웃되는 것.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '주루사');

INSERT INTO glossary (term, category, definition)
SELECT '주루', '기본용어', '주자가 어느 누(베이스)에서 다음 누로 달리는 일.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '주루');

INSERT INTO glossary (term, category, definition)
SELECT '매진', '기본용어', '경기장 좌석이 모두 판매된 상태.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '매진');

INSERT INTO glossary (term, category, definition)
SELECT '홈런공장', '기본용어', '홈런이 자주 나오는 구장이나 타선을 말함.'
WHERE NOT EXISTS (SELECT 1 FROM glossary WHERE term = '홈런공장');
