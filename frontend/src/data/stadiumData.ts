import { apiUrl } from "../api";
import {
  mapStadium,
  type Food,
  type RegionInfo,
  type Stadium,
  type StadiumApiRow,
} from "./stadiumMapper";

export type { Food, RegionInfo, Stadium } from "./stadiumMapper";

interface StadiumApiResponse {
  count: number;
  stadiums: StadiumApiRow[];
}

export async function fetchStadiums(signal?: AbortSignal): Promise<Stadium[]> {
  const response = await fetch(apiUrl("/stadiums"), { signal });
  if (!response.ok) {
    throw new Error(`구장정보를 불러오지 못했습니다. (${response.status})`);
  }

  const data = (await response.json()) as StadiumApiResponse;
  return data.stadiums.map(mapStadium);
}
