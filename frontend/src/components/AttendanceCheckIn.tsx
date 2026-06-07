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
}

const STORAGE_KEY = "baseballCoachAttendance";
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
function loadGender(): Gender {
  const saved = localStorage.getItem(GENDER_STORAGE_KEY);
  return saved === "man" || saved === "girl" ? saved : null;
}

function saveGender(gender: Gender) {
  if (gender) localStorage.setItem(GENDER_STORAGE_KEY, gender);
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

function fallbackStatus(): AttendanceStatus {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Partial<AttendanceStatus>;
      const xp = Number(parsed.xp || 0);
      return {
        level: Math.floor(xp / XP_PER_LEVEL) + 1,
        xp,
        xp_to_next: XP_PER_LEVEL - (xp % XP_PER_LEVEL),
        total_checkins: Number(parsed.total_checkins || 0),
        checked_today: parsed.last_checkin_date === todayKey(),
        last_checkin_date: parsed.last_checkin_date || null,
        gained_xp: 0,
        message: parsed.last_checkin_date === todayKey() ? "오늘 출석 완료!" : "아직 오늘 출석 전이에요.",
      };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return {
    level: 1,
    xp: 0,
    xp_to_next: XP_PER_LEVEL,
    total_checkins: 0,
    checked_today: false,
    last_checkin_date: null,
    gained_xp: 0,
    message: "아직 오늘 출석 전이에요.",
  };
}

function saveFallback(status: AttendanceStatus) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}

function applyLocalCheckIn(current: AttendanceStatus): AttendanceStatus {
  if (current.checked_today) {
    return { ...current, gained_xp: 0, message: "오늘은 이미 출석했어요." };
  }

  const xp = current.xp + CHECKIN_XP;
  const next: AttendanceStatus = {
    ...current,
    xp,
    level: Math.floor(xp / XP_PER_LEVEL) + 1,
    xp_to_next: XP_PER_LEVEL - (xp % XP_PER_LEVEL),
    total_checkins: current.total_checkins + 1,
    checked_today: true,
    last_checkin_date: todayKey(),
    gained_xp: CHECKIN_XP,
    message: "출석 완료! 경험치가 올랐어요.",
  };
  saveFallback(next);
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

export default function AttendanceCheckIn({
  authToken,
  onCheckedTodayChange,
  onRequestClose,
  onNavigate,
  favTeamCode,
  nickname: initialNickname,
}: AttendanceCheckInProps) {
  const [status, setStatus] = useState<AttendanceStatus>(() => fallbackStatus());
  const [gender, setGender] = useState<Gender>(() => loadGender());
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

  // 레벨업 보상 연출 대기열 (앞에서부터 하나씩 팝업)
  const [rewardQueue, setRewardQueue] = useState<RewardItem[]>([]);

  const progress = useMemo(
    () => Math.min(100, Math.round(((status.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)),
    [status.xp],
  );

  const displayLevel = status.level || 3;
  const displayProgress = progress || 60;

  const charLevel = SHOW_TEST_PANEL ? testLevel : status.level;
  const charTeam = SHOW_TEST_PANEL ? testTeam : favTeamCode;
  const characterSrc = useMemo(
    () => getCharacterImage(charLevel, charTeam, gender),
    [charLevel, charTeam, gender],
  );

  useEffect(() => {
    setImgFailed(false);
  }, [characterSrc]);

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

    const seen = Number(localStorage.getItem(LEVEL_SEEN_KEY) || "1");
    if (charLevel > seen) {
      const newly: RewardItem[] = [];
      for (let L = seen + 1; L <= charLevel; L++) {
        if (LEVEL_REWARDS[L]) newly.push(LEVEL_REWARDS[L]);
      }
      if (newly.length) setRewardQueue((q) => [...q, ...newly]);
      localStorage.setItem(LEVEL_SEEN_KEY, String(charLevel));
    }
  }, [charLevel]);

  const rewardPopup = rewardQueue[0] ?? null;
  function dismissReward() {
    setRewardQueue((q) => q.slice(1));
  }

  function handlePickGender(picked: Gender) {
    saveGender(picked);
    setGender(picked);
    setImgFailed(false);
  }

  const authHeaders = (extra?: Record<string, string>) =>
    authToken ? { Authorization: `Bearer ${authToken}`, ...extra } : { ...extra };

  function updateDailyState(
    updater: (current: TamagotchiViewState) => TamagotchiViewState,
  ) {
    setDailyState((current) => {
      const next = updater(current);
      saveDailyState(stateStorageKey, next);
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

  useEffect(() => {
    let ignore = false;

    async function loadStatus() {
      try {
        const response = await fetch(apiUrl("/attendance/status"), { headers: authHeaders() });
        if (!response.ok) return;
        const data = (await response.json()) as AttendanceStatus;
        if (!ignore) {
          setStatus(data);
          saveFallback(data);
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
      saveFallback(data);
      const speech = randomSpeech(ATTENDANCE_SPEECHES, nickname);
      updateDailyState((current) => applyAttendance(current, todayKey(), speech));
      setNotice(speech);
    } catch {
      const next = applyLocalCheckIn(status);
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
          saveFallback(next);
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
    setNotice("꾸미기는 준비 중이에요.");
  }

  const currentQuestion = quizQuestions[currentQuizIdx] ?? null;
  const currentResult = currentQuestion ? quizResults[String(currentQuestion.quiz_id)] : null;
  const answeredCount = Object.keys(quizResults).length;
  const allDone = quizQuestions.length > 0 && answeredCount >= quizQuestions.length;
  const totalQuizXp = Object.values(quizResults).reduce((sum, result) => sum + result.xp_earned, 0);

  // ===== 성별을 아직 안 골랐으면: 성별 선택 화면 =====
  if (!gender) {
    return (
      <section className="attendance-panel" aria-label="\uce90\ub9ad\ud130 \uc131\ubcc4 \uc120\ud0dd">
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <p className="eyebrow">Start</p>
          <h2 style={{ margin: "4px 0 4px" }}>{"\uce90\ub9ad\ud130\ub97c \uc120\ud0dd\ud558\uc138\uc694"}</h2>
          <p className="attendance-message" style={{ marginBottom: 16 }}>
            {"\ud568\uaed8 \uc131\uc7a5\ud560 \ub098\ub9cc\uc758 \uc57c\uad6c \uc120\uc218\ub97c \uace8\ub77c\uc8fc\uc138\uc694."}
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handlePickGender("man")}
              style={genderCardStyle}
            >
              <img
                src="/character/default_man.png"
                alt="\ub0a8\uc790 \uce90\ub9ad\ud130"
                style={{ width: 96, height: 96, objectFit: "contain" }}
                onError={(e) => { (e.currentTarget.style.display = "none"); }}
              />
              <span style={{ marginTop: 8, fontWeight: 700 }}>{"\ub0a8\uc790"}</span>
            </button>
            <button
              type="button"
              onClick={() => handlePickGender("girl")}
              style={genderCardStyle}
            >
              <img
                src="/character/default_girl.png"
                alt="\uc5ec\uc790 \uce90\ub9ad\ud130"
                style={{ width: 96, height: 96, objectFit: "contain" }}
                onError={(e) => { (e.currentTarget.style.display = "none"); }}
              />
              <span style={{ marginTop: 8, fontWeight: 700 }}>{"\uc5ec\uc790"}</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="tamagotchi-dashboard" aria-label="다마고치">
      <TopMenu
        active="tamagotchi"
        className="tamagotchi-nav"
        onNavigate={(target) => onNavigate?.(target)}
      />

      <section className="tamagotchi-status-card" aria-label="캐릭터 상태">
        <div className="tamagotchi-status-top">
          <h2>
            <span>Lv.{displayLevel}</span>
            김동아
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
          alt="야구 다마고치 캐릭터"
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
        <b>3일째</b>
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
