import { FormEvent, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { apiUrl } from "../api";
import Character3D from "./Character3D";
import PetModal from "./PetModal";
import { clearMouth, setActiveViseme } from "../lipSync";
import AttendanceCheckIn from "./AttendanceCheckIn";
import { MyRecordsView } from "./MyRecordsView";
import SettingsView from "./SettingsView";
import { StadiumPage } from "./StadiumPage";
import { TeamChatView } from "./TeamChatView";
import { TopMenu, type TopMenuTarget } from "./TopMenu";
import { WeatherFx, type WeatherCondition } from "./WeatherFx";
import "./MainViewV2.css";

// 팀 코드 → 홈 구장 (weather.py STADIUMS 키와 일치)
const TEAM_HOME_STADIUM: Record<string, string> = {
  OB: "잠실야구장",
  LG: "잠실야구장",
  HT: "광주-KIA챔피언스필드",
  SS: "대구삼성라이온즈파크",
  NC: "창원NC파크",
  KT: "수원KT위즈파크",
  SK: "SSG랜더스필드",
  WO: "고척스카이돔",
  HH: "대전한화생명볼파크",
  LT: "사직야구장",
};

interface MainViewV2Props {
  authToken: string;
  favTeamCode?: string;
  nickname?: string;
  notificationEnabled: boolean;
  darkModeEnabled: boolean;
  onNotificationEnabledChange: (enabled: boolean) => void;
  onDarkModeEnabledChange: (enabled: boolean) => void;
  onFavTeamChange?: (code: string) => void;
  onLogout: () => void;
}

interface ChatMessage {
  id: number;
  type: "user" | "bot";
  text: string;
}

const LOCAL_FALLBACK_ANSWERS = [
  {
    keywords: ["안녕", "하이", "hello"],
    answer: "안녕! 백엔드 연결이 아직 준비되지 않으면 내가 기본 야구 설명으로 먼저 도와줄게.",
  },
  {
    keywords: ["야구", "baseball"],
    answer:
      "야구는 공격팀이 공을 치고 1루, 2루, 3루를 돌아 홈으로 들어오면 점수를 얻는 경기야. 수비팀은 아웃 3개를 잡으면 공격과 수비가 바뀌어.",
  },
  {
    keywords: ["스트라이크", "strike"],
    answer:
      "스트라이크는 타자가 칠 수 있는 존으로 들어온 공이거나, 타자가 헛스윙한 공이야. 스트라이크가 3개가 되면 타자는 아웃이야.",
  },
  {
    keywords: ["볼넷", "볼 넷", "four ball"],
    answer:
      "볼넷은 투수가 스트라이크존 밖으로 던진 공이 4개가 되었을 때 타자가 1루로 나가는 상황이야.",
  },
  {
    keywords: ["아웃", "out"],
    answer:
      "아웃은 공격하던 선수가 더 이상 플레이를 이어갈 수 없게 되는 상태야. 한 이닝에서 아웃 3개가 되면 공격과 수비가 바뀌어.",
  },
  {
    keywords: ["홈런", "home run"],
    answer:
      "홈런은 타자가 친 공이 담장을 넘어가거나, 수비가 잡지 못하는 사이 타자가 홈까지 들어오는 득점 플레이야.",
  },
  {
    keywords: ["투수", "pitcher"],
    answer:
      "투수는 수비팀에서 공을 던지는 선수야. 타자가 치기 어렵게 공의 속도와 방향을 조절하는 역할을 해.",
  },
  {
    keywords: ["타자", "batter"],
    answer:
      "타자는 공격팀에서 공을 치는 선수야. 공을 잘 치고 출루하거나 주자를 홈으로 불러들이는 게 주요 역할이야.",
  },
];

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function isPlaceholderAnswer(answer: string) {
  const normalized = normalizeText(answer);
  return (
    !answer.trim() ||
    normalized.includes("llm") ||
    normalized.includes("gemini_api_key") ||
    normalized.includes("미연결")
  );
}

function buildLocalFallbackAnswer(question: string) {
  const normalizedQuestion = normalizeText(question);
  const matched = LOCAL_FALLBACK_ANSWERS.find((item) =>
    item.keywords.some((keyword) => normalizedQuestion.includes(normalizeText(keyword))),
  );

  return (
    matched?.answer ??
    "백엔드 서버 연결이 아직 준비되지 않아서 기본 답변으로 도와줄게. 야구 규칙, 포지션, 스트라이크, 볼넷처럼 궁금한 단어를 물어보면 쉽게 설명해줄 수 있어."
  );
}

export function MainViewV2({
  authToken,
  favTeamCode,
  nickname,
  notificationEnabled,
  darkModeEnabled,
  onNotificationEnabledChange,
  onDarkModeEnabledChange,
  onFavTeamChange,
  onLogout,
}: MainViewV2Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, type: "bot", text: "야구공: 무엇을 도와줄까?" },
  ]);
  const [input, setInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStadiumPageOpen, setIsStadiumPageOpen] = useState(false);
  const [, setAttendanceCheckedToday] = useState(false);
  const [showRecords, setShowRecords] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>(null);

  // 챗 연결 예열 — 진입 시 더미 호출로 Gemini 연결을 데워 첫 질문 콜드 지연을 줄임
  useEffect(() => {
    fetch(apiUrl("/chat/warmup"), { method: "POST" }).catch(() => {});
  }, []);

  // 응원팀 홈구장 날씨 → 메인 날씨 애니메이션
  useEffect(() => {
    let alive = true;
    // 디버그/테스트용: URL ?wx=rain|snow|clear|overcast 로 강제 지정
    const wxOverride = new URLSearchParams(window.location.search).get("wx");
    if (wxOverride) {
      setWeatherCondition(wxOverride as WeatherCondition);
      return;
    }
    (async () => {
      let code = localStorage.getItem("myTeamCode");
      if (!code && authToken) {
        try {
          const r = await fetch(apiUrl("/auth/me"), {
            headers: { Authorization: `Bearer ${authToken}` },
          });
          if (r.ok) {
            const d = await r.json();
            code = d.fav_team_code || d.user?.fav_team_code || null;
          }
        } catch {
          /* 무시 */
        }
      }
      const stadium = TEAM_HOME_STADIUM[code ?? ""] ?? "잠실야구장";
      try {
        const r = await fetch(apiUrl(`/weather/now?stadium=${encodeURIComponent(stadium)}`));
        if (r.ok && alive) {
          const d = await r.json();
          if (d.condition) setWeatherCondition(d.condition as WeatherCondition);
        }
      } catch {
        /* 날씨 없으면 효과 생략 */
      }
    })();
    return () => {
      alive = false;
    };
  }, [authToken]);

  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const supportsSTT =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    chatLogRef.current?.scrollTo({
      top: chatLogRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.addEventListener("result", (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      setIsListening(false);
      if (transcript) void submitQuestion(transcript);
    });
    recognition.addEventListener("end", () => setIsListening(false));
    recognition.addEventListener("error", () => setIsListening(false));

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function speakWithAzure(
    text: string,
    onReveal?: (revealed: string) => void,
  ): Promise<boolean> {
    try {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }

      const resp = await fetch(apiUrl("/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) return false;

      const data = await resp.json();
      if (!data.audio) return false;

      const visemes: Array<{ offset: number; id: number }> = Array.isArray(data.visemes)
        ? data.visemes
        : [];
      const boundaries: Array<{ offset: number; textOffset: number; length: number }> =
        Array.isArray(data.boundaries) ? data.boundaries : [];
      const audio = new Audio(`data:${data.mime || "audio/mpeg"};base64,${data.audio}`);
      ttsAudioRef.current = audio;

      return await new Promise<boolean>((resolve) => {
        let settled = false;
        let lipRaf = 0;

        const driveLipSync = () => {
          const tMs = audio.currentTime * 1000;
          let activeId = 0;
          for (let i = 0; i < visemes.length; i++) {
            if (visemes[i].offset <= tMs) activeId = visemes[i].id;
            else break;
          }
          setActiveViseme(activeId);
          // 음성 진행에 맞춰 텍스트를 드러냄 — 단어경계 우선, 없으면 시간 비례로 폴백
          if (onReveal) {
            let revealed = "";
            if (boundaries.length) {
              let end = 0;
              for (let i = 0; i < boundaries.length; i++) {
                if (boundaries[i].offset <= tMs) end = Math.max(end, boundaries[i].textOffset + boundaries[i].length);
                else break;
              }
              revealed = text.slice(0, end);
            } else if (audio.duration) {
              const ratio = Math.min(1, audio.currentTime / audio.duration);
              revealed = text.slice(0, Math.floor(text.length * ratio));
            }
            if (revealed) onReveal(revealed);
          }
          lipRaf = requestAnimationFrame(driveLipSync);
        };

        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          cancelAnimationFrame(lipRaf);
          clearMouth();
          setIsSpeaking(false);
          if (ttsAudioRef.current === audio) ttsAudioRef.current = null;
          if (ok && onReveal) onReveal(text);   // 끝나면 전체 텍스트 보장
          resolve(ok);
        };

        audio.onplay = () => {
          setIsSpeaking(true);
          lipRaf = requestAnimationFrame(driveLipSync);
        };
        audio.onended = () => finish(true);
        audio.onerror = () => finish(false);
        audio.play().catch(() => finish(false));
      });
    } catch (err) {
      console.warn("[TTS] Azure failed; falling back to device speech", err);
      return false;
    }
  }

  async function speakAnswer(text: string, onReveal?: (revealed: string) => void) {
    if (await speakWithAzure(text, onReveal)) return;

    onReveal?.(text);   // Azure 실패 → 정밀 타이밍 불가하니 전체 텍스트 즉시 표시

    if (Capacitor.isNativePlatform()) {
      setIsSpeaking(true);
      try {
        await TextToSpeech.stop();
      } catch {
        /* noop */
      }
      await TextToSpeech.speak({
        text,
        lang: "ko-KR",
        rate: 1.1,
        pitch: 1.3,
        volume: 1.0,
        category: "playback",
      }).catch(() => undefined);
      setIsSpeaking(false);
      return;
    }

    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    utterance.rate = 1.08;
    utterance.pitch = 1.4;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  // 응원팀(team_code) 페르소나로 답변 전체를 받아옴. (표시는 음성에 맞춰 speakAnswer가 드러냄)
  async function fetchAnswer(question: string): Promise<string> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const r = await fetch(apiUrl("/chat"), {
        method: "POST",
        headers,
        body: JSON.stringify({ question, team_code: favTeamCode || null, session_id: "frontend-demo" }),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.answer && !isPlaceholderAnswer(d.answer)) return d.answer as string;
      }
    } catch (err) {
      console.warn("[MainViewV2] /chat failed; using local fallback", err);
    }
    return buildLocalFallbackAnswer(question);
  }

  async function submitQuestion(raw: string) {
    const question = raw.trim();
    if (!question) return;

    const baseId = Date.now();
    const botId = baseId + 1;
    setMessages((prev) => [...prev, { id: baseId, type: "user", text: question }]);
    setInput("");
    setMessages((prev) => [...prev, { id: botId, type: "bot", text: "…" }]); // 답변 준비 중 표시
    const setBot = (text: string) =>
      setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, text } : m)));

    const answer = await fetchAnswer(question);
    // 음성 재생과 동시에 단어 단위로 텍스트를 드러냄(동기화). 음성 실패 시 speakAnswer가 전체를 한 번에 표시.
    await speakAnswer(answer, setBot);
    setBot(answer); // 안전장치: 종료 후 전체 텍스트 보장
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(input);
  }

  function toggleMic() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    clearMouth();
    setIsSpeaking(false);
    window.speechSynthesis?.cancel();

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }

  function handleNav(key: TopMenuTarget) {
    if (key === "home") {
      return;
    }
    if (key === "tamagotchi") {
      setIsAttendanceOpen(true);
      return;
    }
    if (key === "stadium") {
      setIsStadiumPageOpen(true);
      return;
    }
    if (key === "settings") {
      setIsSettingsOpen(true);
      return;
    }
    if (key === "record") {
      setShowRecords(true);
      return;
    }
    if (key === "chat") {
      setShowChat(true);
      return;
    }
  }

  return (
    <section className="stage-view" aria-label="메인 화면">
      <div className="stage-bg" aria-hidden="true">
        {/* 하늘 레이어 (뒤, 느리게) */}
        <div className="stage-bg-track stage-bg-sky">
          <img className="stage-bg-image" src="/bg-sky.png" alt="" />
          <img className="stage-bg-image" src="/bg-sky.png" alt="" />
        </div>
        {/* 경기장 레이어 (앞, 빠르게) */}
        <div className="stage-bg-track stage-bg-ground">
          <img className="stage-bg-image" src="/bg-ground.png" alt="" />
          <img className="stage-bg-image" src="/bg-ground.png" alt="" />
        </div>
      </div>
      <div className="stage-white-fade" aria-hidden="true" />

      <TopMenu active="home" className="stage-nav" onNavigate={handleNav} />

      <div className="stage-character" aria-hidden="false">
        <Character3D isSpeaking={isSpeaking} className="stage-character-canvas" />
      </div>

      <WeatherFx condition={weatherCondition} />

      <section className="stage-chat" aria-label="야구 코치 채팅">
        <div className="stage-chatlog" ref={chatLogRef} aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`stage-msg ${message.type}`}>
              {message.text}
            </div>
          ))}
        </div>

        <form className="stage-inputbar" onSubmit={handleSubmit}>
          <button
            type="button"
            className={`stage-mic ${isListening ? "is-on" : ""}`}
            onClick={toggleMic}
            disabled={!supportsSTT}
            aria-pressed={isListening}
            aria-label={isListening ? "마이크 끄기" : "마이크 켜기"}
            title={supportsSTT ? "마이크 켜기/끄기" : "이 환경은 음성 인식을 지원하지 않습니다"}
          >
            <span aria-hidden="true">{isListening ? "●" : "🎙️"}</span>
          </button>

          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="텍스트 입력 창"
            aria-label="질문 입력"
          />

          <button type="submit" className="stage-send">
            보내기
          </button>
        </form>
      </section>

      {isAttendanceOpen ? (
        <div
          className="attendance-window-backdrop"
          role="presentation"
          onClick={() => setIsAttendanceOpen(false)}
        >
          <section
            className="attendance-window"
            role="dialog"
            aria-modal="true"
            aria-label="다마고치"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="attendance-window-close"
              type="button"
              aria-label="뒤로가기"
              onClick={() => setIsAttendanceOpen(false)}
            >
              뒤로가기
            </button>
            <AttendanceCheckIn
              authToken={authToken}
              nickname={nickname}
              favTeamCode={favTeamCode}
              onCheckedTodayChange={setAttendanceCheckedToday}
              onRequestClose={() => setIsAttendanceOpen(false)}
              onNavigate={(target) => {
                setIsAttendanceOpen(false);
                window.setTimeout(() => handleNav(target), 0);
              }}
            />
          </section>
        </div>
      ) : null}

      {isStadiumPageOpen ? (
        <div
          className="stadium-page-backdrop"
          role="presentation"
          onClick={() => setIsStadiumPageOpen(false)}
        >
          <section
            className="stadium-page-window"
            role="dialog"
            aria-modal="true"
            aria-label="구장정보"
            onClick={(event) => event.stopPropagation()}
          >
            <StadiumPage
              onClose={() => setIsStadiumPageOpen(false)}
              onNavigate={(target) => {
                setIsStadiumPageOpen(false);
                window.setTimeout(() => handleNav(target), 0);
              }}
            />
          </section>
        </div>
      ) : null}

      {isSettingsOpen ? (
        <div
          className="settings-window-backdrop"
          role="presentation"
          onClick={() => setIsSettingsOpen(false)}
        >
          <section
            className="settings-window"
            role="dialog"
            aria-modal="true"
            aria-label="환경설정"
            onClick={(event) => event.stopPropagation()}
          >
            <SettingsView
              onClose={() => setIsSettingsOpen(false)}
              notificationEnabled={notificationEnabled}
              darkModeEnabled={darkModeEnabled}
              onNotificationEnabledChange={onNotificationEnabledChange}
              onDarkModeEnabledChange={onDarkModeEnabledChange}
              authToken={authToken}
              favTeamCode={favTeamCode}
              onFavTeamChange={onFavTeamChange}
              onLogout={onLogout}
              onNavigate={(target) => {
                setIsSettingsOpen(false);
                window.setTimeout(() => handleNav(target), 0);
              }}
            />
          </section>
        </div>
      ) : null}

      {showRecords ? (
        <MyRecordsView authToken={authToken} onBack={() => setShowRecords(false)} />
      ) : null}

      {showChat ? (
        <TeamChatView authToken={authToken} onBack={() => setShowChat(false)} />
      ) : null}
    </section>
  );
}

export default MainViewV2;
