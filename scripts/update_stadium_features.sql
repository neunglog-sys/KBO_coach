BEGIN;

UPDATE stadiums AS s
SET features = v.features
FROM (
  VALUES
    ('LG', 'LG와 두산이 공동으로 사용하는 홈구장입니다.'),
    ('OB', 'LG와 두산이 공동으로 사용하는 홈구장입니다.'),
    ('WO', '국내 최초 돔구장이며 비, 폭염, 미세먼지의 영향이 적습니다.'),
    ('SK', '문학경기장 단지 내에 위치합니다.'),
    ('KT', '수원종합운동장 내에 위치하고 있으며, 2026시즌 시설 개선을 진행하였습니다.'),
    ('HT', 'KIA 팬덤의 열기가 강합니다.'),
    ('SS', '팔각형 구조가 특징인 대구 대표 야구장입니다.'),
    ('LT', '부산 야구의 상징인 사직야구장입니다.'),
    ('HH', '2025년 개장한 신구장이며, 비대칭 구조와 우측 몬스터월이 특징입니다.'),
    ('NC', '관람 시야가 좋은 편에 속하는 신식 구장이며, 마산역에서의 접근성이 좋습니다.')
) AS v(team_code, features)
WHERE s.team_code = v.team_code;

DO $$
DECLARE
  updated_count integer;
BEGIN
  SELECT count(*)
  INTO updated_count
  FROM stadiums
  WHERE team_code IN ('LG', 'OB', 'WO', 'SK', 'KT', 'HT', 'SS', 'LT', 'HH', 'NC');

  IF updated_count <> 10 THEN
    RAISE EXCEPTION 'Expected 10 stadium rows, found %', updated_count;
  END IF;
END
$$;

SELECT team_code, name, features
FROM stadiums
WHERE team_code IN ('LG', 'OB', 'WO', 'SK', 'KT', 'HT', 'SS', 'LT', 'HH', 'NC')
ORDER BY CASE team_code
  WHEN 'LG' THEN 1
  WHEN 'OB' THEN 2
  WHEN 'WO' THEN 3
  WHEN 'SK' THEN 4
  WHEN 'KT' THEN 5
  WHEN 'HT' THEN 6
  WHEN 'SS' THEN 7
  WHEN 'LT' THEN 8
  WHEN 'HH' THEN 9
  WHEN 'NC' THEN 10
END;

COMMIT;
