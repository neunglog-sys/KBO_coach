export interface Food {
  foodId: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface RegionInfo {
  transportation: string[];
  attractions: string[];
  nearbyAreas: string[];
}

export interface Stadium {
  stadiumId: number | null;
  teamCode: string;
  teamName: string;
  city: string;
  stadiumName: string;
  teamNames: string[];
  address: string;
  imageUrl: string;
  description: string;
  tips: string[];
  foods: Food[];
  regionInfo: RegionInfo;
}

export interface StadiumApiRow {
  stadium_id: number | null;
  team_code: string;
  team_name: string;
  city: string | null;
  home_stadium: string | null;
  name: string | null;
  location: string | null;
  parking: string | null;
  subway: string | null;
  food: string | null;
  stadium_size: string | null;
  seat_count: string | null;
  features: string | null;
  ktx_info: string | null;
  taxi_info: string | null;
  bus_info: string | null;
  parking_tip: string | null;
  restaurants: string | null;
  tourism: string | null;
  accommodations: string | null;
  reservation_site: string | null;
  reservation_tip: string | null;
}

const STADIUM_IMAGES: Record<string, string> = {
  LG: "/img/잠실구장.png",
  OB: "/img/잠실구장.png",
};

const FOOD_IMAGE_BASE = "/img/kbo_stadium_food";

// 잠실야구장(LG·두산 공용) 먹거리 — 백엔드 음식명 → 이미지 파일 매핑.
const JAMSIL_FOODS: Record<string, string> = {
  김치말이국수: `${FOOD_IMAGE_BASE}/잠실음식_webp/01_김치말이국수.png`,
  삼겹살도시락: `${FOOD_IMAGE_BASE}/잠실음식_webp/02_삼겹살도시락.png`,
  "우이락 고추튀김": `${FOOD_IMAGE_BASE}/잠실음식_webp/03_우이락 고추튀김.png`,
  "보영만두 군만두/쫄면": `${FOOD_IMAGE_BASE}/잠실음식_webp/04_보영만두 군만두 찐만두.png`,
  "BHC 치킨": `${FOOD_IMAGE_BASE}/잠실음식_webp/05_BHC치킨.png`,
  "BBQ 치킨": `${FOOD_IMAGE_BASE}/잠실음식_webp/06_BBQ치킨.png`,
  피자헛: `${FOOD_IMAGE_BASE}/잠실음식_webp/07_피자헛.png`,
  도미노피자: `${FOOD_IMAGE_BASE}/잠실음식_webp/08_도미노피자.png`,
  죠스떡볶이: `${FOOD_IMAGE_BASE}/잠실음식_webp/09_죠스떡볶이.png`,
  명인만두: `${FOOD_IMAGE_BASE}/잠실음식_webp/10_명인만두.png`,
  "통밥/덮밥류": `${FOOD_IMAGE_BASE}/잠실음식_webp/11_통밥 덮밥류.png`,
  KFC: `${FOOD_IMAGE_BASE}/잠실음식_webp/12_KFC.png`,
  맘스터치: `${FOOD_IMAGE_BASE}/잠실음식_webp/13_맘스터치.png`,
  브뤼셀프라이: `${FOOD_IMAGE_BASE}/잠실음식_webp/14_브리셸프라이.png`,
  타코잇: `${FOOD_IMAGE_BASE}/잠실음식_webp/15_타코잇.png`,
  픽베이크: `${FOOD_IMAGE_BASE}/잠실음식_webp/16_픽베이크.png`,
  생맥주: `${FOOD_IMAGE_BASE}/잠실음식_webp/17_생맥주.png`,
  "맥주보이 좌석 판매 생맥주": `${FOOD_IMAGE_BASE}/잠실음식_webp/18_맥주보이 좌석판매 생맥주.png`,
};

const FOOD_IMAGE_MAP: Record<string, Record<string, string>> = {
  LG: JAMSIL_FOODS,
  OB: JAMSIL_FOODS,
  HT: {
    원샷치킨: `${FOOD_IMAGE_BASE}/KIA음식_webp/07_원샷치킨.webp`,
    "스테이션 크림새우": `${FOOD_IMAGE_BASE}/KIA음식_webp/08_스테이션_크림새우.webp`,
    칠리새우: `${FOOD_IMAGE_BASE}/KIA음식_webp/09_칠리새우.webp`,
    보영만두: `${FOOD_IMAGE_BASE}/KIA음식_webp/10_보영만두.webp`,
    감탄떡볶이: `${FOOD_IMAGE_BASE}/KIA음식_webp/11_감탄떡볶이.webp`,
    스트릿츄러스: `${FOOD_IMAGE_BASE}/KIA음식_webp/12_스트릿츄러스.webp`,
    요아정: `${FOOD_IMAGE_BASE}/KIA음식_webp/01_요아정.webp`,
    타코잇: `${FOOD_IMAGE_BASE}/KIA음식_webp/02_타코잇.webp`,
    파파존스: `${FOOD_IMAGE_BASE}/KIA음식_webp/03_파파존스.webp`,
    프랭크버거: `${FOOD_IMAGE_BASE}/KIA음식_webp/04_프랭크버거.webp`,
    BHC: `${FOOD_IMAGE_BASE}/KIA음식_webp/05_BHC.webp`,
    XOXO핫도그: `${FOOD_IMAGE_BASE}/KIA음식_webp/06_XOXO핫도그.webp`,
  },
  NC: {
    수내닭꼬치: `${FOOD_IMAGE_BASE}/NC음식_webp/01_수내닭꼬치.webp`,
    "우이락 고추튀김": `${FOOD_IMAGE_BASE}/NC음식_webp/05_우이락_고추튀김.webp`,
    "코아양과 버터떡": `${FOOD_IMAGE_BASE}/NC음식_webp/08_코아양과_버터떡.webp`,
    단디밀셰: `${FOOD_IMAGE_BASE}/NC음식_webp/09_단디밀셰.webp`,
    "스테이션 새우류": `${FOOD_IMAGE_BASE}/NC음식_webp/04_스테이션_새우류.webp`,
    닭꼬치류: `${FOOD_IMAGE_BASE}/NC음식_webp/03_닭꼬치류.webp`,
    치킨: `${FOOD_IMAGE_BASE}/NC음식_webp/06_치킨.webp`,
    분식류: `${FOOD_IMAGE_BASE}/NC음식_webp/02_분식류.webp`,
    "카페/디저트류": `${FOOD_IMAGE_BASE}/NC음식_webp/07_카페_디저트류.webp`,
  },
  LT: {
    "송헌집 숯불 소시지": `${FOOD_IMAGE_BASE}/롯데음식_webp/08_송헌집_숯불소시지.webp`,
    "박수식당 한우육회": `${FOOD_IMAGE_BASE}/롯데음식_webp/06_박수식당_한우육회.webp`,
    "박수식당 젓갈김밥": `${FOOD_IMAGE_BASE}/롯데음식_webp/05_박수식당_젓갈김밥.webp`,
    상하이마라꼬치: `${FOOD_IMAGE_BASE}/롯데음식_webp/07_상하이마라꼬치.webp`,
    스탠브루: `${FOOD_IMAGE_BASE}/롯데음식_webp/09_스탠브루.webp`,
    계란빵클럽: `${FOOD_IMAGE_BASE}/롯데음식_webp/02_계란빵클럽.webp`,
    치킨: `${FOOD_IMAGE_BASE}/롯데음식_webp/10_치킨.webp`,
    밀면: `${FOOD_IMAGE_BASE}/롯데음식_webp/04_밀면.webp`,
    크림새우: `${FOOD_IMAGE_BASE}/롯데음식_webp/12_크림새우.webp`,
    파파존스: `${FOOD_IMAGE_BASE}/롯데음식_webp/13_파파존스.webp`,
    크리스피크림: `${FOOD_IMAGE_BASE}/롯데음식_webp/11_크리스피크림.webp`,
    마라꼬치류: `${FOOD_IMAGE_BASE}/롯데음식_webp/03_마라꼬치류.webp`,
    "QR 스마트오더 가능 매장": `${FOOD_IMAGE_BASE}/롯데음식_webp/01_QR_스마트오더.webp`,
  },
  SS: {
    "강민호 Nice catch 미트 샌드위치": `${FOOD_IMAGE_BASE}/삼성음식_webp/01_비프샌드위치.webp`,
    "라이온즈 핫 블루치즈버거": `${FOOD_IMAGE_BASE}/삼성음식_webp/02_블루치즈치킨버거.webp`,
    막창도시락: `${FOOD_IMAGE_BASE}/삼성음식_webp/03_막창도시락.webp`,
    "만두/분식류": `${FOOD_IMAGE_BASE}/삼성음식_webp/04_만두분식세트.webp`,
    샤오마라: `${FOOD_IMAGE_BASE}/삼성음식_webp/05_매운닭요리.webp`,
    서문빙수: `${FOOD_IMAGE_BASE}/삼성음식_webp/06_팥빙수.webp`,
    "아이스크림/빙수류": `${FOOD_IMAGE_BASE}/삼성음식_webp/07_디저트모둠.webp`,
    연막창: `${FOOD_IMAGE_BASE}/삼성음식_webp/08_막창철판구이.webp`,
    "왕조재건 V9 플래터": `${FOOD_IMAGE_BASE}/삼성음식_webp/09_삼성모둠플래터.webp`,
    "원태인 PICK 막창타코": `${FOOD_IMAGE_BASE}/삼성음식_webp/10_새우타코.webp`,
    "자욱 스타우트": `${FOOD_IMAGE_BASE}/삼성음식_webp/11_흑맥주.webp`,
    치킨: `${FOOD_IMAGE_BASE}/삼성음식_webp/12_후라이드치킨.webp`,
    "하우스 오브 라이온즈": `${FOOD_IMAGE_BASE}/삼성음식_webp/13_그릴플래터.webp`,
    핫도그: `${FOOD_IMAGE_BASE}/삼성음식_webp/14_감자핫도그.webp`,
    "Blue Wave Mocktail": `${FOOD_IMAGE_BASE}/삼성음식_webp/15_블루레몬에이드.webp`,
  },
};

// 메뉴별 설명 — 음식 이름 기준. (없으면 구장 먹거리 요약으로 폴백)
const JAMSIL_FOOD_DESC: Record<string, string> = {
  김치말이국수: "새콤시원한 육수의 김치말이국수. 더운 날 직관 인기 메뉴",
  삼겹살도시락: "고기 가득 든든한 도시락. 잠실 대표 식사 메뉴",
  "우이락 고추튀김": "바삭하게 튀긴 고추튀김. 생맥주 안주로 인기",
  "보영만두 군만두/쫄면": "보영만두의 군만두에 쫄면을 곁들인 분식 세트",
  "BHC 치킨": "바삭바삭 BHC 치킨",
  "BBQ 치킨": "황금올리브로 유명한 치킨 맛집",
  피자헛: "여럿이 나눠 먹기 좋은 피자",
  도미노피자: "토핑 푸짐한 피자.",
  죠스떡볶이: "매콤달콤 국물 떡볶이",
  명인만두: "직접 빚은 전문 손만두 집",
  "통밥/덮밥류": "한 그릇 뚝딱, 간편한 덮밥류",
  KFC: "치킨과 버거를 한 번에",
  맘스터치: "싸이버거로 유명한 맘스터치",
  브뤼셀프라이: "벨기에식 두툼 감자튀김",
  타코잇: "한 손에 즐기는 길거리 타코",
  픽베이크: "달콤한 디저트·베이커리",
  생맥주: "시원하게 들이켜는 생맥주",
  "맥주보이 좌석 판매 생맥주": "자리에서 바로 받는 생맥주. 경기 흐름 놓치지 않고 즐기자!!",
};

const FOOD_DESC_MAP: Record<string, Record<string, string>> = {
  LG: JAMSIL_FOOD_DESC,
  OB: JAMSIL_FOOD_DESC,
  HT: {
    원샷치킨: "한입 사이즈로 즐기는 원샷치킨",
    "스테이션 크림새우": "고소한 크림소스 새우튀김",
    칠리새우: "매콤달콤 칠리소스 새우",
    보영만두: "쫄깃한 만두 맛집",
    감탄떡볶이: "감탄이 나오는 매콤 떡볶이",
    스트릿츄러스: "겉바속촉 길거리 츄러스",
    요아정: "요거트 아이스크림의 정석, 상큼한 디저트",
    타코잇: "한 손에 즐기는 길거리 타코",
    파파존스: "프리미엄 토핑의 피자 맛집",
    프랭크버거: "두툼한 패티의 프랭크버거",
    BHC: "바삭한 BHC 치킨",
    XOXO핫도그: "겉바속촉 수제 핫도그",
  },
  NC: {
    수내닭꼬치: "불맛 가득 수내닭꼬치",
    "우이락 고추튀김": "바삭한 고추튀김, 맥주 안주로 딱",
    "코아양과 버터떡": "고소한 버터떡 디저트",
    단디밀셰: "진하고 달콤한 밀크셰이크",
    "스테이션 새우류": "바삭한 새우튀김 모둠",
    닭꼬치류: "다양한 맛의 닭꼬치",
    치킨: "바삭한 후라이드 치킨",
    분식류: "떡볶이·튀김 등 분식 모둠",
    "카페/디저트류": "커피와 달콤한 디저트",
  },
  LT: {
    "송헌집 숯불 소시지": "숯불에 구운 수제 소시지",
    "박수식당 한우육회": "신선한 한우육회",
    "박수식당 젓갈김밥": "감칠맛 가득 젓갈김밥",
    상하이마라꼬치: "얼얼한 마라 향의 꼬치",
    스탠브루: "사직의 수제맥주 맛집",
    계란빵클럽: "따끈따끈 계란빵",
    치킨: "바삭한 치킨",
    밀면: "부산 대표 별미 밀면",
    크림새우: "고소한 크림소스 새우",
    파파존스: "프리미엄 토핑 피자",
    크리스피크림: "달콤한 크리스피크림 도넛",
    마라꼬치류: "얼얼·매콤 마라 꼬치",
    "QR 스마트오더 가능 매장": "QR로 줄 안 서고 주문하는 매점",
  },
  SS: {
    "강민호 Nice catch 미트 샌드위치": "강민호 추천, 푸짐한 미트 샌드위치",
    "라이온즈 핫 블루치즈버거": "진한 블루치즈의 매콤 버거",
    막창도시락: "대구 별미 막창 도시락",
    "만두/분식류": "만두와 분식 모둠",
    샤오마라: "얼얼한 마라 닭요리",
    서문빙수: "대구 서문시장 스타일 빙수",
    "아이스크림/빙수류": "시원한 아이스크림·빙수",
    연막창: "불향 가득 연막창 구이",
    "왕조재건 V9 플래터": "여럿이 즐기는 푸짐한 모둠 플래터",
    "원태인 PICK 막창타코": "원태인 추천, 막창을 넣은 타코",
    "자욱 스타우트": "묵직한 풍미의 흑맥주",
    치킨: "바삭한 후라이드 치킨",
    "하우스 오브 라이온즈": "라이온즈 시그니처 그릴 플래터",
    핫도그: "겉바속촉 감자 핫도그",
    "Blue Wave Mocktail": "상큼한 블루 레몬에이드 무알콜 칵테일",
  },
};

function compact(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

function splitList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n|[,·]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeFoodName(value: string) {
  return value
    .trim()
    .toLowerCase()
    // 공백·구분기호·따옴표(곧은/둥근) 제거 → 표기 차이에도 같은 메뉴로 매칭
    .replace(/[\s·ㆍ\-_/()"'‘’“”]+/g, "");
}

// 음식 이름으로 맵(이미지/설명)에서 값 찾기 — 정확 일치 우선, 없으면 부분 포함(긴 이름 우선).
function lookupFood(
  map: Record<string, Record<string, string>>,
  teamCode: string,
  foodName: string,
): string {
  const teamMap = map[teamCode];
  if (!teamMap) return "";

  const normalizedFoodName = normalizeFoodName(foodName);

  // 1) 정확히 일치하는 항목 우선 (예: "생맥주" vs "맥주보이…생맥주" 혼동 방지)
  const exact = Object.entries(teamMap).find(
    ([name]) => normalizeFoodName(name) === normalizedFoodName,
  );
  if (exact) return exact[1];

  // 2) 부분 포함 매칭 — 더 구체적인(긴) 이름이 먼저 매칭되도록 정렬
  const fuzzy = Object.entries(teamMap)
    .sort((a, b) => normalizeFoodName(b[0]).length - normalizeFoodName(a[0]).length)
    .find(([name]) => {
      const n = normalizeFoodName(name);
      return normalizedFoodName.includes(n) || n.includes(normalizedFoodName);
    });

  return fuzzy?.[1] ?? "";
}

const findFoodImageUrl = (teamCode: string, foodName: string) =>
  lookupFood(FOOD_IMAGE_MAP, teamCode, foodName);
const findFoodDescription = (teamCode: string, foodName: string) =>
  lookupFood(FOOD_DESC_MAP, teamCode, foodName);

function extractFoodItems(value: string | null, teamCode: string): Food[] {
  if (!value) return [];

  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const popularLine = lines.find((line) => line.startsWith("인기 메뉴 후보:"));
  const summary = lines.find(
    (line) => !line.startsWith("인기 메뉴 후보:") && !line.startsWith("추천 조합:"),
  ) ?? "구장 먹거리 정보입니다.";
  const names = popularLine
    ? popularLine.replace("인기 메뉴 후보:", "").split(",").map((name) => name.trim()).filter(Boolean)
    : lines.slice(0, 6);

  return names.map((name, index) => ({
    foodId: `${index}-${name}`,
    name,
    // 메뉴별 설명 우선, 없으면 구장 먹거리 요약으로 폴백
    description: findFoodDescription(teamCode, name) || summary,
    imageUrl: findFoodImageUrl(teamCode, name),
  }));
}

export function mapStadium(row: StadiumApiRow): Stadium {
  const stadiumName = row.name ?? row.home_stadium ?? "구장정보 준비 중";
  const description = compact([
    row.features,
    row.city ? `${row.city}을 대표하는 ${row.team_name}의 홈구장입니다.` : null,
  ]).join(" ");

  return {
    stadiumId: row.stadium_id,
    teamCode: row.team_code,
    teamName: row.team_name,
    city: row.city ?? "",
    stadiumName,
    teamNames: [row.team_name],
    address: row.location ?? "준비 중입니다",
    imageUrl: STADIUM_IMAGES[row.team_code] ?? "/img/background.png",
    description: description || "준비 중입니다",
    tips: compact([
      row.stadium_size ? `구장 크기: ${row.stadium_size}` : null,
      row.seat_count ? `좌석 수: ${row.seat_count}` : null,
      row.parking_tip,
      row.reservation_tip,
      row.reservation_site ? `예매처: ${row.reservation_site}` : null,
    ]),
    foods: extractFoodItems(row.food, row.team_code),
    regionInfo: {
      transportation: compact([
        row.subway,
        row.ktx_info,
        row.taxi_info,
        row.bus_info,
        row.parking,
      ]),
      attractions: splitList(row.tourism),
      nearbyAreas: compact([
        row.restaurants,
        row.accommodations ? `숙박 추천 지역: ${row.accommodations}` : null,
      ]),
    },
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

// 검색 점수: 3=팀/구장명, 2=도시/주소, 1=주변지역, 0=불일치.
// 점수가 높을수록 "더 직접적인" 매칭 → 예) "삼성"은 삼성(팀명 3점)이 잠실(숙박정보 1점)보다 우선.
export function stadiumSearchScore(searchValue: string, stadium: Stadium): number {
  const query = normalize(searchValue);
  if (!query) return 1;
  const has = (values: Array<string>) => values.some((v) => normalize(v).includes(query));
  if (has([stadium.teamCode, stadium.teamName, stadium.stadiumName])) return 3;
  if (has([stadium.city, stadium.address])) return 2;
  if (has(stadium.regionInfo.nearbyAreas)) return 1;
  return 0;
}

export function matchesStadiumSearch(searchValue: string, stadium: Stadium) {
  return stadiumSearchScore(searchValue, stadium) > 0;
}
