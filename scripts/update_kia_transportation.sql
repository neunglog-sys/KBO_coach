BEGIN;

UPDATE stadiums
SET
  subway = '광주 1호선 농성역 또는 돌고개역에서 버스·택시 연계 추천',
  ktx_info = 'KTX 이용 시 광주송정역 하차',
  taxi_info = '광주송정역 → 챔피언스필드 택시 약 25~35분',
  bus_info = '광주송정역 → 챔피언스필드 대중교통 약 40~55분',
  parking = '챔피언스필드 지하주차장, 무등야구장 주차장, 임동공영주차장 등'
WHERE team_code = 'HT';

DO $$
BEGIN
  IF (SELECT count(*) FROM stadiums WHERE team_code = 'HT') <> 1 THEN
    RAISE EXCEPTION 'KIA stadium row (HT) was not found';
  END IF;
END
$$;

SELECT team_code, subway, ktx_info, taxi_info, bus_info, parking
FROM stadiums
WHERE team_code = 'HT';

COMMIT;
