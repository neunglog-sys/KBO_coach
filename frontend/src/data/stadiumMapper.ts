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

function extractFoodItems(value: string | null): Food[] {
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
    imageUrl: "",
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
    foods: extractFoodItems(row.food),
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
