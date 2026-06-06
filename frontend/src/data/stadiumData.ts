export interface Food {
  foodId: number;
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
  stadiumId: number;
  stadiumName: string;
  teamNames: string[];
  address: string;
  imageUrl: string;
  description: string;
  tips: string[];
  foods: Food[];
  regionInfo: RegionInfo;
}

export const stadiumData: Stadium[] = [
  {
    stadiumId: 1,
    stadiumName: "잠실야구장",
    teamNames: ["두산 베어스", "LG 트윈스"],
    address: "서울특별시 송파구 올림픽로 25",
    imageUrl: "/img/잠실구장.png",
    description:
      "서울을 대표하는 야구장으로 두산 베어스와 LG 트윈스가 함께 사용하는 홈구장입니다.",
    tips: [
      "종합운동장역에서 도보 이동 가능",
      "경기일에는 주변 혼잡이 심함",
      "인기 경기 예매는 빠르게 마감될 수 있음",
      "주차 공간이 협소하니 대중교통 이용 추천",
    ],
    foods: [
      {
        foodId: 1,
        name: "김치말이국수",
        description: "더운 날 시원하게 즐기기 좋은 메뉴",
        imageUrl:
          "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=480&q=80",
      },
      {
        foodId: 2,
        name: "삼겹살도시락",
        description: "든든한 식사 대용으로 인기 있는 메뉴",
        imageUrl:
          "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=480&q=80",
      },
      {
        foodId: 3,
        name: "치킨",
        description: "야구장에서 빠질 수 없는 대표 간식",
        imageUrl:
          "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=480&q=80",
      },
      {
        foodId: 4,
        name: "핫도그",
        description: "간편하게 즐기는 클래식 야구장 간식",
        imageUrl:
          "https://images.unsplash.com/photo-1612392062631-94dd858cba88?auto=format&fit=crop&w=480&q=80",
      },
      {
        foodId: 5,
        name: "맥주",
        description: "시원한 맥주와 함께 즐기는 야구 관람",
        imageUrl:
          "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=480&q=80",
      },
    ],
    regionInfo: {
      transportation: [
        "서울역 → 잠실야구장 약 40~50분",
        "강남역 → 잠실야구장 약 30~45분",
        "지하철 2호선·9호선 종합운동장역 이용",
      ],
      attractions: ["석촌호수", "롯데월드", "롯데월드타워", "올림픽공원"],
      nearbyAreas: ["잠실", "방이", "삼성·코엑스", "선릉", "강남"],
    },
  },
  {
    stadiumId: 2,
    stadiumName: "대구 삼성 라이온즈 파크",
    teamNames: ["삼성 라이온즈"],
    address: "대구광역시 수성구 야구전설로 1",
    imageUrl: "/img/background.png",
    description:
      "관람 시야와 접근성이 좋은 삼성 라이온즈의 홈구장으로 대구 야구 문화를 즐길 수 있습니다.",
    tips: [
      "대공원역에서 도보 이동 가능",
      "외야 좌석은 햇빛 대비가 필요",
      "주말 경기는 사전 예매 추천",
      "경기 종료 후 지하철 혼잡에 유의",
    ],
    foods: [
      {
        foodId: 6,
        name: "납작만두",
        description: "대구에서 즐기는 가볍고 매콤한 간식",
        imageUrl:
          "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=480&q=80",
      },
      {
        foodId: 7,
        name: "치킨",
        description: "응원과 함께 즐기기 좋은 대표 메뉴",
        imageUrl:
          "https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=480&q=80",
      },
    ],
    regionInfo: {
      transportation: ["동대구역 → 구장 약 30분", "대공원역 4번 출구 도보 이동"],
      attractions: ["수성못", "앞산 전망대", "동성로"],
      nearbyAreas: ["수성구", "범어", "동대구", "동성로"],
    },
  },
  {
    stadiumId: 3,
    stadiumName: "사직야구장",
    teamNames: ["롯데 자이언츠"],
    address: "부산광역시 동래구 사직로 45",
    imageUrl: "/img/background.png",
    description:
      "부산 특유의 뜨거운 응원 문화를 가까이에서 경험할 수 있는 롯데 자이언츠의 홈구장입니다.",
    tips: [
      "사직역과 종합운동장역에서 접근 가능",
      "응원 도구와 팀 색상 복장 준비 추천",
      "경기 전 주변 식당 혼잡에 유의",
      "대중교통 이용 추천",
    ],
    foods: [
      {
        foodId: 8,
        name: "부산 어묵",
        description: "따뜻하고 간편하게 즐기는 부산 대표 간식",
        imageUrl:
          "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=480&q=80",
      },
      {
        foodId: 9,
        name: "맥주",
        description: "사직의 응원 열기와 잘 어울리는 시원한 음료",
        imageUrl:
          "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=480&q=80",
      },
    ],
    regionInfo: {
      transportation: ["부산역 → 사직야구장 약 40분", "사직역 1번 출구 도보 이동"],
      attractions: ["광안리", "해운대", "온천천", "부산시민공원"],
      nearbyAreas: ["사직", "동래", "서면", "광안리"],
    },
  },
];
