import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { StadiumFoodTab } from "../src/components/StadiumFoodTab";
import { StadiumGuideTab } from "../src/components/StadiumGuideTab";
import { StadiumRegionTab } from "../src/components/StadiumRegionTab";
import {
  mapStadium,
  matchesStadiumSearch,
  type StadiumApiRow,
} from "../src/data/stadiumMapper";

const expectedTeams = [
  ["LG", "LG 트윈스"],
  ["OB", "두산 베어스"],
  ["WO", "키움 히어로즈"],
  ["SK", "SSG 랜더스"],
  ["KT", "KT 위즈"],
  ["HT", "KIA 타이거즈"],
  ["SS", "삼성 라이온즈"],
  ["LT", "롯데 자이언츠"],
  ["HH", "한화 이글스"],
  ["NC", "NC 다이노스"],
] as const;

async function main() {
  const response = await fetch("http://127.0.0.1:8000/stadiums");
  assert.equal(response.ok, true, `GET /stadiums failed: ${response.status}`);

  const payload = await response.json() as { count: number; stadiums: StadiumApiRow[] };
  assert.equal(payload.count, 10);
  assert.equal(payload.stadiums.length, 10);

  const stadiums = payload.stadiums.map(mapStadium);

  for (const [teamCode, teamName] of expectedTeams) {
    const stadium = stadiums.find((item) => item.teamCode === teamCode);
    assert.ok(stadium, `${teamName} 구장정보가 없습니다.`);
    assert.equal(stadium.teamName, teamName);
    assert.notEqual(stadium.stadiumName, "구장정보 준비 중");
    assert.notEqual(stadium.address, "준비 중입니다");
    assert.ok(stadium.tips.length > 0, `${teamName} 구장안내가 비어 있습니다.`);
    assert.ok(stadium.foods.length > 0, `${teamName} 먹거리가 비어 있습니다.`);
    assert.ok(stadium.regionInfo.transportation.length > 0, `${teamName} 교통정보가 비어 있습니다.`);
    assert.ok(stadium.regionInfo.attractions.length > 0, `${teamName} 지역정보가 비어 있습니다.`);
    assert.equal(matchesStadiumSearch(teamName, stadium), true);
    assert.equal(matchesStadiumSearch(stadium.city, stadium), true);

    const guideHtml = renderToStaticMarkup(<StadiumGuideTab stadium={stadium} />);
    const foodHtml = renderToStaticMarkup(<StadiumFoodTab stadium={stadium} />);
    const regionHtml = renderToStaticMarkup(<StadiumRegionTab stadium={stadium} />);
    assert.ok(guideHtml.includes(teamName));
    assert.ok(foodHtml.includes(stadium.foods[0].name));
    assert.ok(regionHtml.includes(stadium.regionInfo.transportation[0]));

    console.log(`PASS ${teamCode} ${teamName} - ${stadium.stadiumName}`);
  }

  console.log("PASS KBO 10개 구단 구장안내/먹거리/지역정보 렌더링");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
