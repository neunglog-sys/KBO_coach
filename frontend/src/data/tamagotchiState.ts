export type MoodStatus = "보통" | "좋음" | "나쁨";

export interface TamagotchiState {
  stateVersion: number;
  lastAttendanceDate: string | null;
  lastCheerDate: string | null;
  lastPenaltyAppliedDate: string | null;
  lastEvaluatedDate: string;
  moodBase: Exclude<MoodStatus, "좋음">;
  cheerPower: number;
  speechText: string;
}

export interface TamagotchiViewState extends TamagotchiState {
  todayAttendanceDone: boolean;
  todayCheerDone: boolean;
  moodStatus: MoodStatus;
}

export const DEFAULT_CHEER_POWER = 0;
const CURRENT_STATE_VERSION = 2;

export const DEFAULT_SPEECHES = [
  "안녕 닉네임아! 오늘도 왔구나!",
  "오늘도 야구 보러 갈 준비 됐어?",
  "같이 응원하니까 더 신난다!",
  "오늘은 어떤 팀을 응원할까?",
  "닉네임아, 오늘도 좋은 하루 보내!",
] as const;

export const ATTENDANCE_SPEECHES = [
  "안녕 닉네임아! 오늘도 왔구나!",
  "와줘서 고마워! 오늘 하루는 어때?",
  "오늘도 함께해줘서 기뻐!",
  "기다리고 있었어, 닉네임아!",
  "출석 완료! 오늘도 같이 힘내보자!",
] as const;

export const CHEER_SPEECHES = [
  "나를 응원해줘서 고마워, 닉네임아!",
  "너 덕분에 힘이 난다! 더 열심히 할게!",
  "응원받으니까 오늘은 뭐든 할 수 있을 것 같아!",
  "닉네임아, 네 응원 덕분에 기분 최고야!",
  "고마워! 오늘 경기장에서도 힘차게 달려볼게!",
  "네 응원 한마디가 나한테는 큰 힘이야!",
  "오늘도 응원해줘서 정말 든든해!",
  "힘이 불끈불끈 난다! 고마워!",
  "닉네임아, 네가 있어서 더 열심히 할 수 있어!",
  "응원 완료! 오늘은 좋은 일이 생길 것 같아!",
] as const;

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(dateKey: string, amount: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function validDateKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function clampCheerPower(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(0, Math.min(100, Math.round(number)))
    : DEFAULT_CHEER_POWER;
}

function initialCheerPower(saved: Partial<TamagotchiState> | null): number {
  if (saved?.stateVersion !== CURRENT_STATE_VERSION) {
    const hasCheered = validDateKey(saved?.lastCheerDate);
    if (!hasCheered) return DEFAULT_CHEER_POWER;
  }
  return clampCheerPower(saved?.cheerPower);
}

export function formatSpeech(template: string, nickname?: string | null): string {
  return template.split("닉네임").join(nickname?.trim() || "야구팬");
}

export function randomSpeech(
  speeches: readonly string[],
  nickname?: string | null,
  random = Math.random,
): string {
  const index = Math.min(speeches.length - 1, Math.floor(random() * speeches.length));
  return formatSpeech(speeches[Math.max(0, index)], nickname);
}

function missedCheerDays(fromDate: string, untilExclusive: string, lastCheerDate: string | null) {
  let count = 0;
  let cursor = fromDate;
  while (cursor < untilExclusive) {
    if (cursor !== lastCheerDate) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

function withViewState(state: TamagotchiState, today: string): TamagotchiViewState {
  const todayAttendanceDone = state.lastAttendanceDate === today;
  const todayCheerDone = state.lastCheerDate === today;
  return {
    ...state,
    todayAttendanceDone,
    todayCheerDone,
    moodStatus: todayAttendanceDone && todayCheerDone ? "좋음" : state.moodBase,
  };
}

export function initializeTamagotchiState(
  saved: Partial<TamagotchiState> | null,
  today: string,
  defaultSpeech: string,
): TamagotchiViewState {
  if (!saved || !validDateKey(saved.lastEvaluatedDate)) {
    return withViewState({
      stateVersion: CURRENT_STATE_VERSION,
      lastAttendanceDate: validDateKey(saved?.lastAttendanceDate) ? saved.lastAttendanceDate : null,
      lastCheerDate: validDateKey(saved?.lastCheerDate) ? saved.lastCheerDate : null,
      lastPenaltyAppliedDate: validDateKey(saved?.lastPenaltyAppliedDate)
        ? saved.lastPenaltyAppliedDate
        : null,
      lastEvaluatedDate: today,
      moodBase: "보통",
      cheerPower: initialCheerPower(saved),
      speechText: saved?.speechText?.trim() || defaultSpeech,
    }, today);
  }

  const state: TamagotchiState = {
    stateVersion: CURRENT_STATE_VERSION,
    lastAttendanceDate: validDateKey(saved.lastAttendanceDate) ? saved.lastAttendanceDate : null,
    lastCheerDate: validDateKey(saved.lastCheerDate) ? saved.lastCheerDate : null,
    lastPenaltyAppliedDate: validDateKey(saved.lastPenaltyAppliedDate)
      ? saved.lastPenaltyAppliedDate
      : null,
    lastEvaluatedDate: saved.lastEvaluatedDate,
    moodBase: saved.moodBase === "나쁨" ? "나쁨" : "보통",
    cheerPower: initialCheerPower(saved),
    speechText: saved.speechText?.trim() || defaultSpeech,
  };

  if (state.lastEvaluatedDate >= today) {
    return withViewState({ ...state, lastEvaluatedDate: today }, today);
  }

  const yesterday = addDays(today, -1);
  const firstUnprocessedDate = state.lastPenaltyAppliedDate
    ? addDays(state.lastPenaltyAppliedDate, 1)
    : state.lastEvaluatedDate;
  const penaltyStartDate =
    firstUnprocessedDate > state.lastEvaluatedDate
      ? firstUnprocessedDate
      : state.lastEvaluatedDate;
  const missedDays = missedCheerDays(penaltyStartDate, today, state.lastCheerDate);
  return withViewState({
    ...state,
    lastPenaltyAppliedDate: yesterday,
    lastEvaluatedDate: today,
    moodBase:
      state.lastAttendanceDate !== yesterday && state.lastCheerDate !== yesterday
        ? "나쁨"
        : "보통",
    cheerPower: clampCheerPower(state.cheerPower - missedDays * 5),
    speechText: defaultSpeech,
  }, today);
}

export function applyAttendance(
  state: TamagotchiViewState,
  today: string,
  speechText: string,
): TamagotchiViewState {
  if (state.lastAttendanceDate === today) return state;
  return withViewState({
    ...state,
    lastAttendanceDate: today,
    lastEvaluatedDate: today,
    speechText,
  }, today);
}

export function applyCheer(
  state: TamagotchiViewState,
  today: string,
  speechText: string,
): TamagotchiViewState {
  if (state.lastCheerDate === today) {
    return {
      ...state,
      speechText,
    };
  }
  return withViewState({
    ...state,
    lastCheerDate: today,
    lastEvaluatedDate: today,
    cheerPower: clampCheerPower(state.cheerPower + 10),
    speechText,
  }, today);
}

export function syncAttendance(
  state: TamagotchiViewState,
  attendanceDate: string | null,
  today: string,
): TamagotchiViewState {
  if (
    !attendanceDate ||
    state.lastAttendanceDate === attendanceDate ||
    (state.lastAttendanceDate && attendanceDate < state.lastAttendanceDate)
  ) {
    return state;
  }
  return withViewState({
    ...state,
    lastAttendanceDate: attendanceDate,
    lastEvaluatedDate: today,
    moodBase: attendanceDate === addDays(today, -1) ? "보통" : state.moodBase,
  }, today);
}

export function tamagotchiStorageKey(authToken: string): string {
  if (!authToken) return "baseballCoachTamagotchi:guest";
  try {
    const payload = authToken.split(".")[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = JSON.parse(atob(normalized)) as { sub?: string };
    return `baseballCoachTamagotchi:user:${decoded.sub || "unknown"}`;
  } catch {
    return "baseballCoachTamagotchi:session";
  }
}
