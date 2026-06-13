import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { apiUrl } from "../api";
import { AppBackButton } from "./AppBackButton";
import type { TopMenuTarget } from "./TopMenu";
import { MenuButton } from "./MenuButton";
import { SideMenu } from "./SideMenu";
import "./MyRecordsView.css";

interface MyRecordsViewProps {
  authToken: string;
  onBack: () => void;
  onNavigate?: (target: TopMenuTarget) => void;
}

interface RecordRow {
  record_id: number;
  record_date: string;
  team_code: string | null; // 상대팀 코드
  stadium: string | null;
  mood: string | null;
  memo: string | null;
}

interface ScheduleGame {
  oppCode: string;
  isHome: boolean;
  time: string;
  gameId: string | null;
  away?: string;
  home?: string;
  stadium?: string;
}

// /lineups 응답의 경기 1건 (crawl_lineup.py가 kbo.lineups에 적재하는 형태)
interface LineupPlayer {
  order: number;
  position: string;
  name: string;
}
interface LineupGame {
  game_id: string;
  date: string;
  time: string | null;
  stadium: string | null;
  away: string; // 팀명(한글 약칭)
  home: string;
  away_starter: string | null;
  home_starter: string | null;
  away_lineup: LineupPlayer[];
  home_lineup: LineupPlayer[];
  lineup_posted: boolean;
  cancel: string | null;
}

// /scoreboards 응답의 경기 1건 (kbo_crawler가 kbo.game_scoreboards에 적재)
interface TeamLine {
  inning_scores: (number | null)[]; // 회차별 득점, 안 친 이닝은 null
  R: number | null;
  H: number | null;
  E: number | null;
  B: number | null;
}
interface ScoreboardGame {
  gameId: string;
  date: string;
  away: string;
  home: string;
  max_inning: number;
  away_line: TeamLine;
  home_line: TeamLine;
  crowd?: string;
  start_time?: string;
  end_time?: string;
}

const CHAR_DIR = "/img/kbo_character_no_outline_pngs";
const TEAMS = [
  { code: "OB", name: "두산 베어스", short: "두산", color: "#131230", char: `${CHAR_DIR}/Doosan_character_no_outline.png` },
  { code: "LT", name: "롯데 자이언츠", short: "롯데", color: "#041E42", char: `${CHAR_DIR}/Lotte_character_no_outline.png` },
  { code: "SS", name: "삼성 라이온즈", short: "삼성", color: "#074CA1", char: `${CHAR_DIR}/Samsung_character_no_outline.png` },
  { code: "SK", name: "SSG 랜더스", short: "SSG", color: "#CE0E2D", char: `${CHAR_DIR}/SSG_character_no_outline.png` },
  { code: "LG", name: "LG 트윈스", short: "LG", color: "#C30452", char: `${CHAR_DIR}/LG_character_no_outline.png` },
  { code: "NC", name: "NC 다이노스", short: "NC", color: "#315288", char: `${CHAR_DIR}/NC_character_no_outline.png` },
  { code: "WO", name: "키움 히어로즈", short: "키움", color: "#570514", char: `${CHAR_DIR}/Kiwoom_character_no_outline.png` },
  { code: "KT", name: "KT 위즈", short: "KT", color: "#333333", char: `${CHAR_DIR}/KT_character_no_outline.png` },
  { code: "HT", name: "KIA 타이거즈", short: "KIA", color: "#EA0029", char: `${CHAR_DIR}/KIA_character_no_outline.png` },
  { code: "HH", name: "한화 이글스", short: "한화", color: "#FC4E00", char: `${CHAR_DIR}/Hanwha_character_no_outline.png` },
];

const MOODS = [
  { key: "win_happy", label: "승리", emoji: "😆", color: "#22c55e" },
  { key: "draw_calm", label: "무승부", emoji: "😐", color: "#9ca3af" },
  { key: "loss_sad", label: "패배", emoji: "😢", color: "#60a5fa" },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const GOAL_KEY = "myRecordGoalDays";
const GOAL_RESET_KEY = "myRecordGoalResetDate";
const STREAK_DATES_KEY = "myRecordStreakDates";
const MYTEAM_KEY = "myTeamCode";

// 헥스 색을 흰색 쪽으로 amt(0~1)만큼 밝게 보정. (어두운 팀 색을 그라데이션용으로 띄움)
function lighten(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

const teamByCode = (code: string | null) => TEAMS.find((t) => t.code === code);
const teamByShort = (short: string) => TEAMS.find((t) => t.short === short);
const moodByKey = (key: string | null) => MOODS.find((m) => m.key === key);

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function koreaTodayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function loadStreakDates(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STREAK_DATES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((d): d is string => typeof d === "string") : [];
  } catch {
    return [];
  }
}

function saveStreakDates(dates: string[]) {
  localStorage.setItem(STREAK_DATES_KEY, JSON.stringify(Array.from(new Set(dates)).sort()));
}

function calcStreak(dateSet: Set<string>, resetDate: string | null): number {
  let streak = 0;
  const d = new Date(`${koreaTodayKey()}T00:00:00+09:00`);
  const todayKey = koreaTodayKey();
  if ((resetDate && todayKey <= resetDate) || !dateSet.has(todayKey)) return 0;
  while (true) {
    const key = fmt(d);
    if ((resetDate && key <= resetDate) || !dateSet.has(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function MyRecordsView({ authToken, onBack, onNavigate }: MyRecordsViewProps) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [myTeam, setMyTeam] = useState<string | null>(() => localStorage.getItem(MYTEAM_KEY));
  const [monthGames, setMonthGames] = useState<Record<string, unknown>[]>([]);
  const [goalDays, setGoalDays] = useState<number>(() => Number(localStorage.getItem(GOAL_KEY)) || 3);
  const [goalResetDate, setGoalResetDate] = useState<string | null>(() => localStorage.getItem(GOAL_RESET_KEY));
  const [streakDates, setStreakDates] = useState<string[]>(loadStreakDates);
  const [editingGoal, setEditingGoal] = useState(false);

  const today = new Date();
  const todayKey = koreaTodayKey();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [closing, setClosing] = useState(false); // 뒤로가기 슬라이드 아웃용
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // ===== KBO 공식 기록 연동 (lineups API) =====
  const [lineupGames, setLineupGames] = useState<LineupGame[]>([]);
  const [scoreboards, setScoreboards] = useState<ScoreboardGame[]>([]);
  const [liveDate, setLiveDate] = useState<string>("");
  const [liveLoading, setLiveLoading] = useState(false);
  const [lineupTab, setLineupTab] = useState<"away" | "home">("away");

  async function loadTodayGames(targetDate?: string) {
    setLiveLoading(true);
    try {
      let d: { date?: string; count?: number; lineups?: LineupGame[] } | null = null;
      if (targetDate) {
        // 특정 날짜 지정(캘린더 클릭) → 그 날짜만. 폴백 없음(없으면 "경기 없음" 표시).
        const r = await fetch(apiUrl(`/lineups?date=${targetDate}`));
        if (r.ok) d = await r.json();
      } else {
        // 기본: 오늘 명시 → 비면 최신 날짜로 폴백
        const r1 = await fetch(apiUrl(`/lineups?date=${koreaTodayKey()}`));
        if (r1.ok) d = await r1.json();
        if (!d || !Array.isArray(d.lineups) || d.lineups.length === 0) {
          const r2 = await fetch(apiUrl(`/lineups`));
          if (r2.ok) d = await r2.json();
        }
      }
      let usedDate = targetDate || "";
      if (d && Array.isArray(d.lineups)) {
        setLineupGames(d.lineups);
        usedDate = typeof d.date === "string" ? d.date : targetDate || "";
        setLiveDate(usedDate);
      } else if (targetDate) {
        // 그 날짜 라인업이 아예 없으면 비우고 날짜만 기록
        setLineupGames([]);
        setLiveDate(targetDate);
      }
      // 스코어보드(이닝별 점수)도 같은 날짜로 로드
      const sbUrl = usedDate ? `/scoreboards?date=${usedDate}` : `/scoreboards`;
      const rs = await fetch(apiUrl(sbUrl));
      if (rs.ok) {
        const sd = await rs.json();
        setScoreboards(Array.isArray(sd.scoreboards) ? sd.scoreboards : []);
      } else {
        setScoreboards([]);
      }
    } catch {
      // 네트워크 오류 시 기존 상태 유지
    } finally {
      setLiveLoading(false);
    }
  }

  useEffect(() => {
    void loadTodayGames();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reload() {
    if (!authToken) {
      setRecords([]);
      return;
    }
    try {
      const r = await fetch(apiUrl("/my-records"), {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!r.ok) {
        setRecords([]);
        return;
      }
      const d = await r.json();
      const rows: RecordRow[] = (Array.isArray(d.records) ? d.records : []).map(
        (x: Record<string, unknown>) => ({
          record_id: Number(x.record_id),
          record_date: String(x.record_date).slice(0, 10),
          team_code: (x.team_code as string) ?? null,
          stadium: (x.stadium as string) ?? null,
          mood: (x.mood as string) ?? null,
          memo: (x.memo as string) ?? null,
        }),
      );
      setRecords(rows);
    } catch {
      setRecords([]);
    }
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // 회원가입 시 고른 응원팀(fav_team_code) → 내 홈팀 자동 고정
  useEffect(() => {
    if (!authToken) return;
    (async () => {
      try {
        const r = await fetch(apiUrl("/auth/me"), { headers: { Authorization: `Bearer ${authToken}` } });
        if (!r.ok) return;
        const d = await r.json();
        const code = d.fav_team_code || d.user?.fav_team_code;
        if (code) {
          setMyTeam(code);
          localStorage.setItem(MYTEAM_KEY, code);
        }
      } catch {
        /* 무시 */
      }
    })();
  }, [authToken]);

  // 보이는 달의 경기 예정표 로드 (DB schedule)
  useEffect(() => {
    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(apiUrl(`/schedule?month=${monthStr}`));
        if (!r.ok) return;
        const d = await r.json();
        if (alive) setMonthGames(Array.isArray(d.schedule) ? d.schedule : []);
      } catch {
        if (alive) setMonthGames([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [viewYear, viewMonth]);

  const myTeamObj = teamByCode(myTeam);
  const myShort = myTeamObj?.short;

  // 스트릭 카드 색: 내 팀 색 기반 그라데이션(팀 미설정이면 CSS 기본 보라색).
  const streakStyle = myTeamObj
    ? ({
        "--streak-c0": myTeamObj.color,
        "--streak-c1": lighten(myTeamObj.color, 0.28),
        "--streak-c2": lighten(myTeamObj.color, 0.55),
        "--streak-shadow": `${myTeamObj.color}52`,
      } as CSSProperties)
    : undefined;

  // 날짜 → 내 팀 경기(상대/홈원정) 매핑
  const scheduleByDate = useMemo(() => {
    const map = new Map<string, ScheduleGame>();
    if (!myShort) return map;
    for (const g of monthGames) {
      const home = g["홈팀"] as string;
      const away = g["원정팀"] as string;
      const date = g["date"] as string;
      if (home !== myShort && away !== myShort) continue;
      const isHome = home === myShort;
      const opp = teamByShort(isHome ? away : home);
      if (!opp || !date) continue;
      map.set(date, {
        oppCode: opp.code,
        isHome,
        time: (g["시간"] as string) || (g["time"] as string) || "",
        gameId: (g["gameId"] as string) || null,
        away,
        home,
        stadium: (g["구장"] as string) || "",
      });
    }
    return map;
  }, [monthGames, myShort]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, RecordRow>();
    for (const r of records) map.set(r.record_date, r);
    return map;
  }, [records]);

  // 내 팀 경기 (lineups 중에서) — 선발투수·타순까지 포함.
  // 매칭: ① 팀명(short) ② game_id 내 팀코드(예: 20260613OBHT → OB/HT) 양쪽으로 시도해 표기 흔들림에 강하게.
  const myGame = useMemo(() => {
    if (!myTeam) return null; // team_code(OB 등) 자체가 없으면 매칭 불가
    const myCode = myTeam.toUpperCase();
    const g = lineupGames.find((game) => {
      if (myShort && (game.home === myShort || game.away === myShort)) return true;
      // game_id 끝 4글자가 보통 원정+홈 팀코드(2+2). 내 코드 포함 여부로 보조 매칭.
      const tail = (game.game_id || "").slice(-4).toUpperCase();
      return tail.includes(myCode);
    });
    if (!g) return null;
    return {
      ...g,
      awayTeam: teamByShort(g.away) ?? null,
      homeTeam: teamByShort(g.home) ?? null,
    };
  }, [lineupGames, myShort, myTeam]);

  // 팀 닉네임("KIA 타이거즈" → "타이거즈") — 라인업 탭 표기용
  const teamNick = (t: (typeof TEAMS)[number] | null, fallback: string) =>
    t ? t.name.split(" ").slice(-1)[0] : fallback;

  // 투수 이름 길이에 따라 원 안 글씨 크기 클래스 (공백 제외 글자 수 기준)
  const pitcherSizeClass = (name: string | null | undefined) => {
    const len = (name ?? "").replace(/\s/g, "").length;
    if (len >= 6) return "len-long"; // 베니지아노(6) 등
    if (len >= 4) return "len-mid"; // 4~5자
    return "";
  };

  // 현재 보는 날짜(liveDate)의 schedule 경기 (lineups 없을 때 미래 경기 폴백용)
  const myScheduledGame = useMemo(() => {
    if (!liveDate) return null;
    return scheduleByDate.get(liveDate) ?? null;
  }, [scheduleByDate, liveDate]);

  // 미래 경기 여부: lineups엔 없지만 schedule엔 있고, 날짜가 오늘 이후
  const isFutureScheduled = !myGame && !!myScheduledGame && liveDate > todayKey;

  // 내 경기의 스코어보드 (gameId로 매칭)
  const myScoreboard = useMemo(() => {
    if (!myGame) return null;
    return scoreboards.find((s) => s.gameId === myGame.game_id) ?? null;
  }, [scoreboards, myGame]);

  // 표에 보여줄 이닝 수 (max_inning, 최소 9). 연장 없으면 9칸.
  const inningCount = useMemo(() => {
    if (!myScoreboard) return 9;
    return Math.max(9, myScoreboard.max_inning || 9);
  }, [myScoreboard]);

  // 경기 상태: 취소 > 과거날짜/종료(end_time) > 경기중(점수 있음) > 예정
  const gameStatus = useMemo(() => {
    if (!myGame) return "";
    if (myGame.cancel) return myGame.cancel; // 우천취소 등
    const sb = myScoreboard;
    if (sb?.end_time) return "경기 종료";
    // 보고 있는 경기 날짜가 오늘보다 과거면 이미 끝난 경기 → 종료
    // (myGame.date 우선, 없으면 현재 보는 liveDate 기준)
    const gameDate = myGame.date || liveDate;
    if (gameDate && gameDate < todayKey) return "경기 종료";
    // 스코어보드에 득점 기록이 하나라도 있으면 경기 중으로 간주
    const hasScore =
      sb &&
      [...(sb.away_line?.inning_scores ?? []), ...(sb.home_line?.inning_scores ?? [])].some(
        (v) => v !== null && v !== undefined,
      );
    if (hasScore) return "경기 중";
    return "경기 예정";
  }, [myGame, myScoreboard, liveDate, todayKey]);

  const streak = useMemo(() => {
    const challengeDates = new Set(streakDates);
    if (recordsByDate.has(todayKey)) challengeDates.add(todayKey);
    return calcStreak(challengeDates, goalResetDate);
  }, [goalResetDate, recordsByDate, streakDates, todayKey]);
  const progress = Math.min(100, Math.round((streak / Math.max(1, goalDays)) * 100));
  const remain = Math.max(0, goalDays - streak);
  const reachedGoal = streak >= goalDays;

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [viewYear, viewMonth]);

  function moveMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  function saveGoal(value: number) {
    const v = Math.max(1, Math.min(365, Math.round(value) || 1));
    const resetDate = todayKey;
    setGoalDays(v);
    setGoalResetDate(resetDate);
    setStreakDates([]);
    localStorage.setItem(GOAL_KEY, String(v));
    localStorage.setItem(GOAL_RESET_KEY, resetDate);
    saveStreakDates([]);
    setEditingGoal(false);
  }

  function handleBack() {
    // 모션 감소 설정이면 애니메이션 없이 즉시 닫기 (onAnimationEnd 미발생 대비)
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      onBack();
    } else {
      setClosing(true);
    }
  }

  function handleSideMenuNavigate(target: TopMenuTarget) {
    if (target === "record") return;
    onNavigate?.(target);
  }

  function rememberTodayStreakDate(savedDate: string) {
    if (savedDate !== todayKey) return;
    const next = Array.from(new Set([...streakDates, todayKey])).sort();
    setGoalResetDate(null);
    localStorage.removeItem(GOAL_RESET_KEY);
    setStreakDates(next);
    saveStreakDates(next);
  }

  function forgetTodayStreakDate(deletedDate: string) {
    if (deletedDate !== todayKey) return;
    const next = streakDates.filter((d) => d !== todayKey);
    setStreakDates(next);
    saveStreakDates(next);
  }

  return (
    <section
      className={`records-view ${closing ? "closing" : ""}`}
      aria-label="나만의 야구기록"
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onBack();
      }}
    >
      <header className="records-top">
        <AppBackButton onClick={handleBack} />
        <h1>나만의 야구기록</h1>
        <MenuButton onClick={() => setSideMenuOpen(true)} />
      </header>

      <SideMenu
        isOpen={sideMenuOpen}
        active="record"
        onNavigate={handleSideMenuNavigate}
        onClose={() => setSideMenuOpen(false)}
      />

      <div className="streak-card" style={streakStyle}>
        <div className="streak-card-head">
          <div>
            <p className="streak-eyebrow">연속 기록 도전</p>
            <h2>{streak}일째 도전 중!</h2>
          </div>
          {myTeamObj ? (
            <img
              className="streak-char"
              src={myTeamObj.char}
              alt={`${myTeamObj.name} 캐릭터`}
            />
          ) : (
            <div className="streak-flame" aria-hidden="true">
              🔥
            </div>
          )}
        </div>
        <div className="streak-goalrow">
          <span>목표 일수 {goalDays}일</span>
          <span>{remain === 0 ? "목표 달성!" : `${remain}일 남음`}</span>
        </div>
        <div className="streak-bar">
          <div className="streak-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        {reachedGoal ? (
          <p className="streak-goal-message">
            축하해요! 목표 일수를 채웠어요. 새로운 목표 일수를 다시 적어주세요.
          </p>
        ) : null}
        <div className="streak-actions">
          {editingGoal ? (
            <GoalEditor initial={goalDays} onSave={saveGoal} onCancel={() => setEditingGoal(false)} />
          ) : (
            <button
              className="streak-goalbtn"
              type="button"
              // 내 팀이 있으면 팀 칩과 동일한 솔리드 팀 색을 입힌다(팀마다 자동 적용). 없으면 기본 그라데이션.
              style={myTeamObj ? { background: myTeamObj.color } : undefined}
              onClick={() => setEditingGoal(true)}
            >
              목표 수정
            </button>
          )}
        </div>
      </div>

      {/* 내 팀 (회원가입 응원팀 고정) */}
      <div className="myteam-row">
        {myTeamObj ? (
          <>
            <span className="myteam-label">내 팀</span>
            <span className="myteam-chip" style={{ background: myTeamObj.color }}>
              {myTeamObj.name}
            </span>
          </>
        ) : (
          <span className="myteam-label">로그인하면 응원팀이 자동으로 표시돼요.</span>
        )}
      </div>

      <div className="cal-card">
        <div className="cal-head">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="이전 달">
            ‹
          </button>
          <strong>
            {viewYear}.{String(viewMonth + 1).padStart(2, "0")}
          </strong>
          <button type="button" onClick={() => moveMonth(1)} aria-label="다음 달">
            ›
          </button>
        </div>
        <div className="cal-weekdays">
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={i === 0 ? "sun" : i === 6 ? "sat" : ""}>
              {w}
            </span>
          ))}
        </div>
        <div className="cal-grid">
          {calendarCells.map((day, idx) => {
            if (day === null) return <span key={`e${idx}`} className="cal-cell empty" />;
            const dateStr = dateKey(viewYear, viewMonth, day);
            const rec = recordsByDate.get(dateStr);
            const game = scheduleByDate.get(dateStr);
            const isToday = dateStr === todayKey;
            const mood = moodByKey(rec?.mood ?? null);
            const opp = game ? teamByCode(game.oppCode) : undefined;
            return (
              <button
                key={dateStr}
                type="button"
                className={`cal-cell ${rec ? "has-record" : ""} ${game ? "has-game" : ""} ${
                  isToday ? "today" : ""
                }`}
                onClick={() => {
                  setModalDate(dateStr);
                  void loadTodayGames(dateStr); // KBO 섹션도 그 날짜 경기로 갱신
                }}
              >
                <span className="cal-day">{day}</span>
                {rec ? (
                  <span className="cal-stamp" style={{ background: mood?.color ?? "#f97316" }}>
                    {mood?.emoji ?? "⚾"}
                  </span>
                ) : opp ? (
                  <span className="cal-opp" style={{ background: opp.color }}>
                    {opp.short}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="cal-legend">색 배지 = 우리 팀 경기(상대), 이모지 = 내가 남긴 직관 결과</p>
      </div>

      {/* ===== KBO 공식 기록 연동 (아래로 스크롤하면 나오는 섹션) ===== */}
      <div className="kbo-live-card">
        <div className="kbo-live-head">
          <div className="kbo-live-title">
            <strong>KBO 공식 기록 연동</strong>
            {liveDate ? <span className="kbo-live-date">{liveDate}</span> : null}
          </div>
          <button
            type="button"
            className="kbo-live-refresh"
            onClick={() => void loadTodayGames(liveDate || undefined)}
            disabled={liveLoading}
          >
            {liveLoading ? "불러오는 중…" : "새로고침"}
          </button>
        </div>

        {/* 경기 카드: 양팀 선발투수(원) + 중앙 시간/매치업/구장.
            미래 경기(라인업 발표 전)는 schedule 정보로 상대팀만 표시. */}
        {(() => {
          // 표시용 통합 데이터: 라인업 있으면 myGame, 없고 미래면 schedule, 둘 다 없으면 null
          const awayName = myGame?.away ?? (isFutureScheduled
            ? (myScheduledGame!.isHome ? teamByCode(myScheduledGame!.oppCode)?.short : myShort)
            : null) ?? "";
          const homeName = myGame?.home ?? (isFutureScheduled
            ? (myScheduledGame!.isHome ? myShort : teamByCode(myScheduledGame!.oppCode)?.short)
            : null) ?? "";
          const awayTeamObj = myGame?.awayTeam ?? (awayName ? teamByShort(awayName) ?? null : null);
          const homeTeamObj = myGame?.homeTeam ?? (homeName ? teamByShort(homeName) ?? null : null);
          const timeText = myGame?.time || myScheduledGame?.time || (myGame || isFutureScheduled ? "시간 미정" : "--:--");
          const stadiumText = myGame?.stadium || myScheduledGame?.stadium || "";
          const hasCard = !!myGame || isFutureScheduled;
          const statusText = myGame
            ? gameStatus
            : isFutureScheduled
              ? "경기 예정"
              : "경기 없음";
          return (
            <div className="kbo-game-card">
              <div className="kbo-game-side">
                <span
                  className={`kbo-pitcher-circle ${pitcherSizeClass(myGame?.away_starter)}`}
                  style={awayTeamObj ? { borderColor: awayTeamObj.color } : undefined}
                >
                  {myGame?.away_starter ?? ""}
                </span>
                <span className="kbo-team-name">{awayName}</span>
                <span className="kbo-pitcher-label">
                  {myGame?.away_starter ? "선발" : isFutureScheduled ? "발표 전" : ""}
                </span>
              </div>
              <div className="kbo-game-center">
                <strong className="kbo-game-time">{timeText}</strong>
                <span className={`kbo-game-status status-${
                  statusText === "경기 종료" ? "done" : statusText === "경기 중" ? "live" : "ready"
                }`}>
                  {hasCard ? statusText : "오늘 경기 없음"}
                </span>
                <span className="kbo-game-matchup">
                  {hasCard ? `${awayName} vs ${homeName}` : "\u00A0"}
                </span>
                {stadiumText ? (
                  <span className="kbo-game-stadium">{stadiumText}</span>
                ) : null}
              </div>
              <div className="kbo-game-side">
                <span
                  className={`kbo-pitcher-circle ${pitcherSizeClass(myGame?.home_starter)}`}
                  style={homeTeamObj ? { borderColor: homeTeamObj.color } : undefined}
                >
                  {myGame?.home_starter ?? ""}
                </span>
                <span className="kbo-team-name">{homeName}</span>
                <span className="kbo-pitcher-label">
                  {myGame?.home_starter ? "선발" : isFutureScheduled ? "발표 전" : ""}
                </span>
              </div>
            </div>
          );
        })()}

        {/* 스코어보드 (이닝별 점수) — /scoreboards의 inning_scores + R/H/E 연동 */}
        <p className="kbo-sec-title">스코어보드 (이닝별 점수)</p>
        <div className="kbo-score-wrap">
          <table className="kbo-score-table">
            <thead>
              <tr>
                <th>팀</th>
                {Array.from({ length: inningCount }, (_, i) => (
                  <th key={i + 1}>{i + 1}</th>
                ))}
                <th>R</th>
                <th>H</th>
                <th>E</th>
              </tr>
            </thead>
            <tbody>
              {(["away", "home"] as const).map((side) => {
                const teamName =
                  side === "away" ? myGame?.away ?? "원정" : myGame?.home ?? "홈";
                const line = myScoreboard
                  ? side === "away"
                    ? myScoreboard.away_line
                    : myScoreboard.home_line
                  : null;
                return (
                  <tr key={side}>
                    <th>{teamName}</th>
                    {Array.from({ length: inningCount }, (_, i) => {
                      const v = line?.inning_scores?.[i];
                      return <td key={i}>{v === null || v === undefined ? "" : v}</td>;
                    })}
                    <td className="kbo-score-total">{line?.R ?? ""}</td>
                    <td>{line?.H ?? ""}</td>
                    <td>{line?.E ?? ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 선발 라인업 — lineups의 타순(order/position/name) 연동 */}
        <p className="kbo-sec-title">선발 라인업</p>
        <div className="kbo-lineup-tabs">
          <button
            type="button"
            className={lineupTab === "away" ? "on" : ""}
            onClick={() => setLineupTab("away")}
          >
            {myGame ? teamNick(myGame.awayTeam, myGame.away) : "원정팀"}
          </button>
          <button
            type="button"
            className={lineupTab === "home" ? "on" : ""}
            onClick={() => setLineupTab("home")}
          >
            {myGame ? teamNick(myGame.homeTeam, myGame.home) : "홈팀"}
          </button>
        </div>
        <div className={`kbo-lineup-box${myGame && (lineupTab === "away" ? myGame.away_lineup : myGame.home_lineup)?.length ? " has-list" : ""}`}>
          {(() => {
            if (!myGame) {
              if (isFutureScheduled) {
                return (
                  <p className="kbo-lineup-empty">
                    경기 예정 · 선발 라인업은 경기 1시간 전에 공개돼요.
                  </p>
                );
              }
              return (
                <p className="kbo-lineup-empty">
                  {myTeamObj
                    ? `${liveDate || "최근"} ${myTeamObj.short} 경기가 없어요.`
                    : "내 팀을 설정하면 경기를 보여드려요."}
                </p>
              );
            }
            const list = lineupTab === "away" ? myGame.away_lineup : myGame.home_lineup;
            if (!list || list.length === 0) {
              return <p className="kbo-lineup-empty">아직 라인업이 발표되지 않았어요.</p>;
            }
            return (
              <ol className="kbo-lineup-list">
                {list.map((p) => (
                  <li key={p.order} className="kbo-lineup-row">
                    <span className="kbo-lineup-order">{p.order}</span>
                    <span className="kbo-lineup-pos">{p.position}</span>
                    <span className="kbo-lineup-name">{p.name}</span>
                  </li>
                ))}
              </ol>
            );
          })()}
        </div>
      </div>

      {modalDate ? (
        <RecordModal
          date={modalDate}
          myTeam={myTeamObj ?? null}
          game={scheduleByDate.get(modalDate) ?? null}
          existing={recordsByDate.get(modalDate) ?? null}
          authToken={authToken}
          onClose={() => setModalDate(null)}
          onSaved={async (savedDate, action) => {
            if (action === "delete") {
              forgetTodayStreakDate(savedDate);
            } else {
              rememberTodayStreakDate(savedDate);
            }
            await reload();
            setModalDate(null);
          }}
        />
      ) : null}
    </section>
  );
}

function GoalEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: number;
  onSave: (v: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(String(initial));
  return (
    <div className="goal-editor">
      <input
        type="number"
        min={1}
        max={365}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="목표 일수"
      />
      <span>일</span>
      <button type="button" className="goal-save" onClick={() => onSave(Number(value))}>
        저장
      </button>
      <button type="button" className="goal-cancel" onClick={onCancel}>
        취소
      </button>
    </div>
  );
}

function RecordModal({
  date,
  myTeam,
  game,
  existing,
  authToken,
  onClose,
  onSaved,
}: {
  date: string;
  myTeam: { code: string; name: string; short: string; color: string } | null;
  game: ScheduleGame | null;
  existing: RecordRow | null;
  authToken: string;
  onClose: () => void;
  onSaved: (date: string, action: "save" | "delete") => void;
}) {
  const [stadium, setStadium] = useState(existing?.stadium ?? "");
  const [mood, setMood] = useState<string | null>(existing?.mood ?? null);
  const [memo, setMemo] = useState(existing?.memo ?? "");
  const [saving, setSaving] = useState(false);

  const [, m, d] = date.split("-");
  // 상대팀: 예정표 우선, (예정표 없고 기존 기록만 있으면) 기록의 상대팀
  const oppCode = game?.oppCode ?? existing?.team_code ?? null;
  const opp = teamByCode(oppCode);
  const isFutureDate = date > koreaTodayKey();
  const hasGame = Boolean(game || existing);

  async function handleSave() {
    if (isFutureDate || !oppCode || !mood || !authToken) return;
    setSaving(true);
    try {
      // 날짜당 1건 유지: 기존 기록 있으면 삭제 후 생성 (백엔드 update 없음)
      if (existing?.record_id) {
        await fetch(apiUrl(`/my-records/${existing.record_id}`), {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        });
      }
      await fetch(apiUrl("/my-records"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          record_date: date,
          mood,
          team_code: oppCode,
          stadium: stadium.trim() || null,
          memo: memo.trim() || null,
          game_id: game?.gameId ?? (myTeam ? `${myTeam.code} vs ${oppCode}` : oppCode),
        }),
      });
      onSaved(date, "save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing?.record_id || !authToken) return;
    setSaving(true);
    try {
      await fetch(apiUrl(`/my-records/${existing.record_id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      onSaved(date, "delete");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="rec-backdrop" role="presentation" onClick={onClose}>
      <div
        className="rec-modal"
        role="dialog"
        aria-modal="true"
        aria-label="직관 기록"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rec-modal-head">
          <strong>
            {Number(m)}월 {Number(d)}일 직관 기록
          </strong>
          <button type="button" className="rec-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </div>

        {isFutureDate ? (
          <p className="rec-nogame">아직 경기가 진행되지 않은 날짜라 기록할 수 없어요.</p>
        ) : !hasGame ? (
          <p className="rec-nogame">이 날은 우리 팀 경기 일정이 없어요.</p>
        ) : (
          <>
            {/* 매치업: 내팀(고정) vs 상대(예정표 자동) */}
            <div className="rec-matchup">
              <span className="rec-myteam" style={{ background: myTeam?.color ?? "#888" }}>
                {myTeam?.short ?? "내 팀"}
              </span>
              <span className="rec-vs">VS</span>
              <span
                className="rec-oppbox"
                style={opp ? { background: opp.color, color: "#fff" } : undefined}
              >
                {opp?.short ?? "상대"}
              </span>
            </div>

            <p className="rec-field-label">관람처</p>
            <input
              className="rec-input"
              type="text"
              value={stadium}
              onChange={(e) => setStadium(e.target.value)}
              placeholder="예: 잠실야구장, 고척스카이돔, 집(TV) 등"
            />

            <p className="rec-field-label">결과</p>
            <div className="rec-mood-list">
              {MOODS.map((mo) => (
                <button
                  key={mo.key}
                  type="button"
                  className={`rec-mood ${mood === mo.key ? "on" : ""}`}
                  style={mood === mo.key ? { borderColor: mo.color } : undefined}
                  onClick={() => setMood(mo.key)}
                >
                  <span>{mo.emoji}</span>
                  {mo.label}
                </button>
              ))}
            </div>

            <p className="rec-field-label">메모</p>
            <input
              className="rec-input"
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="한 줄 메모 (선택)"
              maxLength={200}
            />

            <div className="rec-actions">
              {existing ? (
                <button type="button" className="rec-delete" onClick={handleDelete} disabled={saving}>
                  삭제
                </button>
              ) : null}
              <button
                type="button"
                className="rec-save"
                onClick={handleSave}
                disabled={saving || isFutureDate || !mood}
              >
                {saving ? "저장 중" : !mood ? "결과를 선택하세요" : "직관 기록 저장"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default MyRecordsView;
