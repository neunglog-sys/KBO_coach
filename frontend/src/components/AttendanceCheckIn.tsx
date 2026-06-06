import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CalendarCheck,
  Megaphone,
  Shirt,
  Smile,
  Volume2,
} from "lucide-react";
import { apiUrl } from "../api";
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

interface AttendanceCheckInProps {
  authToken: string;
  onCheckedTodayChange?: (checkedToday: boolean) => void;
  onRequestClose?: () => void;
  onNavigate?: (target: TopMenuTarget) => void;
}

const STORAGE_KEY = "baseballCoachAttendance";
const CHECKIN_XP = 20;
const XP_PER_LEVEL = 100;
const CHILD_CHARACTER_SRC = "/img/tamagotchi-child.png?v=transparent-fixed";
const ADULT_CHARACTER_SRC = "/img/tamagotchi-adult.png?v=transparent-fixed-gap";
const FALLBACK_CHARACTER_SRC = "/img/character.png";

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
  return new Date().toISOString().slice(0, 10);
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

export default function AttendanceCheckIn({
  authToken,
  onCheckedTodayChange,
  onRequestClose,
  onNavigate,
}: AttendanceCheckInProps) {
  const [status, setStatus] = useState<AttendanceStatus>(() => fallbackStatus());
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>({});
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [showingResult, setShowingResult] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizLoadError, setQuizLoadError] = useState("");
  const [showQuiz, setShowQuiz] = useState(false);
  const [characterSrc, setCharacterSrc] = useState(() =>
    fallbackStatus().level >= 10 ? ADULT_CHARACTER_SRC : CHILD_CHARACTER_SRC,
  );

  const progress = useMemo(
    () => Math.min(100, Math.round(((status.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)),
    [status.xp],
  );

  const displayLevel = status.level || 3;
  const displayProgress = progress || 60;
  const cheerPower = Math.min(99, 78 + Math.max(0, displayLevel - 3));

  const authHeaders = (extra?: Record<string, string>) =>
    authToken ? { Authorization: `Bearer ${authToken}`, ...extra } : { ...extra };

  useEffect(() => {
    onCheckedTodayChange?.(status.checked_today);
  }, [onCheckedTodayChange, status.checked_today]);

  useEffect(() => {
    setCharacterSrc(status.level >= 10 ? ADULT_CHARACTER_SRC : CHILD_CHARACTER_SRC);
  }, [status.level]);

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
    if (status.checked_today || isLoading) return;

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
      setNotice(data.message);
    } catch {
      const next = applyLocalCheckIn(status);
      setStatus(next);
      setNotice("백엔드 연결 전이라 브라우저에 임시 저장했어요.");
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
    setNotice("고마워! 힘이 난다!");
  }

  function handleDecorate() {
    setNotice("꾸미기는 준비 중이에요.");
  }

  const currentQuestion = quizQuestions[currentQuizIdx] ?? null;
  const currentResult = currentQuestion ? quizResults[String(currentQuestion.quiz_id)] : null;
  const answeredCount = Object.keys(quizResults).length;
  const allDone = quizQuestions.length > 0 && answeredCount >= quizQuestions.length;
  const totalQuizXp = Object.values(quizResults).reduce((sum, result) => sum + result.xp_earned, 0);

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
            오늘의 상태: <strong>좋음</strong>
          </p>
          <p>
            <Volume2 aria-hidden="true" />
            응원력 <strong>{cheerPower}</strong>
          </p>
        </div>
      </section>

      <section className="tamagotchi-field-card" aria-label="캐릭터 영역">
        <div className="tamagotchi-speech-bubble">
          안녕 김동아!<br />
          오늘도 왔구나!
        </div>
        <img
          className="tamagotchi-character-img"
          src={characterSrc}
          alt="야구 다마고치 캐릭터"
          onError={() => setCharacterSrc(FALLBACK_CHARACTER_SRC)}
        />
      </section>

      <div className="tamagotchi-actions">
        <button
          className="tamagotchi-action is-check"
          type="button"
          disabled={status.checked_today || isLoading}
          onClick={handleCheckIn}
        >
          <span><CalendarCheck /></span>
          <strong>{status.checked_today ? "출석완료" : "출석체크"}</strong>
        </button>
        <button className="tamagotchi-action is-dress" type="button" onClick={handleDecorate}>
          <span><Shirt /></span>
          <strong>꾸미기</strong>
        </button>
        <button className="tamagotchi-action is-cheer" type="button" onClick={handleCheer}>
          <span><Megaphone /></span>
          <strong>응원하기</strong>
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
