import { useEffect, useMemo, useRef, useState } from "react";

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

  // 테스트 패널용 값 (SHOW_TEST_PANEL=true 일 때만 사용)
  const [testLevel, setTestLevel] = useState(1);
  const [testTeam, setTestTeam] = useState(""); // "" = 무소속(default)

  // 레벨업 보상 연출 대기열 (앞에서부터 하나씩 팝업)
  const [rewardQueue, setRewardQueue] = useState<RewardItem[]>([]);

  const progress = useMemo(
    () => Math.min(100, Math.round(((status.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100)),
    [status.xp],
  );

  // 캐릭터 이미지 경로
  //  - 테스트 모드: 패널에서 고른 testLevel/testTeam 사용
  //  - 실제 모드: 진짜 레벨(status.level) + 응원팀(favTeamCode) 사용
  const charLevel = SHOW_TEST_PANEL ? testLevel : status.level;
  const charTeam = SHOW_TEST_PANEL ? testTeam : favTeamCode;
  const characterSrc = useMemo(
    () => getCharacterImage(charLevel, charTeam, gender),
    [charLevel, charTeam, gender],
  );

  // 캐릭터 경로가 바뀌면 "이미지 실패" 깃발을 초기화 (새 이미지 다시 시도)
  useEffect(() => {
    setImgFailed(false);
  }, [characterSrc]);

  // 현재 레벨 기준 보유 아이템(좌측 컬렉션에 표시)
  const ownedItems = useMemo(() => getOwnedItems(charLevel), [charLevel]);

  // 레벨업 감지 → 새로 도달한 보상 레벨이 있으면 연출 대기열에 추가
  const prevLevelRef = useRef<number | null>(null);
  useEffect(() => {
    if (SHOW_TEST_PANEL) {
      // 테스트 모드: 직전 레벨과 비교 → 낮췄다 다시 올리면 연출 재생
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

    // 실제 모드: 한 번 받은 보상은 다시 안 뜸(localStorage로 기억)
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

  const rewardPopup = rewardQueue[0] ?? null; // 지금 보여줄 보상(없으면 null)
  function dismissReward() {
    setRewardQueue((q) => q.slice(1));
  }

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
      {/* 보상 연출용 애니메이션 */}
      <style>{`
        @keyframes rewardPop { 0%{transform:scale(0.4);opacity:0} 60%{transform:scale(1.1);opacity:1} 100%{transform:scale(1)} }
        @keyframes rewardSpin { 0%{transform:rotate(0) scale(1)} 50%{transform:rotate(8deg) scale(1.15)} 100%{transform:rotate(0) scale(1)} }
        @keyframes itemPopIn { 0%{transform:scale(0);opacity:0} 100%{transform:scale(1);opacity:1} }
      `}</style>

      {/* ===== 캐릭터 + 좌측 컬렉션 ===== */}
      <div className="attendance-character" aria-hidden="true" style={{ position: "relative", textAlign: "center", minHeight: 230 }}>
        {/* 좌측 컬렉션(획득한 아이템) */}
        {ownedItems.length > 0 ? (
          <div style={{ position: "absolute", left: 0, top: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {ownedItems.map((item) => (
              <img
                key={item.src}
                src={item.src}
                alt={item.name}
                title={item.name}
                style={{
                  width: 68, height: 68, objectFit: "contain",
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderRadius: 14, padding: 6,
                  animation: "itemPopIn 0.3s ease",
                }}
                onError={(e) => { (e.currentTarget.style.display = "none"); }}
              />
            ))}
          </div>
        ) : null}

        {!imgFailed ? (
          <img
            key={characterSrc}
            src={characterSrc}
            alt="\ub2e4\ub9c8\uace0\uce58 \uce90\ub9ad\ud130"
            style={{ width: 200, height: 200, objectFit: "contain" }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          // 이미지 파일이 아직 없을 때: 기본 캐릭터로 대체 시도
          <img
            src={`/character/default_${gender}.png`}
            alt="\uae30\ubcf8 \uce90\ub9ad\ud130"
            style={{ width: 200, height: 200, objectFit: "contain" }}
            onError={(e) => { (e.currentTarget.style.display = "none"); }}
          />
        )}
      </div>

      {/* ===== 레벨업 보상 획득 연출 ===== */}
      {rewardPopup ? (
        <div
          onClick={dismissReward}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff", borderRadius: 24, padding: "32px 36px",
              textAlign: "center", position: "relative",
              animation: "rewardPop 0.5s cubic-bezier(0.34,1.56,0.64,1)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 4 }}>✨🎉✨</div>
            <img
              src={rewardPopup.src}
              alt={rewardPopup.name}
              style={{ width: 120, height: 120, objectFit: "contain", animation: "rewardSpin 0.8s ease" }}
              onError={(e) => { (e.currentTarget.style.display = "none"); }}
            />
            <h3 style={{ margin: "12px 0 4px", fontSize: 22 }}>{"\ud68d\ub4dd\ud558\uc168\uc5b4\uc694!"}</h3>
            <p style={{ color: "#64748b", margin: 0, fontWeight: 700 }}>{rewardPopup.name}</p>
            <button
              type="button"
              onClick={dismissReward}
              style={{
                marginTop: 18, border: "none", borderRadius: 12,
                padding: "10px 28px", background: "#27ae60", color: "#fff",
                fontWeight: 700, fontSize: 15, cursor: "pointer",
              }}
            >
              {"\ud655\uc778"}
            </button>
          </div>
        </div>
      ) : null}

      {/* 테스트 패널 (SHOW_TEST_PANEL=true 일 때만 표시) */}
      {SHOW_TEST_PANEL ? (
        <div style={testPanelStyle}>
          <strong style={{ fontSize: 12, color: "#c026d3" }}>🧪 테스트 패널 (배포 시 SHOW_TEST_PANEL=false)</strong>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12 }}>레벨</label>
            <input
              type="range" min={1} max={10} value={testLevel}
              onChange={(e) => { setTestLevel(Number(e.target.value)); setImgFailed(false); }}
              style={{ flex: 1, minWidth: 120 }}
            />
            <span style={{ fontWeight: 700, width: 24, textAlign: "center" }}>{testLevel}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <label style={{ fontSize: 12 }}>구단</label>
            <select
              value={testTeam}
              onChange={(e) => { setTestTeam(e.target.value); setImgFailed(false); }}
              style={{ flex: 1, padding: 4 }}
            >
              <option value="">무소속(default)</option>
              <option value="HH">한화 (HH)</option>
              <option value="HT">KIA (HT)</option>
              <option value="KT">KT (KT)</option>
              <option value="LG">LG (LG)</option>
              <option value="LT">롯데 (LT)</option>
              <option value="NC">NC (NC)</option>
              <option value="OB">두산 (OB)</option>
              <option value="SK">SSG (SK)</option>
              <option value="SS">삼성 (SS)</option>
              <option value="WO">키움 (WO)</option>
            </select>
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 8, wordBreak: "break-all" }}>
            단계: {charLevel <= 1 ? "default(1레벨)" : charLevel >= 5 ? "adult(5레벨↑)" : "child(2~4레벨)"}
            {" · "}경로: <code>{characterSrc}</code>
          </div>
        </div>
      ) : null}

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

// 테스트 패널 스타일
const testPanelStyle: React.CSSProperties = {
  margin: "12px 0",
  padding: 12,
  border: "1px dashed #c026d3",
  borderRadius: 12,
  background: "#faf5ff",
};
