import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { stadiumData } from "../data/stadiumData";
import { StadiumFoodTab } from "./StadiumFoodTab";
import { StadiumGuideTab } from "./StadiumGuideTab";
import { StadiumRegionTab } from "./StadiumRegionTab";
import { StadiumSearchBar } from "./StadiumSearchBar";
import { StadiumTabs, type StadiumTab } from "./StadiumTabs";
import { StadiumTopMenu, type StadiumMenuTarget } from "./StadiumTopMenu";
import "./StadiumPage.css";

interface StadiumPageProps {
  onClose: () => void;
  onNavigate: (target: Exclude<StadiumMenuTarget, "stadium">) => void;
}

function matchesSearch(searchValue: string, stadiumId: number) {
  const stadium = stadiumData.find((item) => item.stadiumId === stadiumId);
  if (!stadium) return false;
  const query = searchValue.trim().toLowerCase().replace(/\s+/g, "");
  if (!query) return true;
  return [
    stadium.stadiumName,
    stadium.address,
    ...stadium.teamNames,
    ...stadium.regionInfo.nearbyAreas,
  ].some((value) => value.toLowerCase().replace(/\s+/g, "").includes(query));
}

export function StadiumPage({ onClose, onNavigate }: StadiumPageProps) {
  const [activeTab, setActiveTab] = useState<StadiumTab>("guide");
  const [selectedStadiumId, setSelectedStadiumId] = useState(stadiumData[0].stadiumId);
  const [searchValue, setSearchValue] = useState("");
  const [notice, setNotice] = useState("");

  const selectedStadium = useMemo(
    () => stadiumData.find((stadium) => stadium.stadiumId === selectedStadiumId) ?? stadiumData[0],
    [selectedStadiumId],
  );

  function handleSearch() {
    const result = stadiumData.find((stadium) => matchesSearch(searchValue, stadium.stadiumId));
    if (!result) {
      setNotice("검색 결과가 없습니다. 구장명, 팀명 또는 지역명으로 검색해 주세요.");
      return;
    }
    setSelectedStadiumId(result.stadiumId);
    setNotice(`${result.stadiumName} 정보를 보여드릴게요.`);
  }

  function handleSelectTeam() {
    const currentIndex = stadiumData.findIndex(
      (stadium) => stadium.stadiumId === selectedStadiumId,
    );
    const nextStadium = stadiumData[(currentIndex + 1) % stadiumData.length];
    setSelectedStadiumId(nextStadium.stadiumId);
    setSearchValue(nextStadium.teamNames[0]);
    setNotice(`${nextStadium.teamNames[0]} 홈구장을 선택했어요.`);
  }

  function handleNavigate(target: StadiumMenuTarget) {
    if (target === "stadium") return;
    onNavigate(target);
  }

  return (
    <section className="stadium-page" aria-label="구장정보">
      <header className="stadium-page-header">
        <button type="button" aria-label="뒤로가기" onClick={onClose}>
          <ArrowLeft aria-hidden="true" strokeWidth={2.8} />
        </button>
        <h2>구장정보</h2>
      </header>

      <StadiumTopMenu onNavigate={handleNavigate} />
      <StadiumSearchBar
        value={searchValue}
        onChange={setSearchValue}
        onSearch={handleSearch}
        onSelectTeam={handleSelectTeam}
      />
      {notice ? <p className="stadium-page-notice" role="status">{notice}</p> : null}
      <StadiumTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "guide" ? <StadiumGuideTab stadium={selectedStadium} /> : null}
      {activeTab === "food" ? <StadiumFoodTab stadium={selectedStadium} /> : null}
      {activeTab === "region" ? <StadiumRegionTab stadium={selectedStadium} /> : null}

      <div className="stadium-page-bottom-decoration" aria-hidden="true" />
    </section>
  );
}
