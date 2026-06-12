import { useEffect, useMemo, useRef, useState } from "react";
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

const TEAM_COLORS: Record<string, string> = {
  OB: "#131230",
  LT: "#041E42",
  SS: "#074CA1",
  SK: "#CE0E2D",
  LG: "#C30452",
  NC: "#315288",
  WO: "#7B0F1F",
  KT: "#2B2B2B",
  HT: "#C8102E",
  HH: "#FA5C1E",
};

const TEAM_LIST_TRANSITION_MS = 280;

export function StadiumPage({ onClose, onNavigate }: StadiumPageProps) {
  const [activeTab, setActiveTab] = useState<StadiumTab>("guide");
  const [stadiums, setStadiums] = useState<Stadium[]>([]);
  const [selectedTeamCode, setSelectedTeamCode] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [notice, setNotice] = useState("구장정보를 불러오는 중입니다.");
  const [isTeamListOpen, setIsTeamListOpen] = useState(false);
  const [isTeamListMounted, setIsTeamListMounted] = useState(false);
  const [isTeamListVisible, setIsTeamListVisible] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [teamListHeight, setTeamListHeight] = useState(0);
  const searchAreaRef = useRef<HTMLDivElement>(null);
  const teamListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isTeamListOpen) return;
    function handleOutsideClick(event: MouseEvent) {
      if (!searchAreaRef.current?.contains(event.target as Node)) {
        setIsTeamListOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isTeamListOpen]);

  function handleSearchFocus() {
    // 검색창 확장과 팀 선택 슬라이드가 동시에 펼쳐져 겹치지 않도록 정리
    setIsTeamListOpen(false);
  }

  function handleSelectTeamToggle() {
    // 검색창이 확장된 상태라면 focus를 해제하고 팀 선택 슬라이드를 연다
    searchInputRef.current?.blur();
    setIsTeamListOpen((open) => !open);
  }

  useEffect(() => {
    if (isTeamListOpen) {
      setIsTeamListMounted(true);
      return;
    }
    setIsTeamListVisible(false);
    const timer = window.setTimeout(() => setIsTeamListMounted(false), TEAM_LIST_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [isTeamListOpen]);

  // 팀 목록이 mount된 뒤 실제 콘텐츠 높이를 측정해 0 → 실제 높이로 펼치기 애니메이션 트리거
  useEffect(() => {
    if (!isTeamListMounted) return;
    const node = teamListRef.current;
    if (!node) return;

    const updateHeight = () => setTeamListHeight(node.scrollHeight);
    updateHeight();

    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsTeamListVisible(true));
    });

    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);

    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, [isTeamListMounted, stadiums]);

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
      <div className="stadium-page-search-area" ref={searchAreaRef}>
        <StadiumSearchBar
          value={searchValue}
          onChange={setSearchValue}
          onSearch={handleSearch}
          onSelectTeam={handleSelectTeamToggle}
          isTeamListOpen={isTeamListOpen}
          onFocus={handleSearchFocus}
          inputRef={searchInputRef}
        />
        {isTeamListMounted ? (
          <div
            className={`stadium-page-team-list-wrap${isTeamListVisible ? " is-open" : ""}`}
            style={{ height: isTeamListVisible ? teamListHeight : 0 }}
          >
            <div className="stadium-page-team-list" aria-label="KBO 구단 선택" ref={teamListRef}>
              {stadiums.map((stadium) => {
                const isActive = stadium.teamCode === selectedTeamCode;
                const teamColor = TEAM_COLORS[stadium.teamCode];
                return (
                  <button
                    className={isActive ? "is-active" : ""}
                    key={stadium.teamCode}
                    type="button"
                    style={
                      isActive && teamColor
                        ? { borderColor: teamColor, background: teamColor, color: "#fff" }
                        : undefined
                    }
                    onClick={() => selectTeam(stadium)}
                  >
                    {stadium.teamName}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      {notice ? <p className="stadium-page-notice" role="status">{notice}</p> : null}
      <StadiumTabs activeTab={activeTab} onChange={setActiveTab} />

      {selectedStadium ? (
        <>
          {activeTab === "guide" ? (
            <StadiumGuideTab stadium={selectedStadium} stadiums={stadiums} />
          ) : null}
          {activeTab === "food" ? <StadiumFoodTab stadium={selectedStadium} /> : null}
          {activeTab === "region" ? (
            <StadiumRegionTab stadium={selectedStadium} stadiums={stadiums} />
          ) : null}
        </>
      ) : (
        <div className="stadium-page-empty">준비 중입니다</div>
      )}
    </section>
  );
}
