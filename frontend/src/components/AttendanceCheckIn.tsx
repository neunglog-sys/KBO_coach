import { useEffect, useMemo, useState } from "react";

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
}

const STORAGE_KEY = "baseballCoachAttendance";
const CHECKIN_XP = 20;
const XP_PER_LEVEL = 100;

function getDifficultyColor(difficulty?: string) {
  switch (difficulty) {
    case "\ucd08\ubcf4":
      return "#2980b9";
    case "\uc911\uae09":
      return "#e67e22";
    case "\uace0\uae09":
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
        message: parsed.last_checkin_date === todayKey() ? "\uc624\ub298 \ucd9c\uc11d \uc644\ub8cc!" : "\uc544\uc9c1 \uc624\ub298 \ucd9c\uc11d \uc804\uc774\uc5d0\uc694.",
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
    message: "\uc544\uc9c1 \uc624\ub298 \ucd9c\uc11d \uc804\uc774\uc5d0\uc694.",
  };
}

function saveFallback(status: AttendanceStatus) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
}

function applyLocalCheckIn(current: AttendanceStatus): AttendanceStatus {
  if (current.checked_today) {
    return { ...current, gained_xp: 0, message: "\uc624\ub298\uc740 \uc774\ubbf8 \ucd9c\uc11d\ud588\uc5b4\uc694." };
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
    message: "\ucd9c\uc11d \uc644\ub8cc! \uacbd\ud5d8\uce58\uac00 \uc62c\ub790\uc5b4\uc694.",
  };
  saveFallback(next);
  return next;
}

export default function AttendanceCheckIn({ authToken, onCheckedTodayChange }: AttendanceCheckInProps) {
  const [status, setStatus] = useState<AttendanceStatus>(() => fallbackStatus());
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>({});
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [showingResult, setShowingResult] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  const progress = useMemo(
    () => Math.min(100, Math.round(((status.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)),
    [status.xp],
  );

  const authHeaders = (extra?: Record<string, string>) =>
    authToken ? { Authorization: `Bearer ${authToken}`, ...extra } : { ...extra };

  useEffect(() => {
    onCheckedTodayChange?.(status.checked_today);
  }, [onCheckedTodayChange, status.checked_today]);

  useEffect(() => {
    let ignore = false;

    async function loadStatus() {
      try {
        const response = await fetch("/attendance/status", { headers: authHeaders() });
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
        const response = await fetch("/quiz/daily", { headers: authHeaders() });
        if (!response.ok) return;
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
        }
      } catch {
        // Quiz is optional while the backend or seed data is not ready.
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
      const response = await fetch("/attendance/check-in", {
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
      setNotice("\ubc31\uc5d4\ub4dc \uc5f0\uacb0 \uc804\uc774\ub77c \ube0c\ub77c\uc6b0\uc800\uc5d0 \uc784\uc2dc \uc800\uc7a5\ud588\uc5b4\uc694.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleQuizAnswer(answer: boolean) {
    const question = quizQuestions[currentQuizIdx];
    if (!question || quizLoading) return;

    setQuizLoading(true);
    try {
      const response = await fetch("/quiz/answer", {
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

  const currentQuestion = quizQuestions[currentQuizIdx] ?? null;
  const currentResult = currentQuestion ? quizResults[String(currentQuestion.quiz_id)] : null;
  const answeredCount = Object.keys(quizResults).length;
  const allDone = quizQuestions.length > 0 && answeredCount >= quizQuestions.length;
  const totalQuizXp = Object.values(quizResults).reduce((sum, result) => sum + result.xp_earned, 0);

  return (
    <section className="attendance-panel" aria-label="\ucd9c\uc11d \uccb4\ud06c">
      <div className="attendance-mascot" aria-hidden="true">
        <div className="attendance-ear left" />
        <div className="attendance-ear right" />
        <div className="attendance-body">
          <span className="attendance-eye left" />
          <span className="attendance-eye right" />
          <span className="attendance-mouth" />
          <span className="attendance-cheek left" />
          <span className="attendance-cheek right" />
          <span className="attendance-hand" />
        </div>
      </div>

      <div className="attendance-copy">
        <p className="eyebrow">Daily Check-in</p>
        <h2>{"\uc624\ub298 \ucd9c\uc11d\ud558\uae30"}</h2>
        <p className="attendance-message">{notice || status.message}</p>
      </div>

      <div className="attendance-stats" aria-label="\ucd9c\uc11d \uc0c1\ud0dc">
        <div>
          <span>{"\ub808\ubca8"}</span>
          <strong>{status.level}</strong>
        </div>
        <div>
          <span>{"\uacbd\ud5d8\uce58"}</span>
          <strong>{status.xp} XP</strong>
        </div>
        <div>
          <span>{"\ub204\uc801 \ucd9c\uc11d"}</span>
          <strong>{status.total_checkins}{"\uc77c"}</strong>
        </div>
      </div>

      <div className="attendance-progress" aria-label={`\ub2e4\uc74c \ub808\ubca8\uae4c\uc9c0 ${status.xp_to_next} \uacbd\ud5d8\uce58`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      {quizQuestions.length > 0 ? (
        <div className="quiz-section">
          <div className="quiz-header">
            <span>{"OX \ud034\uc988"}</span>
            <span className="quiz-count">
              {answeredCount} / {quizQuestions.length}{"\ubb38\uc81c \uc644\ub8cc"}
            </span>
          </div>

          {allDone ? (
            <div className="quiz-done-message">
              <p>{"\uc624\ub298 \ud034\uc988 \uc644\ub8cc!"}</p>
              {totalQuizXp > 0 ? (
                <p className="quiz-total-xp">
                  {"\ud034\uc988 \ud68d\ub4dd XP: "}<strong>+{totalQuizXp} XP</strong>
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
                      {currentResult.is_correct ? "\uc815\ub2f5!" : "\uc624\ub2f5"}
                    </span>
                    {currentResult.xp_earned > 0 ? (
                      <span className="quiz-xp-badge">+{currentResult.xp_earned} XP</span>
                    ) : null}
                  </div>
                  <p className="quiz-explanation">{currentResult.explanation}</p>
                  {currentQuizIdx + 1 < quizQuestions.length ? (
                    <button className="quiz-next-btn" type="button" onClick={handleNextQuiz}>
                      {"\ub2e4\uc74c \ubb38\uc81c"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <button
        className="attendance-check-button"
        type="button"
        disabled={status.checked_today || isLoading}
        onClick={handleCheckIn}
      >
        {status.checked_today ? "\ucd9c\uc11d \uc644\ub8cc" : isLoading ? "\ucc98\ub9ac \uc911" : `\ucd9c\uc11d\ud558\uace0 +${CHECKIN_XP} XP`}
      </button>
    </section>
  );
}
