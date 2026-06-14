BEGIN;

UPDATE stadiums
SET bus_info = NULL
WHERE team_code = 'SS'
  AND bus_info = '동대구역 → 삼성라이온즈파크 약 35~45분';

COMMIT;
