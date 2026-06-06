import { useEffect, useMemo, useState } from "react";
import { apiUrl } from "../api";
import { getRecords, saveRecord, deleteRecordByDate } from "../db";
import "./MyRecordsView.css";

interface MyRecordsViewProps {
  authToken: string;
  onBack: () => void;
}

interface RecordRow {
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
}

const TEAMS = [
  { code: "OB", name: "두산 베어스", short: "두산", color: "#131230" },
  { code: "LT", name: "롯데 자이언츠", short: "롯데", color: "#041E42" },
  { code: "SS", name: "삼성 라이온즈", short: "삼성", color: "#074CA1" },
  { code: "SK", name: "SSG 랜더스", short: "SSG", color: "#CE0E2D" },
  { code: "LG", name: "LG 트윈스", short: "LG", color: "#C30452" },
  { code: "NC", name: "NC 다이노스", short: "NC", color: "#315288" },
  { code: "WO", name: "키움 히어로즈", short: "키움", color: "#570514" },
  { code: "KT", name: "KT 위즈", short: "KT", color: "#333333" },
  { code: "HT", name: "KIA 타이거즈", short: "KIA", color: "#EA0029" },
  { code: "HH", name: "한화 이글스", short: "한화", color: "#FC4E00" },
];

const MOODS = [
  { key: "win_happy", label: "승리", emoji: "😆", color: "#22c55e" },
  { key: "draw_calm", label: "무승부", emoji: "😐", color: "#9ca3af" },
  { key: "loss_sad", label: "패배", emoji: "😢", color: "#60a5fa" },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const GOAL_KEY = "myRecordGoalDays";
const MYTEAM_KEY = "myTeamCode";

const teamByCode = (code: string | null) => TEAMS.find((t) => t.code === code);
const teamByShort = (short: string) => TEAMS.find((t) => t.short === short);
const moodByKey = (key: string | null) => MOODS.find((m) => m.key === key);

function fmt(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calcStreak(dateSet: Set<string>): number {
  let streak = 0;
  const d = new Date();
  if (!dateSet.has(fmt(d))) d.setDate(d.getDate() - 1);
  while (dateSet.has(fmt(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function MyRecordsView({ authToken, onBack }: MyRecordsViewProps) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [myTeam, setMyTeam] = useState<string | null>(() => localStorage.getItem(MYTEAM_KEY));
  const [monthGames, setMonthGames] = useState<Record<string, unknown>[]>([]);
  const [goalDays, setGoalDays] = useState<number>(() => Number(localStorage.getItem(GOAL_KEY)) || 3);
  const [editingGoal, setEditingGoal] = useState(false);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [closing, setClosing] = useState(false); // 뒤로가기 슬라이드 아웃용

  async function reload() {
    setRecords((await getRecords()) as RecordRow[]);
  }
  useEffect(() => {
    reload();
  }, []);

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
      });
    }
    return map;
  }, [monthGames, myShort]);

  const recordsByDate = useMemo(() => {
    const map = new Map<string, RecordRow>();
    for (const r of records) map.set(r.record_date, r);
    return map;
  }, [records]);

  const streak = useMemo(() => calcStreak(new Set(records.map((r) => r.record_date))), [records]);
  const progress = Math.min(100, Math.round((streak / Math.max(1, goalDays)) * 100));
  const remain = Math.max(0, goalDays - streak);

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
    setGoalDays(v);
    localStorage.setItem(GOAL_KEY, String(v));
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

  return (
    <section
      className={`records-view ${closing ? "closing" : ""}`}
      aria-label="나만의 야구기록"
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onBack();
      }}
    >
      <header className="records-top">
        <button className="records-back" type="button" onClick={handleBack} aria-label="뒤로">
          ←
        </button>
        <h1>나만의 야구기록</h1>
        <span className="records-top-spacer" />
      </header>

      <div className="streak-card">
        <div className="streak-card-head">
          <div>
            <p className="streak-eyebrow">연속 기록 도전</p>
            <h2>{streak}일째 도전 중!</h2>
          </div>
          <div className="streak-flame" aria-hidden="true">
            🔥
          </div>
        </div>
        <div className="streak-goalrow">
          <span>목표 일수 {goalDays}일</span>
          <span>{remain === 0 ? "목표 달성!" : `${remain}일 남음`}</span>
        </div>
        <div className="streak-bar">
          <div className="streak-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="streak-actions">
          {editingGoal ? (
            <GoalEditor initial={goalDays} onSave={saveGoal} onCancel={() => setEditingGoal(false)} />
          ) : (
            <button className="streak-goalbtn" type="button" onClick={() => setEditingGoal(true)}>
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
            const dateStr = fmt(new Date(viewYear, viewMonth, day));
            const rec = recordsByDate.get(dateStr);
            const game = scheduleByDate.get(dateStr);
            const isToday = dateStr === fmt(today);
            const mood = moodByKey(rec?.mood ?? null);
            const opp = game ? teamByCode(game.oppCode) : undefined;
            return (
              <button
                key={dateStr}
                type="button"
                className={`cal-cell ${rec ? "has-record" : ""} ${game ? "has-game" : ""} ${
                  isToday ? "today" : ""
                }`}
                onClick={() => setModalDate(dateStr)}
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

      {modalDate ? (
        <RecordModal
          date={modalDate}
          myTeam={myTeamObj ?? null}
          game={scheduleByDate.get(modalDate) ?? null}
          existing={recordsByDate.get(modalDate) ?? null}
          onClose={() => setModalDate(null)}
          onSaved={async () => {
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
  onClose,
  onSaved,
}: {
  date: string;
  myTeam: { code: string; name: string; short: string; color: string } | null;
  game: ScheduleGame | null;
  existing: RecordRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [stadium, setStadium] = useState(existing?.stadium ?? "");
  const [mood, setMood] = useState<string | null>(existing?.mood ?? null);
  const [memo, setMemo] = useState(existing?.memo ?? "");
  const [saving, setSaving] = useState(false);

  const [, m, d] = date.split("-");
  // 상대팀: 예정표 우선, (예정표 없고 기존 기록만 있으면) 기록의 상대팀
  const oppCode = game?.oppCode ?? existing?.team_code ?? null;
  const opp = teamByCode(oppCode);
  const hasGame = Boolean(game || existing);

  async function handleSave() {
    if (!oppCode) return;
    setSaving(true);
    try {
      await deleteRecordByDate(date);
      await saveRecord({
        record_date: date,
        team_code: oppCode,
        stadium: stadium.trim() || undefined,
        mood: mood ?? undefined,
        memo: memo.trim() || undefined,
        game_id: game?.gameId ?? (myTeam ? `${myTeam.code} vs ${oppCode}` : oppCode),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteRecordByDate(date);
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
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

        {!hasGame ? (
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
              <button type="button" className="rec-save" onClick={handleSave} disabled={saving}>
                {saving ? "저장 중" : "직관 기록 저장"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default MyRecordsView;
