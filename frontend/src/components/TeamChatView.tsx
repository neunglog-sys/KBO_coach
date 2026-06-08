import { useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "../api";
import { TopMenu, type TopMenuTarget } from "./TopMenu";
import "./TeamChatView.css";

interface TeamChatViewProps {
  authToken: string;
  onBack: () => void;
  onNavigate?: (target: TopMenuTarget) => void;
}

interface BoardMessage {
  message_id: number;
  nickname: string;
  content: string;
  created_at: string;
  is_mine?: boolean;
}

const TEAMS = [
  { code: "OB", name: "두산 베어스", color: "#131230" },
  { code: "LT", name: "롯데 자이언츠", color: "#041E42" },
  { code: "SS", name: "삼성 라이온즈", color: "#074CA1" },
  { code: "SK", name: "SSG 랜더스", color: "#CE0E2D" },
  { code: "LG", name: "LG 트윈스", color: "#C30452" },
  { code: "NC", name: "NC 다이노스", color: "#315288" },
  { code: "WO", name: "키움 히어로즈", color: "#7B0F1F" },
  { code: "KT", name: "KT 위즈", color: "#2B2B2B" },
  { code: "HT", name: "KIA 타이거즈", color: "#C8102E" },
  { code: "HH", name: "한화 이글스", color: "#FA5C1E" },
];
const MYTEAM_KEY = "myTeamCode";
const teamByCode = (c: string | null) => TEAMS.find((t) => t.code === c);

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** 팀+오늘 날짜 기반 일관된 방문수(프론트 표시용; 진짜 집계는 추후 백엔드). */
function visitCount(code: string): number {
  const seed = code + new Date().toISOString().slice(0, 10);
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 8000 + (Math.abs(h) % 32000);
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function dateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${days[d.getDay()]}`;
}

export function TeamChatView({ authToken, onBack, onNavigate }: TeamChatViewProps) {
  const [team, setTeam] = useState<string | null>(() => localStorage.getItem(MYTEAM_KEY));
  const [messages, setMessages] = useState<BoardMessage[]>([]);
  const [notice, setNotice] = useState("");
  const [input, setInput] = useState("");
  const [closing, setClosing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [switchOpen, setSwitchOpen] = useState(false);

  const logRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef(0);
  const msgRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const teamObj = teamByCode(team);

  // 응원팀 자동 (로그인 계정 fav_team)
  useEffect(() => {
    if (!authToken) return;
    (async () => {
      try {
        const r = await fetch(apiUrl("/auth/me"), { headers: { Authorization: `Bearer ${authToken}` } });
        if (!r.ok) return;
        const d = await r.json();
        const code = d.fav_team_code || d.user?.fav_team_code;
        if (code) {
          setTeam(code);
          localStorage.setItem(MYTEAM_KEY, code);
        }
      } catch {
        /* 무시 */
      }
    })();
  }, [authToken]);

  // 방 정보(공지) + 메시지 폴링
  useEffect(() => {
    if (!team) return;
    let alive = true;
    lastIdRef.current = 0;
    setMessages([]);
    setNotice("");

    fetch(apiUrl(`/board/${team}`))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && d && setNotice(d.notice || ""))
      .catch(() => undefined);

    async function poll(initial: boolean) {
      if (!authToken) return;
      try {
        const url = initial
          ? `/board/${team}/messages`
          : `/board/${team}/messages?after=${lastIdRef.current}`;
        const r = await fetch(apiUrl(url), { headers: { Authorization: `Bearer ${authToken}` } });
        if (!r.ok || !alive) return;
        const d = await r.json();
        const fresh: BoardMessage[] = Array.isArray(d.messages) ? d.messages : [];
        if (fresh.length) {
          lastIdRef.current = fresh[fresh.length - 1].message_id;
          setMessages((prev) => (initial ? fresh : [...prev, ...fresh]));
        }
      } catch {
        /* 무시 */
      }
    }
    poll(true);
    const timer = setInterval(() => poll(false), 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [team, authToken]);

  // 새 메시지 → 부드럽게 맨 아래로 (검색 중엔 유지)
  useEffect(() => {
    if (query) return;
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, query]);

  // 검색: 입력한 텍스트가 있는 마지막 메시지로 스크롤
  const matchIds = useMemo(() => {
    if (!query.trim()) return new Set<number>();
    const q = query.trim().toLowerCase();
    return new Set(messages.filter((m) => m.content.toLowerCase().includes(q)).map((m) => m.message_id));
  }, [query, messages]);

  useEffect(() => {
    if (!query.trim() || matchIds.size === 0) return;
    const ids = [...matchIds];
    const target = msgRefs.current.get(ids[ids.length - 1]);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [matchIds, query]);

  async function send() {
    const text = input.trim();
    if (!text || !authToken || !team) return;
    setInput("");
    try {
      const r = await fetch(apiUrl(`/board/${team}/messages`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ content: text }),
      });
      if (r.ok) {
        const msg: BoardMessage = await r.json();
        lastIdRef.current = Math.max(lastIdRef.current, msg.message_id);
        setMessages((prev) => [...prev, { ...msg, is_mine: true }]);
      }
    } catch {
      /* 무시 */
    }
  }

  function handleBack() {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) onBack();
    else setClosing(true);
  }

  function handleTopMenuNavigate(target: TopMenuTarget) {
    if (target === "chat") return;
    onNavigate?.(target);
  }

  const headerColor = teamObj?.color ?? "#444";

  return (
    <section
      className={`chat-view ${closing ? "closing" : ""}`}
      aria-label="팀 응원톡"
      style={{
        background: `linear-gradient(180deg, ${rgba(headerColor, 0.1)}, ${rgba(headerColor, 0.22)}), #fff`,
      }}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onBack();
      }}
    >
      {/* 헤더 (팀색) */}
      <header className="chat-header" style={{ background: headerColor }}>
        <button className="chat-back" type="button" onClick={handleBack} aria-label="뒤로">
          ←
        </button>
        <div className="chat-title">
          <strong>{teamObj?.name ?? "응원톡"}</strong>
          <span>{teamObj ? `${visitCount(teamObj.code).toLocaleString()}명 방문` : "응원팀 미설정"}</span>
        </div>
        <button
          className="chat-iconbtn"
          type="button"
          onClick={() => setSearchOpen((v) => !v)}
          aria-label="검색"
        >
          🔍
        </button>
        <button
          className="chat-iconbtn"
          type="button"
          onClick={() => setSwitchOpen((v) => !v)}
          aria-label="팀 변경"
        >
          ☰
        </button>
      </header>

      <TopMenu active="chat" className="chat-top-menu" onNavigate={handleTopMenuNavigate} />

      {searchOpen ? (
        <div className="chat-search">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="대화 내용 검색 (입력하면 해당 위치로 이동)"
            aria-label="대화 검색"
            autoFocus
          />
          {query ? <span className="chat-search-count">{matchIds.size}건</span> : null}
          <button
            type="button"
            className="chat-search-close"
            aria-label="검색 닫기"
            onClick={() => {
              setQuery("");
              setSearchOpen(false);
            }}
          >
            ✕
          </button>
        </div>
      ) : null}

      {switchOpen ? (
        <div className="chat-switch" role="menu">
          {TEAMS.map((t) => (
            <button
              key={t.code}
              type="button"
              className={t.code === team ? "on" : ""}
              style={{ borderColor: t.color, color: t.code === team ? "#fff" : t.color, background: t.code === team ? t.color : "#fff" }}
              onClick={() => {
                setTeam(t.code);
                setSwitchOpen(false);
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      ) : null}

      {notice ? <div className="chat-notice">📢 {notice}</div> : null}

      {/* 메시지 */}
      <div className="chat-log" ref={logRef}>
        {!authToken ? (
          <p className="chat-empty">로그인하면 응원톡에 참여할 수 있어요.</p>
        ) : messages.length === 0 ? (
          <p className="chat-empty">아직 메시지가 없어요. 첫 응원을 남겨보세요! ⚾</p>
        ) : (
          messages.flatMap((m, i) => {
            const items: React.ReactNode[] = [];
            const prevKey = i > 0 ? dateKey(messages[i - 1].created_at) : null;
            const curKey = dateKey(m.created_at);
            if (curKey !== prevKey) {
              items.push(
                <div key={`date-${curKey}`} className="chat-date-divider">
                  <span>{dateLabel(m.created_at)}</span>
                </div>
              );
            }
            items.push(
              <div
                key={m.message_id}
                ref={(el) => {
                  if (el) msgRefs.current.set(m.message_id, el);
                }}
                className={`chat-msg ${m.is_mine ? "mine" : ""} ${matchIds.has(m.message_id) ? "match" : ""}`}
              >
                {!m.is_mine ? <span className="chat-nick">{m.nickname}</span> : null}
                <div className="chat-row">
                  <span
                    className="chat-bubble"
                    style={m.is_mine ? { background: rgba(headerColor, 0.9) } : undefined}
                  >
                    {m.content}
                  </span>
                  <span className="chat-time">{hhmm(m.created_at)}</span>
                </div>
              </div>
            );
            return items;
          })
        )}
      </div>

      {/* 입력 */}
      <form
        className="chat-inputbar"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={authToken ? "응원 메시지 입력" : "로그인 후 이용해주세요"}
          disabled={!authToken || !team}
          aria-label="메시지 입력"
        />
        <button type="submit" className="chat-send" disabled={!authToken || !team || !input.trim()}>
          전송
        </button>
      </form>
    </section>
  );
}

export default TeamChatView;
