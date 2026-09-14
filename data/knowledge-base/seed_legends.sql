-- 자동 생성(2026-09 복구): 구글 드라이브 팀 원본 문서에서 파싱.
-- 재실행 안전(중복 검사 / ON CONFLICT).

-- legends: 구단별 대표 레전드·유명 스타 (KBO_구단별_선수_2026_정정본.xlsx). jersey_no=영구결번만.

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HT', '선동열', '투수', '해태 1985~1995', '대표 레전드. 역대 최고 투수. 1993년 방어율 0.78 (2026 현재: 은퇴)', '18'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HT' AND name = '선동열');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HT', '이종범', '내야수/외야수', '해태·KIA 1993~2011', '대표 레전드. ''바람의 아들''. 1994년 84도루 (2026 현재: 은퇴)', '7'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HT' AND name = '이종범');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HT', '김성한', '내야수', '해태 1982~1995', '유명 스타. 해태 왕조의 원년 대표 타자 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HT' AND name = '김성한');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HT', '이대진', '투수', '해태·KIA 1993~2007', '유명 스타. 해태 말기~KIA 초기 대표 우완 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HT' AND name = '이대진');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HT', '윤석민', '투수', 'KIA 2005~2016', '유명 스타. 2011년 투수 4관왕·MVP (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HT' AND name = '윤석민');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HT', '양현종', '투수', 'KIA 2007~ (중간 MLB)', '유명 스타. 원클럽맨 좌완 에이스. 통산 다승 최상위권 (2026 현재: KIA (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HT' AND name = '양현종');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HT', '최형우', '외야수/지명', 'KIA 2017~2025 (삼성 출신)', '유명 스타. KBO 통산 타점 선두권 거포. 2026년 삼성 복귀 (2026 현재: 삼성 (이적))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HT' AND name = '최형우');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HT', '김도영', '내야수', 'KIA 2022~', '유명 스타. 2024년 정규시즌 MVP (2026 현재: KIA (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HT' AND name = '김도영');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SS', '이승엽', '1루수', '삼성 1995~2003, 2012~2017', '대표 레전드. ''국민타자''. 통산 467홈런 (2024년 최정이 경신, 현 역대 2위) (2026 현재: 은퇴)', '36'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SS' AND name = '이승엽');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SS', '양준혁', '외야수/1루수', '삼성 1993~2010 (중간 해태·LG)', '대표 레전드. 통산 누적 기록의 상징 (2026 현재: 은퇴)', '10'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SS' AND name = '양준혁');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SS', '이만수', '포수', '삼성 1982~1997', '대표 레전드. 원년 스타. 최초 타격 트리플크라운 (2026 현재: 은퇴)', '22'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SS' AND name = '이만수');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SS', '오승환', '투수', '삼성 2005~2013, 2020~2025 (중간 일본·MLB)', '대표 레전드. ''끝판왕''. 통산 최다 세이브 (2026 현재: 은퇴 (2025))', '21'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SS' AND name = '오승환');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SS', '배영수', '투수', '삼성 2000~2015', '유명 스타. 2004년 한국시리즈 명품 투구 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SS' AND name = '배영수');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SS', '박한이', '외야수', '삼성 2001~2018', '유명 스타. 삼성 원클럽맨 교타자 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SS' AND name = '박한이');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SS', '구자욱', '외야수', '삼성 2015~', '유명 스타. 현역 프랜차이즈 스타 (2026 현재: 삼성 (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SS' AND name = '구자욱');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HH', '송진우', '투수', '빙그레·한화 1989~2009', '대표 레전드. 통산 최다승(210승) (2026 현재: 은퇴)', '21'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HH' AND name = '송진우');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HH', '정민철', '투수', '빙그레·한화 1992~2009', '대표 레전드. 한화 대표 우완 에이스 (2026 현재: 은퇴)', '23'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HH' AND name = '정민철');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HH', '장종훈', '내야수', '빙그레·한화 1987~2005', '대표 레전드. 연습생 신화. 최초 거포형 홈런왕 (2026 현재: 은퇴)', '35'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HH' AND name = '장종훈');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HH', '김태균', '1루수', '한화 2001~2021 (중간 일본)', '대표 레전드. 한화 프랜차이즈 대표 타자 (2026 현재: 은퇴)', '52'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HH' AND name = '김태균');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HH', '류현진', '투수', '한화 2006~2012, 2024~ (중간 MLB)', '대표 레전드. ''괴물''. 2006년 신인 트리플크라운 (2026 현재: 한화 (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HH' AND name = '류현진');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HH', '구대성', '투수', '빙그레·한화 1993~2000, 2010 (중간 일본)', '유명 스타. ''대성불패''. 한화 대표 마무리 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HH' AND name = '구대성');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'HH', '박찬호', '투수', '한화 2012 (MLB 후 마지막 시즌)', '유명 스타. ''코리안 특급''. MLB 통산 124승 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'HH' AND name = '박찬호');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LT', '최동원', '투수', '롯데 1983~1988', '대표 레전드. 1984년 한국시리즈 혼자 4승 (2026 현재: 은퇴)', '11'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LT' AND name = '최동원');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LT', '이대호', '1루수', '롯데 2001~2011, 2017~2022 (중간 일본·미국)', '대표 레전드. ''조선의 4번타자''. 2010 타격 7관왕 (2026 현재: 은퇴)', '10'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LT' AND name = '이대호');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LT', '윤학길', '투수', '롯데 1986~1997', '유명 스타. ''고독한 황태자''. 통산 최다 완투 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LT' AND name = '윤학길');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LT', '박정태', '내야수', '롯데 1991~2004', '유명 스타. ''악바리''. 최다 연속경기 안타 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LT' AND name = '박정태');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LT', '염종석', '투수', '롯데 1992~2002', '유명 스타. 1992년 신인왕·우승 주역 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LT' AND name = '염종석');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LT', '손아섭', '외야수', '롯데 2007~2021, NC 2024~2025, 한화 2025~2026, 두산 2026~', '유명 스타. KBO 통산 최다 안타 기록 보유 (2026 현재: 두산 (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LT' AND name = '손아섭');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LT', '전준우', '외야수', '롯데 2008~', '유명 스타. 현역 원클럽맨 베테랑 (2026 현재: 롯데 (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LT' AND name = '전준우');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LG', '이병규', '외야수', 'LG 1997~2006, 2010~2016 (중간 일본)', '대표 레전드. ''적토마''. LG 대표 교타자 (2026 현재: 은퇴)', '9'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LG' AND name = '이병규');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LG', '박용택', '외야수', 'LG 2002~2020', '대표 레전드. 원클럽맨. 통산 2504안타 (2024년 손아섭이 경신, 현 역대 2위) (2026 현재: 은퇴)', '33'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LG' AND name = '박용택');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LG', '김용수', '투수', 'MBC·LG 1985~2000', '대표 레전드. 초창기 대표 마무리 투수 (2026 현재: 은퇴)', '41'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LG' AND name = '김용수');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LG', '이상훈', '투수', 'LG 1993~1997, 2002~2004 (중간 일본·미국)', '유명 스타. ''야생마''. 90년대 좌완 에이스 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LG' AND name = '이상훈');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LG', '김재현', '외야수', 'LG 1994~2004 (이후 SK)', '유명 스타. ''캐넌히터''. 호타준족 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LG' AND name = '김재현');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LG', '봉중근', '투수', 'LG 2007~2018 (MLB 후 합류)', '유명 스타. 국가대표 좌완. ''봉열사''(2009 WBC) (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LG' AND name = '봉중근');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'LG', '오지환', '유격수', 'LG 2009~', '유명 스타. 현역 원클럽맨. 2023 우승 주역 (2026 현재: LG (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'LG' AND name = '오지환');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'OB', '박철순', '투수', 'OB 1982~1996', '대표 레전드. 원년 우승 주역. 22연승 (2026 현재: 은퇴)', '21'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'OB' AND name = '박철순');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'OB', '김동주', '내야수', 'OB·두산 1998~2014', '유명 스타. ''두목곰''. 두산 대표 거포 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'OB' AND name = '김동주');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'OB', '홍성흔', '포수/지명', 'OB·두산 1999~2008 (이후 롯데)', '유명 스타. 두산 초기 안방마님 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'OB' AND name = '홍성흔');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'OB', '김현수', '외야수', '두산 2006~2015, LG 2018~2025, KT 2026~', '유명 스타. ''타격기계''. 2026년 KT 이적 (2026 현재: KT (이적))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'OB' AND name = '김현수');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'OB', '유희관', '투수', '두산 2009~2021', '유명 스타. ''느림의 미학'' (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'OB' AND name = '유희관');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'OB', '양의지', '포수', '두산 2006~2018, 2023~ (중간 NC)', '유명 스타. 최고의 공격형 포수 (2026 현재: 두산 (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'OB' AND name = '양의지');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'OB', '정수빈', '외야수', '두산 2009~', '유명 스타. 현역 원클럽맨 (2026 현재: 두산 (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'OB' AND name = '정수빈');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SK', '박경완', '포수', 'SK 2003~2013', '대표 레전드. 최고 수비형 포수. 한 경기 4홈런 (2026 현재: 은퇴)', '26'
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SK' AND name = '박경완');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SK', '김광현', '투수', 'SK·SSG 2007~ (중간 MLB)', '대표 레전드. 팀의 상징 에이스 (2026 현재: SSG (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SK' AND name = '김광현');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SK', '최정', '3루수', 'SK·SSG 2005~', '대표 레전드. KBO 통산 최다 홈런 기록 보유 (2026 현재: SSG (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SK' AND name = '최정');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SK', '정근우', '내야수', 'SK 2005~2013 (이후 한화·LG)', '유명 스타. 국가대표 2루수. 베이징 금메달 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SK' AND name = '정근우');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SK', '김강민', '외야수', 'SK·SSG 2001~2023 (이후 한화)', '유명 스타. 2022년 한국시리즈 영웅 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SK' AND name = '김강민');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SK', '박정권', '1루수', 'SK 2005~2017', '유명 스타. 가을야구 클러치 히터 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SK' AND name = '박정권');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'SK', '추신수', '외야수', 'SSG 2021~2024 (MLB 후 합류)', '유명 스타. MLB 장수 스타 출신 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'SK' AND name = '추신수');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'NC', '나성범', '외야수', 'NC 2012~2021, KIA 2022~', '대표 레전드. ''NC의 심장''. 창단 초기 프랜차이즈 스타 (2026 현재: KIA (이적))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'NC' AND name = '나성범');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'NC', '에릭 테임즈', '1루수', 'NC 2014~2016', '대표 레전드. KBO 최초 40-40 달성 (2026 현재: 해외 (KBO 떠남))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'NC' AND name = '에릭 테임즈');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'NC', '이호준', '1루수/지명', 'NC 2013~2016 (해태·SK 출신)', '유명 스타. 창단기 베테랑 리더 (2026 현재: 은퇴 (현 NC 감독))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'NC' AND name = '이호준');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'NC', '이재학', '투수', '두산 2010~2011, NC 2012~', '유명 스타. 2013년 신인왕 (2026 현재: NC (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'NC' AND name = '이재학');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'NC', '김태군', '포수', 'LG 2008~2012, NC 2013~2021, 삼성 2022~2023, KIA 2024~', '유명 스타. 창단 멤버 안방마님. 2024년 KIA 이적 (2026 현재: KIA (이적))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'NC' AND name = '김태군');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'NC', '박민우', '내야수', 'NC 2012~', '유명 스타. 현역 원클럽맨 프랜차이즈 (2026 현재: NC (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'NC' AND name = '박민우');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'KT', '강백호', '타자', 'KT 2018~2025, 한화 2026~ (중간NPB)', '대표 레전드. 팀 대표 거포. 2026년 한화 FA 이적 (2026 현재: 한화 (이적))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'KT' AND name = '강백호');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'KT', '고영표', '투수', 'KT 2014~', '대표 레전드. 팀의 대표 프랜차이즈 투수 (2026 현재: KT (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'KT' AND name = '고영표');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'KT', '박경수', '내야수', 'LG 2003~2014, KT 2015~2025 (LG 출신)', '유명 스타. 창단기 주장 베테랑 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'KT' AND name = '박경수');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'KT', '황재균', '3루수', 'KT 2018~2025 (현대·롯데·MLB 거침)', '유명 스타. 장타력 있는 3루수 (2026 현재: 은퇴 (2025))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'KT' AND name = '황재균');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'KT', '멜 로하스 주니어', '외야수', 'KT 2017~2020, 2024~2025', '유명 스타. 2020년 정규시즌 MVP (2026 현재: 해외 (KBO 떠남))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'KT' AND name = '멜 로하스 주니어');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'KT', '소형준', '투수', 'KT 2020~', '유명 스타. 2020년 신인왕 (2026 현재: KT (현역))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'KT' AND name = '소형준');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'WO', '이정후', '외야수', '넥센·키움 2017~2023 (이후 MLB)', '대표 레전드. ''바람의 손자''. 타격왕 (2026 현재: MLB (해외))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'WO' AND name = '이정후');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'WO', '박병호', '1루수', '넥센·키움 2012~2021 (LG 출신, 중간 MLB)', '대표 레전드. 홈런왕 4연패(2012~2015) (2026 현재: 은퇴 (2025))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'WO' AND name = '박병호');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'WO', '강정호', '유격수', '현대·넥센 2006~2014 (이후 MLB)', '대표 레전드. 유격수 최초 40홈런(2014) (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'WO' AND name = '강정호');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'WO', '이택근', '외야수', '현대·넥센 2004~2019 (중간 LG)', '유명 스타. 히어로즈 상징 프랜차이즈 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'WO' AND name = '이택근');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'WO', '서건창', '내야수', '넥센·키움 2012~2021, 2026~ (중간 LG·KIA)', '유명 스타. 2014년 단일시즌 최다 안타(201개) (2026 현재: 현역)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'WO' AND name = '서건창');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'WO', '김하성', '유격수', '넥센·키움 2014~2020 (이후 MLB)', '유명 스타. MLB(샌디에이고) 진출 (2026 현재: MLB (해외))', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'WO' AND name = '김하성');

INSERT INTO legends (team_code, name, position, era, note, jersey_no)
SELECT 'WO', '김병현', '투수', '넥센 2012~2015 (이후 KIA)', '유명 스타. MLB 월드시리즈 우승 출신 (2026 현재: 은퇴)', NULL
WHERE NOT EXISTS (SELECT 1 FROM legends WHERE team_code = 'WO' AND name = '김병현');
