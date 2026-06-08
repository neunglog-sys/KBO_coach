import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenCheck,
  CalendarCheck,
  Megaphone,
  Shirt,
  Smile,
  Volume2,
} from "lucide-react";
import { apiUrl } from "../api";
import {
  addDays,
  applyAttendance,
  applyCheer,
  ATTENDANCE_SPEECHES,
  CHEER_SPEECHES,
  DEFAULT_SPEECHES,
  initializeTamagotchiState,
  localDateKey,
  randomSpeech,
  syncAttendance,
  tamagotchiStorageKey,
  type TamagotchiViewState,
} from "../data/tamagotchiState";
import { TopMenu, type TopMenuTarget } from "./TopMenu";

interface AttendanceStatus {
  level: number;
  xp: number;
  xp_to_next: number;
  total_checkins: number;
  streak: number;
  checked_today: boolean;
  last_checkin_date: string | null;
  gained_xp: number;
  message: string;
}

interface QuizQuestion {
  quiz_id: number;
  question: string;
  difficulty: string;
}

interface QuizResult {
  is_correct: boolean;
  xp_earned: number;
  explanation: string;
}

// 'man' = 남자, 'girl' = 여자. 아직 안 고르면 null.
type Gender = "man" | "girl" | null;

interface AttendanceCheckInProps {
  authToken: string;
  onCheckedTodayChange?: (checkedToday: boolean) => void;
  onRequestClose?: () => void;
  onNavigate?: (target: TopMenuTarget) => void;
  favTeamCode?: string | null;
  nickname?: string;
  buddyNickname?: string;
  onBuddyNicknameChange?: (nickname: string) => void;
}

const STORAGE_KEY = "baseballCoachAttendance";
const BUDDY_NICKNAME_STORAGE_KEY = "baseballCoachBuddyNickname";
const DEFAULT_BUDDY_NICKNAME = "야구짝꿍";
const MAX_BUDDY_NICKNAME_LENGTH = 10;
const GENDER_STORAGE_KEY = "baseballCoachGender"; // 성별 임시 저장(브라우저)
const CHECKIN_XP = 20;
const XP_PER_LEVEL = 100;
const CHILD_CHARACTER_SRC = "/img/tamagotchi-child.png?v=transparent-fixed";
const ADULT_CHARACTER_SRC = "/img/tamagotchi-adult.png?v=transparent-fixed-gap";
const FALLBACK_CHARACTER_SRC = "/img/character.png";

// ★ 테스트 패널 스위치 ★
//   true  = 테스트 패널 표시(레벨·구단을 직접 바꿔 캐릭터 확인) → 팀원 확인용
//   false = 패널 숨김, 실제 레벨·응원팀으로 동작 → 발표·배포용
//   git에 올릴 땐 false 권장. 테스트할 때만 true 로 바꾸세요.
const SHOW_TEST_PANEL = false;

// =====================================================================
// 캐릭터 이미지 경로 만들기
//  규칙: /character/{팀}_{단계}_{성별}.png
//   - 1레벨(무소속): default_{성별}.png   ← 예외(팀·단계 없음)
//   - 2~4레벨: {팀}_child_{성별}.png  (팀 없으면 default_child_{성별}.png)
//   - 5레벨↑: {팀}_adult_{성별}.png  (팀 없으면 default_adult_{성별}.png)
//  ※ 파일이 아직 없으면 <img onError>에서 default로 대체합니다.
// =====================================================================
function getCharacterImage(level: number, teamCode: string | null | undefined, gender: Gender): string {
  const g = gender === "girl" ? "girl" : "man";
  if (level <= 1) {
    return `/character/default_${g}.png`; // 1레벨 예외 처리
  }
  const stage = level >= 5 ? "adult" : "child"; // 2~4=child, 5↑=adult
  const team = teamCode && teamCode.trim() !== "" ? teamCode.trim() : "default";
  return `/character/${team}_${stage}_${g}.png`;
}

// =====================================================================
// 레벨업 보상(아이템 컬렉션)
//  - 특정 레벨 도달 시 아이템 획득 → "획득하셨어요!" 연출 후 좌측 컬렉션에 표시
//  - 같은 종류(배트/글러브)는 상위(high)가 하위(normal)를 교체
//    레벨3: 글러브(normal) / 레벨4: 배트(normal) / 레벨7: 야구공(high)
//    레벨8: 배트(high, 4레벨 배트 교체) / 레벨9: 글러브(high, 3레벨 글러브 교체)
// =====================================================================
interface RewardItem { src: string; name: string; }

const LEVEL_REWARDS: Record<number, RewardItem> = {
  3: { src: "/equipment/glove_normal_level.png", name: "글러브" },
  4: { src: "/equipment/bat_normal_level.png", name: "배트" },
  7: { src: "/equipment/ball_high_level.png", name: "고급 야구공" },
  8: { src: "/equipment/bat_high_level.png", name: "고급 배트" },
  9: { src: "/equipment/glove_high_level.png", name: "고급 글러브" },
};

// 현재 레벨 기준으로 보유 중인 아이템(슬롯별 최상위 버전)을 계산
function getOwnedItems(level: number): RewardItem[] {
  const items: RewardItem[] = [];
  // 야구공
  if (level >= 7) items.push(LEVEL_REWARDS[7]);
  // 배트: high(8↑)가 normal(4↑)을 교체
  if (level >= 8) items.push(LEVEL_REWARDS[8]);
  else if (level >= 4) items.push(LEVEL_REWARDS[4]);
  // 글러브: high(9↑)가 normal(3↑)을 교체
  if (level >= 9) items.push(LEVEL_REWARDS[9]);
  else if (level >= 3) items.push(LEVEL_REWARDS[3]);
  return items;
}

const LEVEL_SEEN_KEY = "baseballCoachLevelSeen"; // 마지막으로 본 레벨(보상 중복 방지)

// =====================================================================
// 성별 저장/불러오기 — ★ 나중에 "서버 DB 저장"으로 바꿀 부분은 여기뿐 ★
//  지금은 브라우저(localStorage)에 저장합니다.
//  서버로 바꿀 때:
//   - loadGender: fetch("/me/gender") 로 서버에서 읽기
//   - saveGender: fetch("/me/gender", {method:"POST"...}) 로 서버에 쓰기
//  화면/선택/캐릭터 코드는 그대로 두고 이 두 함수만 교체하면 됩니다.
// =====================================================================
function profileStorageSuffix(authToken: string) {
  return authToken ? authToken.slice(-16) : "guest";
}

function genderStorageKey(authToken: string) {
  return `${GENDER_STORAGE_KEY}:${profileStorageSuffix(authToken)}`;
}

function buddyNicknameStorageKey(authToken: string) {
  return `${BUDDY_NICKNAME_STORAGE_KEY}:${profileStorageSuffix(authToken)}`;
}

// 출석 fallback·레벨기록도 계정별로 분리(같은 기기에서 계정 바꿔도 안 섞이게).
function attendanceStorageKey(authToken: string) {
  return `${STORAGE_KEY}:${profileStorageSuffix(authToken)}`;
}

function levelSeenKey(authToken: string) {
  return `${LEVEL_SEEN_KEY}:${profileStorageSuffix(authToken)}`;
}

function loadGender(authToken: string): Gender {
  const saved = localStorage.getItem(genderStorageKey(authToken)) || localStorage.getItem(GENDER_STORAGE_KEY);
  return saved === "man" || saved === "girl" ? saved : null;
}

function saveGender(authToken: string, gender: Gender) {
  if (gender) localStorage.setItem(genderStorageKey(authToken), gender);
}

function loadBuddyNickname(authToken: string, initialBuddyNickname?: string) {
  const saved = localStorage.getItem(buddyNicknameStorageKey(authToken)) || "";
  return (initialBuddyNickname || saved || "").trim();
}

function saveBuddyNickname(authToken: string, nickname: string) {
  localStorage.setItem(buddyNicknameStorageKey(authToken), nickname);
}

function getDifficultyColor(difficulty?: string) {
  switch (difficulty) {
    case "초보":
      return "#2980b9";
    case "중급":
      return "#e67e22";
    case "고급":
      return "#e74c3c";
    default:
      return "#27ae60";
  }
}

function todayKey() {
  return localDateKey();
}

function isYesterday(dateKey: string | null | undefined): boolean {
  return !!dateKey && dateKey === addDays(todayKey(), -1);
}

function fallbackStatus(authToken: string): AttendanceStatus {
  const saved = localStorage.getItem(attendanceStorageKey(authToken));
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<AttendanceStatus>;
      const xp = Number(parsed.xp || 0);
      const last = parsed.last_checkin_date || null;
      // 연속출석: 마지막 출석이 오늘/어제면 유효, 그 이전이면 끊김(0)
      const streak =
        last === todayKey() || isYesterday(last) ? Number(parsed.streak || 0) : 0;
      return {
        level: Math.floor(xp / XP_PER_LEVEL) + 1,
        xp,
        xp_to_next: XP_PER_LEVEL - (xp % XP_PER_LEVEL),
        total_checkins: Number(parsed.total_checkins || 0),
        streak,
        checked_today: last === todayKey(),
        last_checkin_date: last,
        gained_xp: 0,
        message: last === todayKey() ? "오늘 출석 완료!" : "아직 오늘 출석 전이에요.",
      };
    } catch {
      localStorage.removeItem(attendanceStorageKey(authToken));
    }
  }

  return {
    level: 1,
    xp: 0,
    xp_to_next: XP_PER_LEVEL,
    total_checkins: 0,
    streak: 0,
    checked_today: false,
    last_checkin_date: null,
    gained_xp: 0,
    message: "아직 오늘 출석 전이에요.",
  };
}

function saveFallback(authToken: string, status: AttendanceStatus) {
  localStorage.setItem(attendanceStorageKey(authToken), JSON.stringify(status));
}

function applyLocalCheckIn(authToken: string, current: AttendanceStatus): AttendanceStatus {
  if (current.checked_today) {
    return { ...current, gained_xp: 0, message: "오늘은 이미 출석했어요." };
  }

  const xp = current.xp + CHECKIN_XP;
  // 어제 출석했으면 연속 +1, 아니면 1부터
  const streak = isYesterday(current.last_checkin_date) ? current.streak + 1 : 1;
  const next: AttendanceStatus = {
    ...current,
    xp,
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    xp_to_next: XP_PER_LEVEL - (xp % XP_PER_LEVEL),
    total_checkins: current.total_checkins + 1,
    streak,
    checked_today: true,
    last_checkin_date: todayKey(),
    gained_xp: CHECKIN_XP,
    message: "출석 완료! 경험치가 올랐어요.",
  };
  saveFallback(authToken, next);
  return next;
}

function loadDailyState(storageKey: string, nickname?: string): TamagotchiViewState {
  let saved: Partial<TamagotchiViewState> | null = null;
  try {
    const raw = localStorage.getItem(storageKey);
    saved = raw ? JSON.parse(raw) as Partial<TamagotchiViewState> : null;
  } catch {
    localStorage.removeItem(storageKey);
  }

  const initialized = initializeTamagotchiState(
    saved,
    todayKey(),
    randomSpeech(DEFAULT_SPEECHES, nickname),
  );
  saveDailyState(storageKey, initialized);
  return initialized;
}

function saveDailyState(storageKey: string, state: TamagotchiViewState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Keep the in-memory state usable if browser storage is unavailable.
  }
}

// 다마고치 상태(기분·응원파워·연속)를 계정에 묶어 서버에 보존 — 기기 바꿔도 유지.
async function fetchServerDailyState(
  authToken: string,
): Promise<Partial<TamagotchiViewState> | null> {
  if (!authToken) return null;
  try {
    const res = await fetch(apiUrl("/tamagotchi/state"), {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { state?: Partial<TamagotchiViewState> | null };
    return data?.state ?? null;
  } catch {
    return null;
  }
}

function saveServerDailyState(authToken: string, state: TamagotchiViewState) {
  if (!authToken) return;
  // fire-and-forget — 실패해도 로컬 저장으로 동작 유지
  fetch(apiUrl("/tamagotchi/state"), {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
    body: JSON.stringify({ state }),
  }).catch(() => undefined);
}

export default function AttendanceCheckIn({
  authToken,
  onCheckedTodayChange,
  onRequestClose,
  onNavigate,
  favTeamCode,
  nickname: initialNickname,
  buddyNickname: initialBuddyNickname,
  onBuddyNicknameChange,
}: AttendanceCheckInProps) {
  const [status, setStatus] = useState<AttendanceStatus>(() => fallbackStatus(authToken));
  const [gender, setGender] = useState<Gender>(() => loadGender(authToken));
  const [pendingGender, setPendingGender] = useState<Gender>(() => loadGender(authToken));
  const [buddyNickname, setBuddyNickname] = useState(() =>
    loadBuddyNickname(authToken, initialBuddyNickname)
  );
  const [buddyNicknameInput, setBuddyNicknameInput] = useState(() =>
    loadBuddyNickname(authToken, initialBuddyNickname)
  );
  const [buddyProfileError, setBuddyProfileError] = useState("");
  const [isBuddyProfileSaving, setIsBuddyProfileSaving] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [nickname, setNickname] = useState(initialNickname || "");
  const stateStorageKey = useMemo(() => tamagotchiStorageKey(authToken), [authToken]);
  const [dailyState, setDailyState] = useState<TamagotchiViewState>(() =>
    loadDailyState(stateStorageKey, initialBuddyNickname || initialNickname)
  );
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>({});
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [showingResult, setShowingResult] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizLoadError, setQuizLoadError] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  // 테스트 패널용 값 (SHOW_TEST_PANEL=true 일 때만 사용)
  const [testLevel, setTestLevel] = useState(1);
  const [testTeam, setTestTeam] = useState(""); // "" = 무소속(default)

  // 레벨업 보상 연출 대기열 (앞에서부터 하나씩 팝업)
  const [rewardQueue, setRewardQueue] = useState<RewardItem[]>([]);

  const progress = useMemo(
    () => Math.min(100, Math.round(((status.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)),
    [status.xp],
  );

  const displayLevel = status.level || 1;
  const displayProgress = progress;
  const displayBuddyNickname = buddyNickname.trim() || DEFAULT_BUDDY_NICKNAME;

  const charLevel = SHOW_TEST_PANEL ? testLevel : status.level;
  const charTeam = SHOW_TEST_PANEL ? testTeam : favTeamCode;
  const characterSrc = useMemo(
    () => getCharacterImage(charLevel, charTeam, gender),
    [charLevel, charTeam, gender],
  );

  useEffect(() => {
    setImgFailed(false);
  }, [characterSrc]);

  useEffect(() => {
    setGender(loadGender(authToken));
    setPendingGender(loadGender(authToken));
    const nextBuddyNickname = loadBuddyNickname(authToken, initialBuddyNickname);
    setBuddyNickname(nextBuddyNickname);
    setBuddyNicknameInput(nextBuddyNickname);
    // 계정 바뀌면 출석 상태도 그 계정 기준으로 즉시 리셋(서버 응답 전까지 이전 계정값 노출 방지)
    setStatus(fallbackStatus(authToken));
  }, [authToken, initialBuddyNickname]);

  const ownedItems = useMemo(() => getOwnedItems(charLevel), [charLevel]);

  const prevLevelRef = useRef<number | null>(null);
  useEffect(() => {
    if (SHOW_TEST_PANEL) {
      const prev = prevLevelRef.current ?? 1;
      if (charLevel > prev) {
        const newly: RewardItem[] = [];
        for (let L = prev + 1; L <= charLevel; L++) {
          if (LEVEL_REWARDS[L]) newly.push(LEVEL_REWARDS[L]);
        }
        if (newly.length) setRewardQueue((q) => [...q, ...newly]);
      }
      prevLevelRef.current = charLevel;
      return;
    }

    const seen = Number(localStorage.getItem(levelSeenKey(authToken)) || "1");
    if (charLevel > seen) {
      const newly: RewardItem[] = [];
      for (let L = seen + 1; L <= charLevel; L++) {
        if (LEVEL_REWARDS[L]) newly.push(LEVEL_REWARDS[L]);
      }
      if (newly.length) setRewardQueue((q) => [...q, ...newly]);
      localStorage.setItem(levelSeenKey(authToken), String(charLevel));
    }
  }, [charLevel, authToken]);

  const rewardPopup = rewardQueue[0] ?? null;
  function dismissReward() {
    setRewardQueue((q) => q.slice(1));
  }

  function handlePickGender(picked: Gender) {
    if (!picked) return;
    setPendingGender(picked);
    setImgFailed(false);
  }

  async function handleSaveBuddyProfile() {
    const nextBuddyNickname = buddyNicknameInput.trim();
    setBuddyProfileError("");

    if (!pendingGender) {
      setBuddyProfileError("야구짝꿍 성별을 선택해주세요.");
      return;
    }
    if (!nextBuddyNickname) {
      setBuddyProfileError("야구짝꿍 닉네임을 입력해주세요.");
      return;
    }
    if (nextBuddyNickname.length > MAX_BUDDY_NICKNAME_LENGTH) {
      setBuddyProfileError(`닉네임은 ${MAX_BUDDY_NICKNAME_LENGTH}자 이하로 입력해주세요.`);
      return;
    }

    setIsBuddyProfileSaving(true);
    try {
      if (authToken) {
        const response = await fetch(apiUrl("/auth/me/buddy"), {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({
            gender: pendingGender,
            buddy_nickname: nextBuddyNickname,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.detail || "야구짝꿍 설정 저장에 실패했습니다.");
        }
      }

      setGender(pendingGender);
      setBuddyNickname(nextBuddyNickname);
      saveGender(authToken, pendingGender);
      saveBuddyNickname(authToken, nextBuddyNickname);
      onBuddyNicknameChange?.(nextBuddyNickname);
      updateDailyState((current) => ({
        ...current,
        speechText: randomSpeech(DEFAULT_SPEECHES, nextBuddyNickname),
      }));
    } catch (error) {
      setBuddyProfileError(error instanceof Error ? error.message : "야구짝꿍 설정 저장에 실패했습니다.");
    } finally {
      setIsBuddyProfileSaving(false);
    }
  }

  const authHeaders = (extra?: Record<string, string>) =>
    authToken ? { Authorization: `Bearer ${authToken}`, ...extra } : { ...extra };

  function updateDailyState(
    updater: (current: TamagotchiViewState) => TamagotchiViewState,
  ) {
    setDailyState((current) => {
      const next = updater(current);
      saveDailyState(stateStorageKey, next);
      saveServerDailyState(authToken, next);   // 계정에 묶어 서버에도 보존
      return next;
    });
  }

  useEffect(() => {
    onCheckedTodayChange?.(status.checked_today || dailyState.todayAttendanceDone);
  }, [dailyState.todayAttendanceDone, onCheckedTodayChange, status.checked_today]);

  useEffect(() => {
    if (initialNickname) {
      setNickname(initialNickname);
      return;
    }
    if (!authToken) return;

    let ignore = false;
    fetch(apiUrl("/auth/me"), { headers: authHeaders() })
      .then((response) => response.ok ? response.json() : null)
      .then((user) => {
        if (!ignore && user?.nickname) {
          const loadedNickname = String(user.nickname);
          setNickname(loadedNickname);
          updateDailyState((current) => ({
            ...current,
            speechText: current.speechText.split("야구팬").join(loadedNickname),
          }));
        }
      })
      .catch(() => undefined);

    return () => {
      ignore = true;
    };
  }, [authToken, initialNickname]);

  // 서버에 저장된 캐릭터 성별 불러오기(로그인 시) → 기기 바꿔도 유지. 없으면 localStorage 값 유지.
  useEffect(() => {
    if (!authToken) return;
    let ignore = false;
    fetch(apiUrl("/auth/me"), { headers: { Authorization: `Bearer ${authToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((user) => {
        if (ignore || !user) return;
        if (user.gender === "man" || user.gender === "girl") {
          setGender(user.gender);
          setPendingGender(user.gender);
          saveGender(authToken, user.gender);
        }
        if (user.buddy_nickname) {
          const nextBuddyNickname = String(user.buddy_nickname).trim();
          setBuddyNickname(nextBuddyNickname);
          setBuddyNicknameInput(nextBuddyNickname);
          saveBuddyNickname(authToken, nextBuddyNickname);
          onBuddyNicknameChange?.(nextBuddyNickname);
        }
      })
      .catch(() => undefined);
    return () => {
      ignore = true;
    };
  }, [authToken]);

  useEffect(() => {
    let ignore = false;

    async function loadStatus() {
      try {
        const response = await fetch(apiUrl("/attendance/status"), { headers: authHeaders() });
        if (!response.ok) return;
        const data = (await response.json()) as AttendanceStatus;
        if (!ignore) {
          setStatus(data);
          saveFallback(authToken, data);
          updateDailyState((current) =>
            syncAttendance(current, data.last_checkin_date, todayKey())
          );
        }
      } catch {
        // Keep local fallback usable when the API is temporarily offline.
      }
    }

    loadStatus();
    return () => {
      ignore = true;
    };
  }, [authToken]);

  // 다마고치 상태(기분·응원파워·연속)를 서버에서 불러와 계정별로 복원(기기 바꿔도 유지).
  useEffect(() => {
    if (!authToken) return;
    let ignore = false;

    (async () => {
      const serverState = await fetchServerDailyState(authToken);
      if (ignore) return;
      if (serverState) {
        // 서버 상태로 초기화(오늘 기준 연속·페널티 평가 적용) → 화면·로컬·서버 동기화
        const initialized = initializeTamagotchiState(
          serverState,
          todayKey(),
          randomSpeech(DEFAULT_SPEECHES, buddyNickname || nickname),
        );
        setDailyState(initialized);
        saveDailyState(stateStorageKey, initialized);
        saveServerDailyState(authToken, initialized);
      } else {
        // 서버에 기록이 없으면(최초) 현재 로컬 상태를 계정에 올려 보존 시작
        setDailyState((current) => {
          saveServerDailyState(authToken, current);
          return current;
        });
      }
    })();

    return () => {
      ignore = true;
    };
  }, [authToken]);

  useEffect(() => {
    let ignore = false;

    async function loadQuiz() {
      try {
        const response = await fetch(apiUrl("/quiz/daily"), { headers: authHeaders() });
        if (!response.ok) {
          if (!ignore) setQuizLoadError("퀴즈 데이터를 불러오지 못했어요.");
          return;
        }
        const data = (await response.json()) as {
          questions: QuizQuestion[];
          results: Record<string, QuizResult>;
          answered_count: number;
        };
        if (!ignore) {
          setQuizQuestions(data.questions);
          setQuizResults(data.results);
          setCurrentQuizIdx(data.answered_count);
          setShowingResult(false);
          setQuizLoadError(data.questions.length > 0 ? "" : "오늘 풀 수 있는 퀴즈가 없어요.");
        }
      } catch {
        if (!ignore) {
          setQuizLoadError("백엔드 연결을 확인한 뒤 다시 실행해 주세요.");
        }
      }
    }

    loadQuiz();
    return () => {
      ignore = true;
    };
  }, [authToken]);

  async function handleCheckIn() {
    if (dailyState.todayAttendanceDone || status.checked_today || isLoading) return;

    setIsLoading(true);
    setNotice("");

    try {
      const response = await fetch(apiUrl("/attendance/check-in"), {
        method: "POST",
        headers: authHeaders(),
      });
      if (!response.ok) throw new Error("attendance api failed");

      const data = (await response.json()) as AttendanceStatus;
      setStatus(data);
      saveFallback(authToken, data);
      const speech = randomSpeech(ATTENDANCE_SPEECHES, displayBuddyNickname);
      updateDailyState((current) => applyAttendance(current, todayKey(), speech));
      setNotice(speech);
    } catch {
      const next = applyLocalCheckIn(authToken, status);
      setStatus(next);
      const speech = randomSpeech(ATTENDANCE_SPEECHES, displayBuddyNickname);
      updateDailyState((current) => applyAttendance(current, todayKey(), speech));
      setNotice(speech);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQuizAnswer(answer: boolean) {
    const question = quizQuestions[currentQuizIdx];
    if (!question || quizLoading) return;

    setQuizLoading(true);
    try {
      const response = await fetch(apiUrl("/quiz/answer"), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ quiz_id: question.quiz_id, answer }),
      });
      if (!response.ok) return;

      const data = (await response.json()) as {
        correct: boolean;
        xp_earned: number;
        explanation: string;
      };
      const result: QuizResult = {
        is_correct: data.correct,
        xp_earned: data.xp_earned,
        explanation: data.explanation,
      };

      setQuizResults((prev) => ({ ...prev, [String(question.quiz_id)]: result }));
      setShowingResult(true);
      if (data.xp_earned > 0) {
        setStatus((current) => {
          const xp = current.xp + data.xp_earned;
          const next = {
            ...current,
            xp,
            level: Math.floor(xp / XP_PER_LEVEL) + 1,
            xp_to_next: XP_PER_LEVEL - (xp % XP_PER_LEVEL),
          };
          saveFallback(authToken, next);
          return next;
        });
      }
    } catch {
      // Ignore transient quiz API failures for now.
    } finally {
      setQuizLoading(false);
    }
  }

  function handleNextQuiz() {
    setShowingResult(false);
    setCurrentQuizIdx((index) => index + 1);
  }

  function handleCheer() {
    const speech = randomSpeech(CHEER_SPEECHES, displayBuddyNickname);
    updateDailyState((current) => applyCheer(current, todayKey(), speech));
    setNotice(speech);
  }

  function handleDecorate() {
    setNotice("꾸미기는 준비 중이에요.");
  }

  const currentQuestion = quizQuestions[currentQuizIdx] ?? null;
  const currentResult = currentQuestion ? quizResults[String(currentQuestion.quiz_id)] : null;
  const answeredCount = Object.keys(quizResults).length;
  const allDone = quizQuestions.length > 0 && answeredCount >= quizQuestions.length;
  const totalQuizXp = Object.values(quizResults).reduce((sum, result) => sum + result.xp_earned, 0);

  // ===== 성별을 아직 안 골랐으면: 성별 선택 화면 =====
  if (!gender || !buddyNickname.trim()) {
    return (
      <section className="attendance-panel tamagotchi-setup-panel" aria-label="야구짝꿍 초기 설정">
        <div className="tamagotchi-setup-card">
          <p className="eyebrow">Start</p>
          <h2>야구짝꿍을 설정해주세요</h2>
          <p className="attendance-message">
            함께 성장할 야구짝꿍의 성별과 닉네임을 정해주세요.
          </p>
          <div className="tamagotchi-gender-options" role="group" aria-label="성별 선택">
            <button
              type="button"
              onClick={() => handlePickGender("man")}
              className={`tamagotchi-gender-card ${pendingGender === "man" ? "is-selected" : ""}`}
            >
              <img
                src="/character/default_man.png"
                alt="\ub0a8\uc790 \uce90\ub9ad\ud130"
                style={{ width: 96, height: 96, objectFit: "contain" }}
                onError={(e) => { (e.currentTarget.style.display = "none"); }}
              />
              <span>남자</span>
            </button>
            <button
              type="button"
              onClick={() => handlePickGender("girl")}
              className={`tamagotchi-gender-card ${pendingGender === "girl" ? "is-selected" : ""}`}
            >
              <img
                src="/character/default_girl.png"
                alt="\uc5ec\uc790 \uce90\ub9ad\ud130"
                style={{ width: 96, height: 96, objectFit: "contain" }}
                onError={(e) => { (e.currentTarget.style.display = "none"); }}
              />
              <span>여자</span>
            </button>
          </div>
          <label className="tamagotchi-nickname-field">
            <span>야구짝꿍 닉네임</span>
            <input
              type="text"
              value={buddyNicknameInput}
              maxLength={MAX_BUDDY_NICKNAME_LENGTH}
              placeholder="예: 동아"
              onChange={(event) => setBuddyNicknameInput(event.target.value)}
            />
            <small>{buddyNicknameInput.trim().length} / {MAX_BUDDY_NICKNAME_LENGTH}</small>
          </label>
          {buddyProfileError ? (
            <p className="tamagotchi-setup-error" role="alert">{buddyProfileError}</p>
          ) : null}
          <button
            type="button"
            className="tamagotchi-setup-submit"
            disabled={isBuddyProfileSaving}
            onClick={() => void handleSaveBuddyProfile()}
          >
            {isBuddyProfileSaving ? "저장 중..." : "시작하기"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="tamagotchi-dashboard" aria-label="야구짝꿍">
      <TopMenu
        active="tamagotchi"
        className="tamagotchi-nav"
        onNavigate={(target) => onNavigate?.(target)}
      />

      <section className="tamagotchi-status-card" aria-label="캐릭터 상태">
        <div className="tamagotchi-status-top">
          <h2>
            <span>Lv.{displayLevel}</span>
            {displayBuddyNickname}
          </h2>
          <div className="tamagotchi-exp">
            <strong>EXP</strong>
            <div aria-label={`경험치 ${displayProgress}%`}>
              <span style={{ width: `${displayProgress}%` }} />
            </div>
            <b>{displayProgress}%</b>
          </div>
        </div>
        <div className="tamagotchi-status-bottom">
          <p>
            <Smile aria-hidden="true" />
            오늘의 상태: <strong>{dailyState.moodStatus}</strong>
          </p>
          <p>
            <Volume2 aria-hidden="true" />
            응원력 <strong>{dailyState.cheerPower}</strong>
          </p>
        </div>
      </section>

      <section className="tamagotchi-field-card" aria-label="캐릭터 영역">
        <div className="tamagotchi-speech-bubble">
          {dailyState.speechText}
        </div>
        <img
          className="tamagotchi-character-img"
          src={imgFailed ? FALLBACK_CHARACTER_SRC : characterSrc}
          alt="야구짝꿍 캐릭터"
          onError={() => setImgFailed(true)}
        />
      </section>

      <div className="tamagotchi-actions">
        <button
          className="tamagotchi-action is-check"
          type="button"
          disabled={dailyState.todayAttendanceDone || status.checked_today || isLoading}
          onClick={handleCheckIn}
        >
          <span><CalendarCheck /></span>
          <strong>
            {dailyState.todayAttendanceDone || status.checked_today ? "출석완료" : "출석체크"}
          </strong>
        </button>
        <button className="tamagotchi-action is-dress" type="button" onClick={handleDecorate}>
          <span><Shirt /></span>
          <strong>꾸미기</strong>
        </button>
        <button
          className="tamagotchi-action is-cheer"
          type="button"
          onClick={handleCheer}
        >
          <span><Megaphone /></span>
          <strong>{dailyState.todayCheerDone ? "응원완료" : "응원하기"}</strong>
        </button>
        <button
          className="tamagotchi-action is-quiz"
          type="button"
          onClick={() => setShowQuiz((current) => !current)}
        >
          <span><BookOpenCheck /></span>
          <strong>퀴즈풀기</strong>
        </button>
      </div>

      {notice ? <p className="tamagotchi-notice" aria-live="polite">{notice}</p> : null}

      {showQuiz && quizQuestions.length > 0 ? (
        <div className="quiz-section tamagotchi-quiz-section">
          <div className="quiz-header">
            <span>OX 퀴즈</span>
            <span className="quiz-count">
              {answeredCount} / {quizQuestions.length}문제 완료
            </span>
          </div>

          {allDone ? (
            <div className="quiz-done-message">
              <p>오늘 퀴즈 완료!</p>
              {totalQuizXp > 0 ? (
                <p className="quiz-total-xp">
                  퀴즈 획득 XP: <strong>+{totalQuizXp} XP</strong>
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="quiz-question-box">
                <div className="quiz-question-meta">
                  <span
                    className="quiz-difficulty-badge"
                    style={{ background: getDifficultyColor(currentQuestion?.difficulty) }}
                  >
                    {currentQuestion?.difficulty}
                  </span>
                  <span className="quiz-question-num">
                    {currentQuizIdx + 1} / {quizQuestions.length}
                  </span>
                </div>
                <p className="quiz-question">{currentQuestion?.question}</p>

                {!showingResult ? (
                  <div className="quiz-ox-buttons">
                    <button
                      className="quiz-btn quiz-btn-o"
                      type="button"
                      disabled={quizLoading}
                      onClick={() => void handleQuizAnswer(true)}
                    >
                      O
                    </button>
                    <button
                      className="quiz-btn quiz-btn-x"
                      type="button"
                      disabled={quizLoading}
                      onClick={() => void handleQuizAnswer(false)}
                    >
                      X
                    </button>
                  </div>
                ) : null}
              </div>

              {showingResult && currentResult ? (
                <div className={`quiz-result-box ${currentResult.is_correct ? "correct" : "wrong"}`}>
                  <div className="quiz-result-header">
                    <span className="quiz-result-icon">
                      {currentResult.is_correct ? "정답!" : "오답"}
                    </span>
                    {currentResult.xp_earned > 0 ? (
                      <span className="quiz-xp-badge">+{currentResult.xp_earned} XP</span>
                    ) : null}
                  </div>
                  <p className="quiz-explanation">{currentResult.explanation}</p>
                  {currentQuizIdx + 1 < quizQuestions.length ? (
                    <button className="quiz-next-btn" type="button" onClick={handleNextQuiz}>
                      다음 문제
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {showQuiz && quizQuestions.length === 0 ? (
        <div className="quiz-section tamagotchi-quiz-section" role="status">
          <div className="quiz-done-message">
            <p>{quizLoadError || "퀴즈를 불러오는 중이에요."}</p>
          </div>
        </div>
      ) : null}

      <div className="tamagotchi-streak-card">
        <span><CalendarCheck /></span>
        <strong>연속 출석:</strong>
        <b>{status.streak}일째</b>
      </div>
    </section>
  );
}

// 성별 선택 카드 버튼 스타일(외부 CSS 없이 동작하도록 인라인)
const genderCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "16px 24px",
  border: "2px solid #e2e8f0",
  borderRadius: 16,
  background: "#fff",
  cursor: "pointer",
};

// 테스트 패널 스타일
const testPanelStyle: React.CSSProperties = {
  margin: "12px 0",
  padding: 12,
  border: "1px dashed #c026d3",
  borderRadius: 12,
  background: "#faf5ff",
};
