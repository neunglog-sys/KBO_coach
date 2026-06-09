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

const FOOD_IMAGE_MAP: Record<string, Record<string, string>> = {
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
    .replace(/[\s·ㆍ\-_/()]+/g, "");
}

function findFoodImageUrl(teamCode: string, foodName: string) {
  const teamImages = FOOD_IMAGE_MAP[teamCode];
  if (!teamImages) return "";

  const normalizedFoodName = normalizeFoodName(foodName);
  const matched = Object.entries(teamImages).find(([name]) => (
    normalizedFoodName === normalizeFoodName(name) ||
    normalizedFoodName.includes(normalizeFoodName(name)) ||
    normalizeFoodName(name).includes(normalizedFoodName)
  ));

  return matched?.[1] ?? "";
}

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
    description: summary,
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

export function matchesStadiumSearch(searchValue: string, stadium: Stadium) {
  const query = normalize(searchValue);
  if (!query) return true;
  return [
    stadium.teamCode,
    stadium.teamName,
    stadium.stadiumName,
    stadium.address,
    stadium.city,
    ...stadium.regionInfo.nearbyAreas,
  ].some((value) => normalize(value).includes(query));
}
