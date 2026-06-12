import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../api";
import type { TopMenuTarget } from "./TopMenu";
import { MenuButton } from "./MenuButton";
import { SideMenu } from "./SideMenu";
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

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  function hueToRgb(p: number, q: number, t: number): number {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  let r: number;
  let g: number;
  let b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }

  const toHex = (v: number) =>
    Math.round(v * 255).toString(16).padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function saturateHex(hex: string, amount = 1.45): string {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);

  return hslToHex(h, clamp(s * amount, 0, 1), l);
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function mixWithWhite(hex: string, whiteAmount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (v: number) => Math.round(v + (255 - v) * whiteAmount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

function teamBubbleTone(hex: string, messageId: number): string {
  const tones = [0.58, 0.48, 0.38, 0.28];
  return mixWithWhite(hex, tones[Math.abs(messageId) % tones.length]);
}

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
  const [switchOpen, setSwitchOpen] = useState(false);
  const [sideMenuOpen, setSideMenuOpen] = useState(false);

  const rootRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const switchRef = useRef<HTMLDivElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const inputBarRef = useRef<HTMLFormElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef(0);

  const teamObj = teamByCode(team);
  const chatSideSpace = 12;

  function updateChatLayout() {
    const root = rootRef.current;
    if (!root) return;

    const visualViewport = window.visualViewport;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportTop = visualViewport?.offsetTop ?? 0;

    const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
    const switchHeight = switchRef.current?.getBoundingClientRect().height ?? 0;
    const inputHeight = inputBarRef.current?.getBoundingClientRect().height ?? 0;

    root.style.setProperty("--chat-viewport-height", `${Math.ceil(viewportHeight)}px`);
    root.style.setProperty("--chat-viewport-top", `${Math.ceil(viewportTop)}px`);
    root.style.setProperty("--chat-header-height", `${Math.ceil(headerHeight)}px`);
    root.style.setProperty("--chat-search-height", "0px");
    root.style.setProperty("--chat-switch-height", `${Math.ceil(switchHeight)}px`);
    root.style.setProperty("--chat-inputbar-space", `${Math.ceil(inputHeight)}px`);
  }

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    window.requestAnimationFrame(() => {
      updateChatLayout();

      window.requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({
          behavior,
          block: "end",
        });
      });
    });
  }

  useEffect(() => {
    updateChatLayout();

    function handleViewportChange() {
      updateChatLayout();
      scrollToBottom("auto");
    }

    const resizeObserver =
      typeof ResizeObserver !== "undefined" ? new ResizeObserver(handleViewportChange) : null;

    [headerRef.current, switchRef.current, inputBarRef.current]
      .filter(Boolean)
      .forEach((el) => resizeObserver?.observe(el as Element));

    const frameId = window.requestAnimationFrame(handleViewportChange);

    window.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    window.visualViewport?.addEventListener("scroll", handleViewportChange);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("resize", handleViewportChange);
      window.visualViewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, [switchOpen, notice, team]);

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
        const url = initial ? `/board/${team}/messages` : `/board/${team}/messages?after=${lastIdRef.current}`;
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

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages]);

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

  function handleSideMenuNavigate(target: TopMenuTarget) {
    if (target === "chat") return;
    onNavigate?.(target);
  }

  const rawHeaderColor = teamObj?.color ?? "#444";

  const lotteHeaderColor = saturateHex("#7AB6E8", 1.35);
  const lotteBubbleColor = saturateHex("#C8102E", 1.25);

  const headerColor = team === "LT" ? lotteHeaderColor : saturateHex(rawHeaderColor, 1.45);
  const bubbleBaseColor = team === "LT" ? lotteBubbleColor : headerColor;
  const inputAccentColor = team === "LT" ? lotteHeaderColor : bubbleBaseColor;
  const headerGradientStart = mixWithWhite(headerColor, 0.18);

  function bubbleStyle(m: BoardMessage): React.CSSProperties {
    if (m.is_mine) {
      return {
        background: "#fff",
        color: "#1c2330",
        border: `1.5px solid ${rgba(bubbleBaseColor, 0.9)}`,
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
      };
    }

    return {
      background: teamBubbleTone(bubbleBaseColor, m.message_id),
      color: "#1c2330",
    };
  }

  return (
    <section
      ref={rootRef}
      className={`chat-view ${closing ? "closing" : ""}`}
      aria-label="팀 응원톡"
      style={{
        background: `linear-gradient(180deg, ${rgba(headerColor, 0.16)}, ${rgba(headerColor, 0.32)}), #fff`,
      }}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) onBack();
      }}
    >
      <header
        ref={headerRef}
        className="chat-header"
        style={{
          background: `linear-gradient(135deg, ${headerGradientStart} 0%, ${headerColor} 100%)`,
        }}
      >
        <div className="chat-header-top">
          <button className="chat-back" type="button" onClick={handleBack} aria-label="뒤로">
            ←
          </button>

          <div className="chat-header-actions">
            <MenuButton onClick={() => setSideMenuOpen(true)} />
          </div>
        </div>

        <div className="chat-title">
          <strong>Hi!</strong>
          <span>{teamObj?.name ?? "응원톡"} 팀 채팅방</span>
        </div>

        {notice ? (
          <div className="chat-notice-window">
            <div className="chat-notice-glass-bg" aria-hidden="true" />
            <div className="chat-notice-light" aria-hidden="true" />
            <p className="chat-notice-copy">📢 {notice}</p>
          </div>
        ) : null}
      </header>

      <SideMenu
        isOpen={sideMenuOpen}
        active="chat"
        onNavigate={handleSideMenuNavigate}
        onClose={() => setSideMenuOpen(false)}
      />

      {switchOpen ? (
        <div className="chat-switch" ref={switchRef} role="menu">
          {TEAMS.map((t) => {
            const vividTeamColor = saturateHex(t.color, 1.45);

            return (
              <button
                key={t.code}
                type="button"
                className={t.code === team ? "on" : ""}
                style={{
                  borderColor: vividTeamColor,
                  color: t.code === team ? "#fff" : vividTeamColor,
                  background: t.code === team ? vividTeamColor : "#fff",
                }}
                onClick={() => {
                  setTeam(t.code);
                  setSwitchOpen(false);
                }}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      ) : null}

      <section className="chat-panel">
        <div className="chat-log" ref={logRef} style={{ paddingLeft: chatSideSpace, paddingRight: chatSideSpace }}>
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
                <div key={m.message_id} className={`chat-msg ${m.is_mine ? "mine" : ""}`}>
                  {!m.is_mine ? <span className="chat-nick">{m.nickname}</span> : null}
                  <div className="chat-row">
                    <span className="chat-bubble" style={bubbleStyle(m)}>
                      {m.content}
                    </span>
                    <span className="chat-time">{hhmm(m.created_at)}</span>
                  </div>
                </div>
              );

              return items;
            })
          )}

          <div ref={bottomRef} className="chat-bottom-sentinel" aria-hidden="true" />
        </div>
      </section>

      <form
        ref={inputBarRef}
        className="chat-inputbar"
        style={{
          borderTop: `1px solid ${inputAccentColor}`,
          background: "#fff",
        }}
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
          style={{
            background: mixWithWhite(inputAccentColor, 0.72),
          }}
        />
        <button
          type="submit"
          className="chat-send"
          disabled={!authToken || !team || !input.trim()}
          style={{
            background: inputAccentColor,
            color: "#fff",
          }}
        >
          전송
        </button>
      </form>
    </section>
  );
}

export default TeamChatView;