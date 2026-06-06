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

// 'man' = 남자, 'girl' = 여자. 아직 안 고르면 null.
type Gender = "man" | "girl" | null;

interface AttendanceCheckInProps {
  authToken: string;
  onCheckedTodayChange?: (checkedToday: boolean) => void;
  // 사용자가 응원하는 팀 코드(SS, LG ...). 없으면 무소속(default).
  // 지금은 안 넘겨도 동작하며, 나중에 팀 선택 기능에서 넘겨주면 됩니다.
  favTeamCode?: string | null;
}

const STORAGE_KEY = "baseballCoachAttendance";
const GENDER_STORAGE_KEY = "baseballCoachGender"; // 성별 임시 저장(브라우저)
const CHECKIN_XP = 20;
const XP_PER_LEVEL = 100;

// =====================================================================
// 캐릭터 이미지 경로 만들기
//  규칙: /character/{팀}_{단계}_{성별}.png
//   - 1레벨(무소속): default_{성별}.png   ← 예외(팀·단계 없음)
//   - 2~9레벨: {팀}_child_{성별}.png  (팀 없으면 default_child_{성별}.png)
//   - 10레벨↑: {팀}_adult_{성별}.png  (팀 없으면 default_adult_{성별}.png)
//  ※ 파일이 아직 없으면 <img onError>에서 default로 대체합니다.
// =====================================================================
function getCharacterImage(level: number, teamCode: string | null | undefined, gender: Gender): string {
  const g = gender === "girl" ? "girl" : "man";
  if (level <= 1) {
    return `/character/default_${g}.png`; // 1레벨 예외 처리
  }
  const stage = level >= 10 ? "adult" : "child";
  const team = teamCode && teamCode.trim() !== "" ? teamCode.trim() : "default";
  return `/character/${team}_${stage}_${g}.png`;
}

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

export default function AttendanceCheckIn({ authToken, onCheckedTodayChange, favTeamCode }: AttendanceCheckInProps) {
  const [status, setStatus] = useState<AttendanceStatus>(() => fallbackStatus());
  const [gender, setGender] = useState<Gender>(() => loadGender());
  const [imgFailed, setImgFailed] = useState(false);
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

  // 지금 보여줄 캐릭터 이미지 경로 (레벨+팀+성별 조합)
  const characterSrc = useMemo(
    () => getCharacterImage(status.level, favTeamCode, gender),
    [status.level, favTeamCode, gender],
  );

  // 성별을 고르면 저장하고 상태에 반영
  function handlePickGender(picked: Gender) {
    saveGender(picked); // ★ 나중에 서버 저장으로 바뀌는 부분(함수 내부만)
    setGender(picked);
    setImgFailed(false);
  }

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
    <section className="attendance-panel" aria-label="\ucd9c\uc11d \uccb4\ud06c">
      {/* ===== 캐릭터(레벨+팀+성별에 따라 이미지) ===== */}
      <div className="attendance-character" aria-hidden="true" style={{ textAlign: "center" }}>
        {!imgFailed ? (
          <img
            src={characterSrc}
            alt="\ub2e4\ub9c8\uace0\uce58 \uce90\ub9ad\ud130"
            style={{ width: 140, height: 140, objectFit: "contain" }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          // 이미지 파일이 아직 없을 때: 기본 캐릭터로 대체 시도
          <img
            src={`/character/default_${gender}.png`}
            alt="\uae30\ubcf8 \uce90\ub9ad\ud130"
            style={{ width: 140, height: 140, objectFit: "contain" }}
            onError={(e) => { (e.currentTarget.style.display = "none"); }}
          />
        )}
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
