import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  BookOpenCheck,
  CalendarCheck,
  Megaphone,
  Shirt,
  Smile,
  Volume2,
} from "lucide-react";
import { apiUrl } from "../api";
import { getRecentQuestions } from "../db";
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
  replaceSpeechAddressee,
  syncAttendance,
  tamagotchiStorageKey,
  type TamagotchiViewState,
} from "../data/tamagotchiState";
import { type TopMenuTarget } from "./TopMenu";
import { AppBackButton } from "./AppBackButton";
import { MenuButton } from "./MenuButton";
import { SideMenu } from "./SideMenu";
import LockerRoom from "./LockerRoom";

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
  personalized?: boolean;   // 내 최근 질문 주제로 생성된 맞춤 문항
}

interface QuizResult {
  is_correct: boolean;
  xp_earned: number;
  explanation: string;
}

// 'man' = 남자, 'girl' = 여자. 아직 안 고르면 null.
export type Gender = "man" | "girl" | null;

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
const SHOW_TEST_PANEL = true;

// 설정 화면 안내문/라벨 들여쓰기 (px) — 성별 카드 시작선에 맞춤, 숫자로 조절
const SETUP_TEXT_INDENT_PX = 12;

// 다마고치 전체 폰트 (Pretendard) — index.css 에 Pretendard @import 필요 (적용 안내 참고)
const TAMAGOTCHI_FONT =
  '"Pretendard Variable", Pretendard, -apple-system, "Malgun Gothic", sans-serif';

// =====================================================================
// 말풍선 위치: [카드 상단 ~ 캐릭터 머리] 공백을 위아래 똑같이 나누는 자리
//  - 머리 위치는 캐릭터 PNG의 투명 영역(알파)을 직접 읽어 정확히 측정
//    · 꼬마: 파일 규격이 전부 동일 → 항상 같은 자리 (고정)
//    · 어른: 어른 키에 맞는 대칭 자리가 자동 적용 (가림 방지)
//  - 측정 불가 시 표준 여백 비율(아래)로 대체
// =====================================================================
const CHAR_HEAD_PAD_RATIO = 108 / 543; // 표준 규격(남자 꼬마 기준) 머리 위 여백 비율
const BUBBLE_MIN_TOP_PX = 8;           // 공간이 모자랄 때의 최소 상단 여백
const BUBBLE_FONT_PX = 13;             // 말풍선 글자 크기(px, 고정 — 말풍선이 글 길이에 맞춰 늘어남)

// =====================================================================
// 캐릭터 크기 배율 (수동 조절표)
//  - 꼬마(child) 이미지는 파일 자체를 남자 기준 규격으로 통일 완료 → 1.0 고정
//  - 어른(adult)도 이미지 차이가 보이면 같은 방식으로 파일 통일 권장 (임시로 숫자 보정 가능)
//  - 1.0 = CSS 기본 크기. 키우려면 1.1... / 줄이려면 0.9...
// =====================================================================
const CHAR_SIZE_SCALE: Record<"default" | "child" | "adult", { man: number; girl: number }> = {
  default: { man: 1.0, girl: 1.0 },
  child: { man: 1.0, girl: 1.0 },
  adult: { man: 1.0, girl: 1.0 },
};

// =====================================================================
// 캐릭터 이미지 경로 만들기
//  규칙: /character/{팀}_{단계}_{성별}.png
//   - 무소속(구단 없음): 레벨과 무관하게 default_{성별}.png  ← 무소속은 단계 이미지 없음
//   - 구단 있음 2~4레벨: {팀}_child_{성별}.png
//   - 구단 있음 5레벨↑: {팀}_adult_{성별}.png
//  ※ 파일이 아직 없으면 <img onError>에서 default로 대체합니다.
// =====================================================================
export function getCharacterImage(level: number, teamCode: string | null | undefined, gender: Gender): string {
  const g = gender === "girl" ? "girl" : "man";
  const team = teamCode && teamCode.trim() !== "" ? teamCode.trim() : "";
  // 무소속(구단 없음)이거나 1레벨이면 기본 캐릭터 사용
  if (!team || level <= 1) {
    return `/character/default_${g}.png`;
  }
  const stage = level >= 5 ? "adult" : "child"; // 2~4=child, 5↑=adult
  return `/character/${team}_${stage}_${g}.png`;
}

// =====================================================================
// 레벨업 보상(아이템 컬렉션)
//  - 특정 레벨 도달 시 아이템 획득 → "획득하셨어요!" 연출 후 좌측 컬렉션에 표시
//  - 같은 종류(배트/글러브)는 상위(high)가 하위(normal)를 교체
//    레벨3: 글러브(normal) / 레벨4: 배트(normal) / 레벨7: 야구공(high)
//    레벨8: 배트(high, 4레벨 배트 교체) / 레벨9: 글러브(high, 3레벨 글러브 교체)
// =====================================================================
// teamBased: true면 팀마다 다른 이미지(모자/수건 등). 이 경우 src는 팀 없을 때(무소속) 쓰는 기본 이미지.
// teamSuffix: 팀별 이미지 파일명 접미사 (예: "cap" → /equipment/{팀코드}_cap.png, "towel" → _towel.png)
export interface RewardItem { src: string; name: string; teamBased?: boolean; teamSuffix?: string; }

export const LEVEL_REWARDS: Record<number, RewardItem> = {
  3: { src: "/equipment/HT_towel.png", name: "응원 수건", teamBased: true, teamSuffix: "towel" },
  4: { src: "/equipment/HT_cap.png", name: "야구 모자", teamBased: true, teamSuffix: "cap" },
  7: { src: "/equipment/ball_high_level.png", name: "고급 야구공" },
  8: { src: "/equipment/bat_high_level.png", name: "고급 배트" },
  9: { src: "/equipment/glove_high_level.png", name: "고급 글러브" },
};

// 팀별 아이템(모자·수건)이 있는 구단 코드
const TEAM_ITEM_CODES = ["HH", "HT", "KT", "LG", "LT", "NC", "OB", "SK", "SS", "WO"];

// 보상 아이템의 실제 이미지 경로를 구한다.
// 팀별 아이템이면 응원 팀코드로 경로를 만들고(/equipment/{팀코드}_{접미사}.png),
// 팀이 없으면(무소속) 기본 이미지(reward.src) 사용.
export function getRewardSrc(reward: RewardItem, teamCode?: string | null): string {
  if (reward.teamBased && reward.teamSuffix && teamCode && TEAM_ITEM_CODES.includes(teamCode)) {
    return `/equipment/${teamCode}_${reward.teamSuffix}.png`;
  }
  return reward.src;
}

// 현재 레벨 기준으로 보유 중인 아이템(슬롯별 최상위 버전)을 계산
export function getOwnedItems(level: number): RewardItem[] {
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
    loadDailyState(stateStorageKey, initialNickname)
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
  const [testGender, setTestGender] = useState<Gender>("man"); // 테스트용 성별

  // 꾸미기(라커룸) 오버레이 열림 여부
  const [showLocker, setShowLocker] = useState(false);

  // ☰ 사이드 메뉴 열림 여부 (상단 탭바 → 뒤로가기/제목/☰ 헤더 교체로 추가)
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  // 레벨업 보상 연출 대기열 (앞에서부터 하나씩 팝업)
  const [rewardQueue, setRewardQueue] = useState<RewardItem[]>([]);

  const progress = useMemo(
    () => Math.min(100, Math.round(((status.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)),
    [status.xp],
  );

  // 짝꿍 별명 (dev에서 추가됨)
  const displayBuddyNickname = buddyNickname.trim() || DEFAULT_BUDDY_NICKNAME;

  const charTeam = SHOW_TEST_PANEL ? testTeam : favTeamCode;
  const charGender = SHOW_TEST_PANEL ? testGender : gender;

  // 무소속(팀 미선택)이면 레벨을 1로 제한 — 어떤 경로(테스트 패널/실제 경험치)로 레벨이 올라도
  // 캐릭터/보상/라커룸 화면은 2레벨 이상을 그리지 않음 (구단별 이미지가 없는 화면 노출 방지)
  const rawLevel = SHOW_TEST_PANEL ? testLevel : status.level;
  const charLevel = !charTeam ? Math.min(rawLevel, 1) : rawLevel;
  // 무소속인데 실제 레벨이 2 이상이면 안내 배너 표시용
  const levelLockedByNoTeam = !charTeam && rawLevel >= 2;

  const displayLevel = SHOW_TEST_PANEL ? charLevel : (status.level || 3);
  const displayProgress = SHOW_TEST_PANEL ? 0 : (progress || 60);
  const characterSrc = useMemo(
    () => getCharacterImage(charLevel, charTeam, charGender),
    [charLevel, charTeam, charGender],
  );

  // 캐릭터 크기 보정 + 말풍선 대칭 배치용 ref
  const charImgRef = useRef<HTMLImageElement | null>(null);
  const fieldCardRef = useRef<HTMLElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const [bubbleTopPx, setBubbleTopPx] = useState<number | null>(null);

  // 현재 캐릭터 단계 (이미지 규칙과 동일한 분기)
  const charStage: "default" | "child" | "adult" =
    !charTeam || charLevel <= 1 ? "default" : charLevel >= 5 ? "adult" : "child";

  // 캐릭터 크기 적용: CHAR_SIZE_SCALE 의 단계×성별 배율을 CSS 기본 높이에 곱해 강제 적용
  // ※ CSS 클래스에 !important 가 있어도 이기도록 setProperty(..., "important") 사용
  const applyCharacterScale = () => {
    const img = charImgRef.current;
    if (!img) return;
    if (!img.complete || img.naturalWidth === 0) return; // 로드 전이면 onLoad 때 다시 옴
    // 인라인 크기를 잠시 지워 CSS 기본 박스 높이(baseH)를 측정
    img.style.removeProperty("height");
    img.style.removeProperty("width");
    const baseH = img.getBoundingClientRect().height;
    if (baseH > 0) {
      const genderKey = charGender === "girl" ? "girl" : "man";
      const scale = CHAR_SIZE_SCALE[charStage][genderKey];
      if (scale !== 1.0) {
        img.style.setProperty("height", `${Math.round(baseH * scale)}px`, "important");
        img.style.setProperty("width", "auto", "important"); // 비율 유지
      }
    }
  };

  // 말풍선 위치 계산: [카드 상단 ~ 머리] 공백을 위아래 똑같이 나눔
  // 머리 위치는 이미지의 투명 영역(알파)을 스캔해 정확히 측정 (이미지별 1회 후 캐시)
  const headPadCache = useRef<Record<string, number>>({});
  const getHeadPadRatio = (img: HTMLImageElement): number => {
    const key = img.currentSrc || img.src;
    const cached = headPadCache.current[key];
    if (cached !== undefined) return cached;
    if (!img.complete || img.naturalWidth === 0) return CHAR_HEAD_PAD_RATIO;
    try {
      const size = 64;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return CHAR_HEAD_PAD_RATIO;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let ratio = CHAR_HEAD_PAD_RATIO;
      outer: for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (data[(y * size + x) * 4 + 3] > 20) {
            ratio = y / size;
            break outer;
          }
        }
      }
      headPadCache.current[key] = ratio;
      return ratio;
    } catch {
      return CHAR_HEAD_PAD_RATIO; // 측정 불가 시 표준 비율로 동작
    }
  };

  const measureBubbleTop = () => {
    const field = fieldCardRef.current;
    const img = charImgRef.current;
    if (!field || !img) return;
    const fieldRect = field.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    if (fieldRect.height === 0 || imgRect.height === 0) return;
    // --- 위아래 공백 대칭 지점 계산 ---
    const headTopY = imgRect.top - fieldRect.top + imgRect.height * getHeadPadRatio(img);
    const bubbleH = bubbleRef.current ? bubbleRef.current.offsetHeight : 0;
    const top = Math.max(BUBBLE_MIN_TOP_PX, (headTopY - bubbleH) / 2);
    setBubbleTopPx(Math.round(top));
  };

  // 크기 적용 → 말풍선 계산 순서로 함께 실행
  const refreshCharacterLayout = () => {
    applyCharacterScale();
    measureBubbleTop();
  };

  useEffect(() => {
    refreshCharacterLayout();
    window.addEventListener("resize", refreshCharacterLayout);
    return () => window.removeEventListener("resize", refreshCharacterLayout);
    // 캐릭터/문구가 바뀌면 재계산 (이미지 로드 완료 시엔 <img onLoad>가 호출)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterSrc, imgFailed, charStage, charGender, dailyState.speechText]);

  // 말풍선 본체 — 가로 정중앙, 한 줄 고정(글 길이에 맞춰 자동 확장), 위아래 공백 대칭 (꼬리 없음)
  const speechBubbleStyle: CSSProperties = {
    position: "absolute",
    left: "50%",
    top: bubbleTopPx ?? 0,
    transform: "translateX(-50%)",
    visibility: bubbleTopPx === null ? "hidden" : "visible",
    whiteSpace: "nowrap",
    background: "#fff",
    border: "2px solid #0f172a",
    borderRadius: 14,
    padding: "9px 14px",
    fontSize: BUBBLE_FONT_PX,
    fontWeight: 700,
    color: "#0f172a",
    textAlign: "center",
    lineHeight: 1.4,
    zIndex: 5,
    boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
  };

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
        speechText: randomSpeech(DEFAULT_SPEECHES, nickname),
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
      updateDailyState((current) => ({
        ...current,
        speechText: replaceSpeechAddressee(
          current.speechText,
          initialNickname,
          buddyNickname,
        ),
      }));
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
            speechText: replaceSpeechAddressee(
              current.speechText,
              loadedNickname,
              buddyNickname,
            ),
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
          updateDailyState((current) => ({
            ...current,
            speechText: replaceSpeechAddressee(
              current.speechText,
              nickname,
              nextBuddyNickname,
            ),
          }));
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
          randomSpeech(DEFAULT_SPEECHES, nickname),
        );
        const personalized = {
          ...initialized,
          speechText: replaceSpeechAddressee(
            initialized.speechText,
            nickname,
            buddyNickname,
          ),
        };
        setDailyState(personalized);
        saveDailyState(stateStorageKey, personalized);
        saveServerDailyState(authToken, personalized);
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
        // 로컬 SQLite의 최근 챗 질문을 함께 보내면 그 주제로 맞춤 문항 1개가 생성됨
        // (일시 전달 — 서버에 저장되지 않음. 이력 없으면 빈 배열 → 기존 정적 출제)
        let recentQuestions: string[] = [];
        try {
          recentQuestions = await getRecentQuestions(5);
        } catch {
          /* 로컬 DB 미초기화 등 — 정적 출제로 진행 */
        }
        const response = await fetch(apiUrl("/quiz/daily"), {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ recent_questions: recentQuestions }),
        });
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
      const speech = randomSpeech(ATTENDANCE_SPEECHES, nickname);
      updateDailyState((current) => applyAttendance(current, todayKey(), speech));
      setNotice(speech);
    } catch {
      const next = applyLocalCheckIn(authToken, status);
      setStatus(next);
      const speech = randomSpeech(ATTENDANCE_SPEECHES, nickname);
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
    const speech = randomSpeech(CHEER_SPEECHES, nickname);
    updateDailyState((current) => applyCheer(current, todayKey(), speech));
    setNotice(speech);
  }

  function handleDecorate() {
    setShowLocker(true);
  }

  const currentQuestion = quizQuestions[currentQuizIdx] ?? null;
  const currentResult = currentQuestion ? quizResults[String(currentQuestion.quiz_id)] : null;
  const answeredCount = Object.keys(quizResults).length;
  const allDone = quizQuestions.length > 0 && answeredCount >= quizQuestions.length;
  const totalQuizXp = Object.values(quizResults).reduce((sum, result) => sum + result.xp_earned, 0);

  // ===== 성별을 아직 안 골랐으면: 성별 선택 화면 =====
  if (!gender || !buddyNickname.trim()) {
    return (
      <section className="attendance-panel tamagotchi-setup-panel" aria-label="야구짝꿍 초기 설정" style={{ fontFamily: TAMAGOTCHI_FONT }}>
        <div className="tamagotchi-setup-card">
          <p className="eyebrow">Start</p>
          <h2>야구짝꿍을 설정해주세요</h2>
          <p
            className="attendance-message"
            style={{ fontSize: 13, textAlign: "center" }}
          >
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
            <span style={{ paddingLeft: SETUP_TEXT_INDENT_PX }}>야구짝꿍 닉네임</span>
            <input
              type="text"
              value={buddyNicknameInput}
              maxLength={MAX_BUDDY_NICKNAME_LENGTH}
              placeholder="예: 야꿍"
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
    <section className="tamagotchi-dashboard" aria-label="야구짝꿍" style={{ fontFamily: TAMAGOTCHI_FONT }}>
      {/* 상단 헤더: 구장정보 페이지와 동일 구성 (뒤로가기 / 제목 / ☰) — 탭바(TopMenu) 대체 */}
      {/* 스타일: styles.css의 .tamagotchi-app-header (dashboard padding 상쇄 음수 마진 + grid 배치 포함) */}
      <header className="tamagotchi-app-header">
        <AppBackButton onClick={() => onRequestClose?.()} />
        <h2>야구짝꿍</h2>
        <MenuButton onClick={() => setSideMenuOpen(true)} />
      </header>

      <SideMenu
        isOpen={sideMenuOpen}
        active="tamagotchi"
        onNavigate={(target) => {
          if (target === "tamagotchi") return; // 현재 화면이면 이동 안 함 (StadiumPage와 동일 패턴)
          onNavigate?.(target);
        }}
        onClose={() => setSideMenuOpen(false)}
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

      <section
        className="tamagotchi-field-card"
        aria-label="캐릭터 영역"
        style={{ position: "relative" }}
        ref={fieldCardRef}
      >
        {/* 무소속인데 레벨이 2 이상이면 안내: 팀을 선택해야 캐릭터가 성장한 모습으로 보임 */}
        {levelLockedByNoTeam ? (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: 8,
              transform: "translateX(-50%)",
              background: "rgba(220, 38, 38, 0.92)",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 12px",
              borderRadius: 999,
              whiteSpace: "nowrap",
              zIndex: 3,
            }}
          >
            ⚠️ 2레벨 이상은 팀 선택을 해야 가능합니다.
          </div>
        ) : null}
        {/* 말풍선: 가로 정중앙, 위아래 공백 대칭 지점 고정 (measureBubbleTop 참고), 꼬리 없음 */}
        <div ref={bubbleRef} style={speechBubbleStyle}>
          {dailyState.speechText}
        </div>
        <img
          ref={charImgRef}
          className="tamagotchi-character-img"
          src={imgFailed ? FALLBACK_CHARACTER_SRC : characterSrc}
          alt="야구짝꿍 캐릭터"
          onLoad={refreshCharacterLayout}
          onError={() => setImgFailed(true)}
          style={{ filter: "none" }} // 캐릭터 그림자 제거
        />
      </section>

      {/* ===== 테스트 패널 (SHOW_TEST_PANEL=true 일 때만 보임 / 배포 시 false) ===== */}
      {SHOW_TEST_PANEL ? (
        <section
          aria-label="테스트 패널"
          style={{
            gridColumn: "1 / -1",
            margin: "12px 0",
            padding: "12px 14px",
            border: "1px dashed #c084fc",
            borderRadius: 12,
            background: "#faf5ff",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 700, color: "#9333ea", marginBottom: 10 }}>
            🧪 테스트 패널 (배포 시 SHOW_TEST_PANEL=false)
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ width: 32, color: "#6b7280" }}>레벨</span>
            <input
              type="range"
              min={1}
              max={10}
              value={testLevel}
              onChange={(e) => {
                const next = Number(e.target.value);
                setTestLevel(next);
                // 규칙: 1레벨 = 무조건 무소속, 2레벨 이상 = 무조건 구단 소속
                if (next === 1) {
                  setTestTeam("");
                } else if (!testTeam) {
                  setTestTeam("HT"); // 2레벨 진입 시 구단 미선택이면 기본 구단 자동 선택
                }
              }}
              style={{ flex: 1 }}
            />
            <strong style={{ width: 24, textAlign: "right" }}>{testLevel}</strong>
          </div>
          <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 10 }}>
            1레벨 = 무소속 고정 · 2레벨부터 구단 소속 (무소속 불가)
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 32, color: "#6b7280" }}>구단</span>
            <select
              value={testTeam}
              onChange={(e) => setTestTeam(e.target.value)}
              disabled={testLevel === 1}
              title={testLevel === 1 ? "1레벨은 무소속 고정입니다. 레벨을 올리면 구단을 선택할 수 있어요." : undefined}
              style={{ flex: 1, padding: "4px 6px", borderRadius: 6, opacity: testLevel === 1 ? 0.5 : 1, cursor: testLevel === 1 ? "not-allowed" : "pointer" }}
            >
              <option value="" disabled={testLevel >= 2}>무소속(default)</option>
              <option value="HT">KIA (HT)</option>
              <option value="SS">삼성 (SS)</option>
              <option value="HH">한화 (HH)</option>
              <option value="LT">롯데 (LT)</option>
              <option value="LG">LG (LG)</option>
              <option value="OB">두산 (OB)</option>
              <option value="SK">SSG (SK)</option>
              <option value="NC">NC (NC)</option>
              <option value="KT">KT (KT)</option>
              <option value="WO">키움 (WO)</option>
            </select>
          </div>

          {/* 성별 선택: 남/녀 캐릭터가 잘 뜨는지 확인 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
            <span style={{ width: 32, color: "#6b7280" }}>성별</span>
            <div style={{ display: "flex", gap: 8, flex: 1 }}>
              <button
                type="button"
                onClick={() => setTestGender("man")}
                style={{
                  flex: 1, padding: "6px 0", borderRadius: 8, cursor: "pointer",
                  border: testGender === "man" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: testGender === "man" ? "#dbeafe" : "#fff",
                  fontWeight: testGender === "man" ? 700 : 400,
                }}
              >
                👦 남자
              </button>
              <button
                type="button"
                onClick={() => setTestGender("girl")}
                style={{
                  flex: 1, padding: "6px 0", borderRadius: 8, cursor: "pointer",
                  border: testGender === "girl" ? "2px solid #db2777" : "1px solid #cbd5e1",
                  background: testGender === "girl" ? "#fce7f3" : "#fff",
                  fontWeight: testGender === "girl" ? 700 : 400,
                }}
              >
                👧 여자
              </button>
            </div>
          </div>

          {/* 5레벨 성인 전환 빠른 확인: child(4레벨) ↔ adult(5레벨) 토글 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <span style={{ width: 32, color: "#6b7280" }}>단계</span>
            <button
              type="button"
              onClick={() => { setTestLevel(1); setTestTeam(""); }}
              style={{ flex: 1, padding: "5px 0", borderRadius: 8, cursor: "pointer", border: "1px solid #cbd5e1", background: charLevel <= 1 ? "#ede9fe" : "#fff" }}
            >
              1레벨(default)
            </button>
            <button
              type="button"
              onClick={() => { setTestLevel(4); if (!testTeam) setTestTeam("HT"); }}
              style={{ flex: 1, padding: "5px 0", borderRadius: 8, cursor: "pointer", border: "1px solid #cbd5e1", background: (charLevel >= 2 && charLevel <= 4) ? "#ede9fe" : "#fff" }}
            >
              4레벨(child)
            </button>
            <button
              type="button"
              onClick={() => { setTestLevel(5); if (!testTeam) setTestTeam("HT"); }}
              style={{ flex: 1, padding: "5px 0", borderRadius: 8, cursor: "pointer", border: "1px solid #cbd5e1", background: charLevel >= 5 ? "#ede9fe" : "#fff" }}
            >
              5레벨(adult)
            </button>
          </div>

          <div style={{ marginTop: 10, color: "#6b7280", fontSize: 12 }}>
            성별: {charGender === "girl" ? "여자(girl)" : "남자(man)"}
            {" · "}단계: {(!charTeam || charLevel <= 1) ? "default(기본)" : charLevel >= 5 ? "adult(5레벨↑)" : "child(2~4레벨)"}
            {" · "}경로: <code>{characterSrc}</code>
          </div>

        </section>
      ) : null}

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
                  {currentQuestion?.personalized ? (
                    <span className="quiz-difficulty-badge" style={{ background: "#7c5cff" }}>
                      ★ 맞춤
                    </span>
                  ) : null}
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

      {/* ===== 꾸미기: 라커룸 도감 오버레이 ===== */}
      {showLocker ? (
        <LockerRoom
          level={charLevel}
          teamCode={charTeam}
          gender={charGender}
          onClose={() => setShowLocker(false)}
        />
      ) : null}

      {/* ===== 레벨업 보상 획득 팝업 ===== */}
      {rewardPopup ? (
        <div
          role="dialog"
          aria-label="아이템 획득"
          onClick={dismissReward}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 20, padding: "28px 32px",
              textAlign: "center", maxWidth: "80vw",
              animation: "rewardPop 0.4s ease",
            }}
          >
            <div style={{ fontSize: 14, color: "#9333ea", fontWeight: 700, marginBottom: 12 }}>
              🎉 새 아이템 획득!
            </div>
            <img
              src={getRewardSrc(rewardPopup, charTeam)}
              alt={rewardPopup.name}
              style={{ width: 120, height: 120, objectFit: "contain", animation: "rewardSpin 0.6s ease" }}
              onError={(e) => { (e.currentTarget.style.display = "none"); }}
            />
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>
              {rewardPopup.name}
            </div>
            <div style={{ fontSize: 15, color: "#374151", marginTop: 4 }}>
              획득하셨어요!
            </div>
            <button
              type="button"
              onClick={dismissReward}
              style={{
                marginTop: 18, padding: "8px 24px", border: "none",
                borderRadius: 999, background: "#9333ea", color: "#fff",
                fontWeight: 700, cursor: "pointer",
              }}
            >
              확인
            </button>
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes rewardPop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes rewardSpin {
          0% { transform: rotate(-12deg) scale(0.7); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes itemPopIn {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
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
