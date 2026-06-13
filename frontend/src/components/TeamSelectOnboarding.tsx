import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../api";
import { LatudiCharacter } from "./LatudiCharacter";

/**
 * 회원가입 후 최초 로그인 시 1회 표시되는 응원구단 선택 창.
 * - 표시 조건: 로그인 상태 + 토큰 있음 + favTeamCode 없음 (App.tsx에서 판정)
 * - 팀 버튼을 누르면 아래 라투디가 그 팀 장비로 변신 (미리보기)
 * - "시작하기" → PATCH /auth/me 로 서버 저장 (SettingsView와 동일 API) → onComplete
 * - 라투디는 누르고 있는 동안 그 지점을 쳐다보고, 떼면 정면 복귀
 */

interface TeamSelectOnboardingProps {
  authToken: string;
  onComplete: (favTeamCode: string) => void;
}

// 팀코드(DB) ↔ 표시명 ↔ 라투디 표정(exp3) ↔ 팀 컬러
const TEAMS: ReadonlyArray<{
  code: string;
  name: string;
  expression: string;
  color: string;
}> = [
  { code: "HH", name: "한화 이글스", expression: "hanwha", color: "#FA5C1E" },
  { code: "HT", name: "KIA 타이거즈", expression: "kia", color: "#C8102E" },
  { code: "KT", name: "KT 위즈", expression: "kt", color: "#2B2B2B" },
  { code: "LG", name: "LG 트윈스", expression: "lg", color: "#C30452" },
  { code: "LT", name: "롯데 자이언츠", expression: "lotte", color: "#041E42" },
  { code: "NC", name: "NC 다이노스", expression: "nc", color: "#315288" },
  { code: "OB", name: "두산 베어스", expression: "doosan", color: "#131230" },
  { code: "SK", name: "SSG 랜더스", expression: "ssg", color: "#CE0E2D" },
  { code: "SS", name: "삼성 라이온즈", expression: "samsung", color: "#074CA1" },
  { code: "WO", name: "키움 히어로즈", expression: "kiwoom", color: "#7B0F1F" },
];

export function TeamSelectOnboarding({ authToken, onComplete }: TeamSelectOnboardingProps) {
  const [selectedCode, setSelectedCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false); // 저장 완료 표시 (개발 모드에서 창이 유지될 때 확인용)
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const selectedTeam = TEAMS.find((t) => t.code === selectedCode) ?? null;

  async function handleStart() {
    if (!selectedCode || isSaving) return;
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(apiUrl("/auth/me"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ fav_team_code: selectedCode }),
      });
      if (!res.ok) throw new Error("update failed");
      onComplete(selectedCode); // App.tsx의 favTeamCode가 채워짐 (실제 모드에선 이 창이 즉시 닫힘)
      // 개발 모드(FORCE)에선 창이 유지되므로: "저장되었어요" 표시 후 버튼 초기화
      setSaved(true);
      window.setTimeout(() => {
        if (!mountedRef.current) return; // 창이 이미 닫혔으면 무시
        setSaved(false);
        setIsSaving(false);
      }, 1200);
    } catch {
      setError("저장에 실패했어요. 잠시 후 다시 시도해주세요.");
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-label="응원구단 선택"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400, // attendance-window(300)보다 위
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflowY: "auto",
        padding: "calc(max(env(safe-area-inset-top, 0px), var(--sat, 0px)) + 24px) 16px 24px",
        background: "linear-gradient(180deg, #eef6ff 0%, #f7fbff 60%, #ffffff 100%)",
        fontFamily:
          '"Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif',
      }}
    >
      <h1 style={{ margin: "4px 0 6px", fontSize: "1.35rem", fontWeight: 900, color: "#101a36" }}>
        응원할 구단을 선택해주세요
      </h1>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: "#5b6b8c", textAlign: "center" }}>
        선택한 구단은 채팅방·기록·구장정보에 함께 적용돼요.
      </p>

      {/* ── 10개 구단 그리드 (2열 × 5줄) ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          width: "100%",
          maxWidth: 420,
        }}
      >
        {TEAMS.map((team) => {
          const isActive = team.code === selectedCode;
          return (
            <button
              key={team.code}
              type="button"
              onClick={() => setSelectedCode(team.code)}
              aria-pressed={isActive}
              style={{
                padding: "14px 10px",
                borderRadius: 14,
                border: isActive ? `2px solid ${team.color}` : "2px solid #dbe4f5",
                background: isActive ? team.color : "rgba(255,255,255,0.9)",
                color: isActive ? "#fff" : "#22325c",
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s, border-color 0.15s",
              }}
            >
              {team.name}
            </button>
          );
        })}
      </div>

      {/* ── 라투디: 터치하면 쳐다보고, 팀 고르면 그 팀 장비로 변신 ── */}
      <div style={{ marginTop: 8 }}>
        <LatudiCharacter expression={selectedTeam?.expression ?? null} width={260} height={260} />
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12, color: "#8593b3" }}>
        캐릭터를 꾹 눌러보세요! 누른 곳을 쳐다봐요 👀
      </p>

      {error ? (
        <p role="alert" style={{ margin: "0 0 10px", fontSize: 13, color: "#d6403a", fontWeight: 700 }}>
          {error}
        </p>
      ) : null}

      <button
        type="button"
        data-latudi-ignore // 이 버튼을 누를 땐 라투디가 내려다보지 않음
        onClick={handleStart}
        disabled={!selectedCode || isSaving}
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "15px 0",
          borderRadius: 14,
          border: "none",
          background: saved ? "#1aa05c" : selectedCode ? "#126dff" : "#c2cde4",
          color: "#fff",
          fontSize: 16,
          fontWeight: 900,
          cursor: selectedCode && !isSaving ? "pointer" : "not-allowed",
          transition: "background 0.15s",
        }}
      >
        {saved ? "저장되었어요 ✓" : isSaving ? "저장 중..." : selectedTeam ? `${selectedTeam.name}로 시작하기` : "구단을 선택해주세요"}
      </button>
    </section>
  );
}
