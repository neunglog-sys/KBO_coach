export interface Food {
  foodId: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface RegionInfo {
  transportation: TransportationInfo[];
  attractions: string[];
  nearbyAreas: string[];
}

export interface TransportationInfo {
  kind: "subway" | "bus" | "taxi" | "parking";
  text: string;
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
  LG: "/img/stadium_guide/잠실야구장.png",
  OB: "/img/stadium_guide/잠실야구장.png",
  WO: "/img/stadium_guide/고척스카이돔.png",
  SK: "/img/stadium_guide/인천ssg랜더스필드.png",
  KT: "/img/stadium_guide/수원kt위즈파크.png",
  HT: "/img/stadium_guide/광주기아챔피언스필드.png",
  SS: "/img/stadium_guide/대구삼성라이온즈파크.png",
  LT: "/img/stadium_guide/부산사직야구장.png",
  HH: "/img/stadium_guide/대전한화생명볼파크.png",
  NC: "/img/stadium_guide/창원nc파크.png",
};

// 구단별 홈구장 좌표 — Kakao Maps 마커 표시용.
export const STADIUM_COORDS: Record<string, { lat: number; lng: number }> = {
  LG: { lat: 37.5121, lng: 127.0719 }, // 잠실야구장
  OB: { lat: 37.5121, lng: 127.0719 }, // 잠실야구장
  WO: { lat: 37.4982, lng: 126.8669 }, // 고척스카이돔
  SK: { lat: 37.4373, lng: 126.6932 }, // 인천 SSG 랜더스필드
  KT: { lat: 37.2997, lng: 127.0096 }, // 수원 KT 위즈파크
  HT: { lat: 35.1681, lng: 126.8889 }, // 광주-기아 챔피언스필드
  SS: { lat: 35.8412, lng: 128.6817 }, // 대구 삼성 라이온즈파크
  LT: { lat: 35.1940, lng: 129.0613 }, // 사직야구장
  HH: { lat: 36.3171, lng: 127.4290 }, // 한화생명 볼파크
  NC: { lat: 35.2225, lng: 128.5826 }, // 창원 NC파크
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
    "강민호 “Nice catch” 미트 샌드위치": `${FOOD_IMAGE_BASE}/삼성음식_webp/01_비프샌드위치.webp`,
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
  WO: {
    "쉬림프쉐프 크림새우": `${FOOD_IMAGE_BASE}/키움음식_webp/01_쉬림프쉐프_크림새우.webp`,
    마라새우: `${FOOD_IMAGE_BASE}/키움음식_webp/02_마라새우.webp`,
    땅땅치킨: `${FOOD_IMAGE_BASE}/키움음식_webp/03_땅땅치킨.webp`,
    올리브떡볶이: `${FOOD_IMAGE_BASE}/키움음식_webp/04_올리브떡볶이.webp`,
    BK버거: `${FOOD_IMAGE_BASE}/키움음식_webp/05_BK버거.webp`,
    꼬치닭: `${FOOD_IMAGE_BASE}/키움음식_webp/06_꼬치닭.webp`,
    명랑핫도그: `${FOOD_IMAGE_BASE}/키움음식_webp/07_명랑핫도그.webp`,
    스트릿츄러스: `${FOOD_IMAGE_BASE}/키움음식_webp/08_스트릿츄러스.webp`,
    마왕족발: `${FOOD_IMAGE_BASE}/키움음식_webp/09_마왕족발.webp`,
    초장집: `${FOOD_IMAGE_BASE}/키움음식_webp/10_초장집.webp`,
    BBQ: `${FOOD_IMAGE_BASE}/키움음식_webp/11_BBQ.webp`,
    브뤼셀프라이: `${FOOD_IMAGE_BASE}/키움음식_webp/12_브뤼셀프라이.webp`,
    우이락: `${FOOD_IMAGE_BASE}/키움음식_webp/13_우이락.webp`,
    자담치킨: `${FOOD_IMAGE_BASE}/키움음식_webp/14_자담치킨.webp`,
  },
  SK: {
    컵물회: `${FOOD_IMAGE_BASE}/SSG음식/야구장_속의_신선한_회덮밥.webp`,
    "우이락 고추튀김": `${FOOD_IMAGE_BASE}/SSG음식/야구장_간식과_바삭한_고추.webp`,
    "스테이션 크림새우": `${FOOD_IMAGE_BASE}/SSG음식/야구장_간식_새우튀김과_소스.webp`,
    마라새우: `${FOOD_IMAGE_BASE}/SSG음식/매운_새우_요리와_야구_경기.webp`,
    "허갈 닭강정": `${FOOD_IMAGE_BASE}/SSG음식/야구장을_배경으로_한_닭강정.webp`,
    "버거원더스 치즈푸틴": `${FOOD_IMAGE_BASE}/SSG음식/야구장_속_치즈와_베이컨을_얹은_프라이.webp`,
    "88스테이크버거": `${FOOD_IMAGE_BASE}/SSG음식/야구장에서의_맛있는_햄버거.webp`,
    "랜더스 버거류": `${FOOD_IMAGE_BASE}/SSG음식/랜더스_버거류.webp`,
    "커빙 빙수": `${FOOD_IMAGE_BASE}/SSG음식/야구장_배경의_빙수_디저트.webp`,
    치킨류: `${FOOD_IMAGE_BASE}/SSG음식/치킨류.webp`,
    "떡볶이/분식류": `${FOOD_IMAGE_BASE}/SSG음식/야구장_속_맛있는_길거리_음식.webp`,
    "카페/디저트류": `${FOOD_IMAGE_BASE}/SSG음식/야구장에서_즐기는_달콤한_간식.webp`,
  },
  KT: {
    진미통닭: `${FOOD_IMAGE_BASE}/KT음식/01_진미통닭.webp`,
    보영만두: `${FOOD_IMAGE_BASE}/KT음식/02_보영만두.webp`,
    마성떡볶이: `${FOOD_IMAGE_BASE}/KT음식/03_마성떡볶이.webp`,
    마성스낵: `${FOOD_IMAGE_BASE}/KT음식/04_마성스낵.webp`,
    요아정: `${FOOD_IMAGE_BASE}/KT음식/05_요아정.webp`,
    카츠마마: `${FOOD_IMAGE_BASE}/KT음식/06_카츠마마.webp`,
    "본수원갈비 관련 메뉴": `${FOOD_IMAGE_BASE}/KT음식/07_본수원갈비_관련메뉴.webp`,
    오늘의초밥: `${FOOD_IMAGE_BASE}/KT음식/08_오늘의초밥.webp`,
    브뤼셀프라이: `${FOOD_IMAGE_BASE}/KT음식/09_브뤼셀프라이.webp`,
    정지영커피: `${FOOD_IMAGE_BASE}/KT음식/10_정지영커피.webp`,
    명랑핫도그: `${FOOD_IMAGE_BASE}/KT음식/야구장_간식_핫도그와_치즈.webp`,
    BHC: `${FOOD_IMAGE_BASE}/KT음식/야구장에서_즐기는_치킨_한_접시.webp`,
  },
  HH: {
    "바로그집 떡볶이": `${FOOD_IMAGE_BASE}/한화음식/야구장_속_떡볶이의_한_장면.webp`,
    "바로그집 순대/김말이/우동": `${FOOD_IMAGE_BASE}/한화음식/야구장_속_다양한_길거리_음식.webp`,
    열무말이국수: `${FOOD_IMAGE_BASE}/한화음식/야구장에서_즐기는_시원한_냉면.webp`,
    신전떡볶이: `${FOOD_IMAGE_BASE}/한화음식/경기장_속_떡볶이_한_그릇.webp`,
    연돈볼카츠: `${FOOD_IMAGE_BASE}/한화음식/야구장_속_매운_해물_볶음.webp`,
    역전우동: `${FOOD_IMAGE_BASE}/한화음식/경기_중_먹는_우동_한_그릇.webp`,
    새마을식당: `${FOOD_IMAGE_BASE}/한화음식/야구장_속_맛있는_한_끼.webp`,
    빽보이피자: `${FOOD_IMAGE_BASE}/한화음식/야구장_간식_치즈가_늘어나는_피자.webp`,
    한신포차: `${FOOD_IMAGE_BASE}/한화음식/야구장에서_즐기는_맛있는_간식.webp`,
    크림새우: `${FOOD_IMAGE_BASE}/한화음식/야구장과_함께한_바삭한_새우튀김.webp`,
    "치킨 + 생맥주": `${FOOD_IMAGE_BASE}/한화음식/바삭한_치킨과_시원한_맥주.webp`,
    "ML 핫도그": `${FOOD_IMAGE_BASE}/한화음식/야구장_속_맛있는_핫도그.webp`,
    선비꼬마김밥: `${FOOD_IMAGE_BASE}/한화음식/야구장_속_맛있는_김밥.webp`,
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
    치킨: "시원한 음료와 함께 즐기기 좋은 바삭한 후라이드 치킨",
    "하우스 오브 라이온즈": "라이온즈 시그니처 그릴 플래터",
    핫도그: "달콤바삭한 식감으로 남녀노소 인기 있는 감자 핫도그",
    "Blue Wave Mocktail": "상큼한 블루 레몬에이드 무알콜 칵테일",
  },
  WO: {
    "쉬림프쉐프 크림새우": "고소한 크림소스에 탱글한 새우가 가득한 고척 대표 메뉴",
    마라새우: "얼얼한 마라 향이 매력적인 매콤한 새우 요리",
    땅땅치킨: "가볍게 집어 먹기 좋은 바삭한 순살치킨",
    올리브떡볶이: "매콤달콤한 소스가 입맛을 돋우는 야구장 인기 간식 떡볶이",
    BK버거: "한 끼 식사로 든든한 패티 가득 버거",
    꼬치닭: "한 손에 들고 즐기기 좋은 쫄깃한 닭꼬치",
    명랑핫도그: "한 손에 들고 편하게 즐길 수 있는 든든한 간편 먹거리 핫도그",
    스트릿츄러스: "겉바속촉 달콤한 길거리 츄러스",
    마왕족발: "쫄깃한 식감의 푸짐한 족발, 여럿이 나눠 먹기 좋아",
    초장집: "새콤매콤한 초장 양념의 별미 메뉴",
    BBQ: "겉바속촉 황금올리브 치킨의 정석",
    브뤼셀프라이: "두툼하고 바삭한 벨기에식 감자튀김",
    우이락: "바삭하게 튀긴 매콤한 고추튀김, 맥주 안주로 딱",
    자담치킨: "깔끔한 양념의 순살치킨, 가볍게 즐기기 좋아",
  },
  SK: {
    컵물회: "새콤시원한 육수에 신선한 회가 어우러진 인천 대표 별미",
    "우이락 고추튀김": "바삭하게 튀긴 매콤한 고추튀김, 생맥주와 찰떡궁합",
    "스테이션 크림새우": "고소한 크림소스와 탱글한 새우의 조합",
    마라새우: "얼얼하고 감칠맛 나는 마라 새우 요리",
    "허갈 닭강정": "달콤짭짤한 양념이 어우러진 인천 야구장 인기 메뉴",
    "버거원더스 치즈푸틴": "치즈 듬뿍 올린 바삭한 감자튀김",
    "88스테이크버거": "두툼한 패티가 가득한 든든한 스테이크버거",
    "랜더스 버거류": "한 손에 들고 즐기는 랜더스 시그니처 버거",
    "커빙 빙수": "시원하고 달콤한 인천 대표 빙수 디저트",
    치킨류: "바삭한 튀김옷의 정석, 야구장 대표 치킨",
    "떡볶이/분식류": "쫄깃한 소떡소떡부터 매콤한 떡볶이까지 즐기는 든든한 간식",
    "카페/디저트류": "달콤한 디저트와 향긋한 커피로 즐기는 휴식",
  },
  KT: {
    진미통닭: "수원 지역 특색이 느껴지는 진한 풍미의 수원왕갈비통닭",
    보영만두: "쫄깃한 피와 가득 찬 속재료의 손만두",
    마성떡볶이: "매콤한 양념이 살아있는 야구장 인기 떡볶이",
    마성스낵: "응원하면서 간편하게 즐기기 좋은 핫바·소시지 인기 간식",
    요아정: "상큼한 요거트와 토핑으로 즐기는 디저트",
    카츠마마: "한 끼 식사로도 충분한 든든한 돈카츠 도시락",
    "본수원갈비 관련 메뉴": "수원 지역 특색이 느껴지는 진한 풍미의 갈비 메뉴",
    오늘의초밥: "신선한 재료로 만든 깔끔한 한입 초밥",
    브뤼셀프라이: "두툼하고 바삭한 벨기에식 감자튀김",
    정지영커피: "향긋한 커피 한 잔으로 즐기는 여유",
    명랑핫도그: "한 손에 들고 편하게 즐길 수 있는 든든한 간편 먹거리 핫도그",
    BHC: "바삭바삭 노릇한 BHC 치킨",
  },
  HH: {
    "바로그집 떡볶이": "매콤달콤한 맛으로 누구나 부담 없이 즐기기 좋은 대전 로컬 떡볶이",
    "바로그집 순대/김말이/우동": "푸짐한 순대와 김말이, 따뜻한 우동까지 즐기는 분식 세트",
    열무말이국수: "새콤시원한 열무 육수의 국수, 더운 날 직관 인기 메뉴",
    신전떡볶이: "매콤한 국물 떡볶이, 야구장에서도 인기 만점",
    연돈볼카츠: "겉바속촉 동그랑 돈카츠를 한입에 즐기는 별미",
    역전우동: "따뜻한 국물의 우동 한 그릇, 출출할 때 든든",
    새마을식당: "푸짐한 한 상 차림으로 즐기는 든든한 한 끼",
    빽보이피자: "치즈 가득한 도우의 든든한 피자",
    한신포차: "야구장에서 즐기는 포차 감성 안주 메뉴",
    크림새우: "고소한 크림소스와 탱글한 새우의 조합",
    "치킨 + 생맥주": "진한 불향과 감칠맛이 살아 있는 치킨에 시원한 생맥주까지",
    "ML 핫도그": "한 손에 들고 편하게 즐길 수 있는 든든한 간편 먹거리 핫도그",
    선비꼬마김밥: "한입 크기로 가볍게 즐기는 든든한 꼬마김밥",
  },
};

function compact(values: Array<string | null | undefined>): string[] {
  return values.map((value) => value?.trim()).filter((value): value is string => Boolean(value));
}

function uniqueTransportation(
  values: Array<TransportationInfo | null>,
): TransportationInfo[] {
  const seen = new Set<string>();
  return values.filter((value): value is TransportationInfo => {
    if (!value?.text.trim()) return false;
    const key = value.text.replace(/\s+/g, " ").trim();
    if (
      seen.has(key) ||
      Array.from(seen).some((existing) => existing.includes(key) || key.includes(existing))
    ) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function transportationItems(row: StadiumApiRow): TransportationInfo[] {
  const ktxItems = row.ktx_info
    ? row.ktx_info.split(/\s*\/\s*/).map((text): TransportationInfo => {
        if (/택시/.test(text)) return { kind: "taxi", text };
        if (/버스|대중교통/.test(text)) return { kind: "bus", text };
        return { kind: "subway", text };
      })
    : [];

  return uniqueTransportation([
    row.subway ? { kind: "subway", text: row.subway } : null,
    ...ktxItems,
    row.taxi_info ? { kind: "taxi", text: row.taxi_info } : null,
    row.bus_info ? { kind: "bus", text: row.bus_info } : null,
    row.parking ? { kind: "parking", text: row.parking } : null,
  ]);
}

function objectParticle(value: string): "을" | "를" {
  const lastCharacter = value.trim().at(-1);
  if (!lastCharacter) return "를";

  const codePoint = lastCharacter.charCodeAt(0);
  const hasFinalConsonant =
    codePoint >= 0xac00 &&
    codePoint <= 0xd7a3 &&
    (codePoint - 0xac00) % 28 !== 0;

  return hasFinalConsonant ? "을" : "를";
}

function splitPlaces(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[,/]/)
    .map((item) => item.trim())
    .filter((item, index, items) => Boolean(item) && items.indexOf(item) === index);
}

function extractTourismPlaces(value: string | null): string[] {
  if (!value) return [];
  const tourismSection = value.match(/(?:^|\.\s*)관광:\s*([^.]+)/)?.[1];
  return splitPlaces(tourismSection ?? value.split(".")[0]);
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
  const descriptionParts = compact([
    row.features,
    row.city
      ? `${row.city}${objectParticle(row.city)} 대표하는 ${row.team_name}의 홈구장입니다.`
      : null,
  ]);
  const description = descriptionParts.join("\n");

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
      transportation: transportationItems(row),
      attractions: extractTourismPlaces(row.tourism),
      nearbyAreas: splitPlaces(row.accommodations),
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
