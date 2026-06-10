import { useEffect, useMemo, useState } from "react";
import { AppBackButton } from "./AppBackButton";
import { fetchStadiums, type Stadium } from "../data/stadiumData";
import { stadiumSearchScore } from "../data/stadiumMapper";
import { StadiumFoodTab } from "./StadiumFoodTab";
import { StadiumGuideTab } from "./StadiumGuideTab";
import { StadiumRegionTab } from "./StadiumRegionTab";
import { StadiumSearchBar } from "./StadiumSearchBar";
import { StadiumTabs, type StadiumTab } from "./StadiumTabs";
import type { TopMenuTarget } from "./TopMenu";
import { MenuButton } from "./MenuButton";
import { SideMenu } from "./SideMenu";
import "./StadiumPage.css";

type StadiumMenuTarget = TopMenuTarget;

interface StadiumPageProps {
  onClose: () => void;
  onNavigate: (target: Exclude<StadiumMenuTarget, "stadium">) => void;
}

export function StadiumPage({ onClose, onNavigate }: StadiumPageProps) {
  const [activeTab, setActiveTab] = useState<StadiumTab>("guide");
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [selectedTeamCode, setSelectedTeamCode] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [notice, setNotice] = useState("구장정보를 불러오는 중입니다.");
  const [isTeamListOpen, setIsTeamListOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchStadiums(controller.signal)
      .then((items) => {
        setStadiums(items);
        setSelectedTeamCode(items[0]?.teamCode ?? "");
        setNotice(items.length ? `${items.length}개 구단의 구장정보를 불러왔습니다.` : "준비 중입니다");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setNotice(error instanceof Error ? error.message : "구장정보를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, []);

  const selectedStadium = useMemo(
    () => stadiums.find((stadium) => stadium.teamCode === selectedTeamCode) ?? null,
    [selectedTeamCode, stadiums],
  );

  function selectTeam(stadium: Stadium) {
    setSelectedTeamCode(stadium.teamCode);
    setSearchValue(stadium.teamName);
    setNotice(`${stadium.teamName} 홈구장을 선택했어요.`);
    setIsTeamListOpen(false);
  }

  function handleSearch() {
    // 점수가 가장 높은 구장 선택 (팀명·구장명 매칭 우선 → "삼성" 검색 시 잠실 숙박정보 오매칭 방지)
    let result: Stadium | null = null;
    let bestScore = 0;
    for (const stadium of stadiums) {
      const score = stadiumSearchScore(searchValue, stadium);
      if (score > bestScore) {
        bestScore = score;
        result = stadium;
      }
    }
    if (!result) {
      setNotice("검색 결과가 없습니다. 구단명, 구장명 또는 지역명으로 검색해 주세요.");
      return;
    }
    selectTeam(result);
    setNotice(`${result.stadiumName} 정보를 보여드릴게요.`);
  }

  function handleNavigate(target: StadiumMenuTarget) {
    if (target === "stadium") return;
    onNavigate(target);
  }

  return (
    <section className="stadium-page" aria-label="구장정보">
      <header className="stadium-page-header">
        <AppBackButton onClick={onClose} />
        <h2>구장정보</h2>
        <MenuButton onClick={() => setSideMenuOpen(true)} />
      </header>

      <SideMenu
        isOpen={sideMenuOpen}
        active="stadium"
        onNavigate={handleNavigate}
        onClose={() => setSideMenuOpen(false)}
      />
      <StadiumSearchBar
        value={searchValue}
        onChange={setSearchValue}
        onSearch={handleSearch}
        onSelectTeam={() => setIsTeamListOpen((open) => !open)}
        isTeamListOpen={isTeamListOpen}
      />
      {isTeamListOpen ? (
        <div className="stadium-page-team-list" aria-label="KBO 구단 선택">
          {stadiums.map((stadium) => (
            <button
              className={stadium.teamCode === selectedTeamCode ? "is-active" : ""}
              key={stadium.teamCode}
              type="button"
              onClick={() => selectTeam(stadium)}
            >
              {stadium.teamName}
            </button>
          ))}
        </div>
      ) : null}
      {notice ? <p className="stadium-page-notice" role="status">{notice}</p> : null}
      <StadiumTabs activeTab={activeTab} onChange={setActiveTab} />

      {selectedStadium ? (
        <>
          {activeTab === "guide" ? <StadiumGuideTab stadium={selectedStadium} /> : null}
          {activeTab === "food" ? <StadiumFoodTab stadium={selectedStadium} /> : null}
          {activeTab === "region" ? <StadiumRegionTab stadium={selectedStadium} /> : null}
        </>
      ) : (
        <div className="stadium-page-empty">준비 중입니다</div>
      )}

      <div className="stadium-page-bottom-decoration" aria-hidden="true" />
    </section>
  );
}
