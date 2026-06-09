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

// 인사말 감지용 (안녕/안뇽/하이/헬로/hi/hello/hey/반가). 소문자로 매칭.
const GREET_RE = /(안녕|안뇽|하이|헬로|hello|\bhi\b|\bhey\b|반가)/;

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
  buddyNickname?: string;
  notificationEnabled: boolean;
  darkModeEnabled: boolean;
  onNotificationEnabledChange: (enabled: boolean) => void;
  onDarkModeEnabledChange: (enabled: boolean) => void;
  onFavTeamChange?: (code: string) => void;
  onBuddyNicknameChange?: (nickname: string) => void;
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
  buddyNickname,
  notificationEnabled,
  darkModeEnabled,
  onNotificationEnabledChange,
  onDarkModeEnabledChange,
  onFavTeamChange,
  onBuddyNicknameChange,
  onLogout,
}: MainViewV2Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, type: "bot", text: "야구공: 무엇을 도와줄까?" },
  ]);
  const [input, setInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // 값이 증가할 때마다 캐릭터가 손 흔들기(인사) 모션을 1회 재생.
  const [greetSignal, setGreetSignal] = useState(0);
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStadiumPageOpen, setIsStadiumPageOpen] = useState(false);
  const [closingOverlay, setClosingOverlay] = useState<"tamagotchi" | "stadium" | "settings" | null>(null);
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
  const overlayCloseTimerRef = useRef<number | null>(null);
  // 발화 취소 토큰: stopSpeaking 시 증가시켜, 진행 중이거나 곧 시작될 폴백 음성도 무효화한다.
  const speakTokenRef = useRef(0);

  const supportsSTT =
    typeof window !== "undefined" &&
    Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  useEffect(() => {
    chatLogRef.current?.scrollTo({
      top: chatLogRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // 앱이 백그라운드로 가거나(웹뷰 숨김) 페이지가 사라지면 재생 중인 음성을 멈춘다.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stopSpeaking();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", stopSpeaking);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", stopSpeaking);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => () => {
    if (overlayCloseTimerRef.current) {
      window.clearTimeout(overlayCloseTimerRef.current);
    }
  }, []);

  function closeOverlay(
    overlay: "tamagotchi" | "stadium" | "settings",
    afterClose?: () => void,
  ) {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      if (overlay === "tamagotchi") setIsAttendanceOpen(false);
      if (overlay === "stadium") setIsStadiumPageOpen(false);
      if (overlay === "settings") setIsSettingsOpen(false);
      setClosingOverlay(null);
      afterClose?.();
    };

    if (overlayCloseTimerRef.current) {
      window.clearTimeout(overlayCloseTimerRef.current);
      overlayCloseTimerRef.current = null;
    }

    if (reduceMotion) {
      finish();
      return;
    }

    setClosingOverlay(overlay);
    overlayCloseTimerRef.current = window.setTimeout(finish, 260);
  }

  function switchToMenuTarget(key: TopMenuTarget) {
    if (overlayCloseTimerRef.current) {
      window.clearTimeout(overlayCloseTimerRef.current);
      overlayCloseTimerRef.current = null;
    }

    stopSpeaking();
    setClosingOverlay(null);
    setIsAttendanceOpen(key === "tamagotchi");
    setIsStadiumPageOpen(key === "stadium");
    setIsSettingsOpen(key === "settings");
    setShowRecords(key === "record");
    setShowChat(key === "chat");
  }

  async function speakWithAzure(
    text: string,
    onReveal?: (revealed: string) => void,
    isCancelled?: () => boolean,
  ): Promise<boolean> {
    try {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }

      const resp = await fetch(apiUrl("/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, team_code: favTeamCode || null }),
      });
      if (!resp.ok) return false;

      const data = await resp.json();
      if (!data.audio) return false;
      // 응답을 받는 사이 중단됐으면 재생하지 않음(폴백도 막기 위해 처리완료로 반환).
      if (isCancelled?.()) return true;

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
    // 이번 발화의 토큰. 중간에 stopSpeaking 되면 토큰이 바뀌어 cancelled()가 true가 된다.
    const myToken = ++speakTokenRef.current;
    const cancelled = () => speakTokenRef.current !== myToken;

    if (await speakWithAzure(text, onReveal, cancelled)) return;
    if (cancelled()) return; // Azure 실패를 기다리는 사이 중단됐으면 폴백 음성도 시작 안 함

    onReveal?.(text);   // Azure 실패 → 정밀 타이밍 불가하니 전체 텍스트 즉시 표시

    if (Capacitor.isNativePlatform()) {
      if (cancelled()) return;
      setIsSpeaking(true);
      try {
        await TextToSpeech.stop();
      } catch {
        /* noop */
      }
      if (cancelled()) {   // stop() 사이에 중단됐으면 새로 말하지 않음
        setIsSpeaking(false);
        return;
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
    if (cancelled()) return;

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

  // 스트리밍 음성 파이프라인: /chat/voice/stream(SSE)을 받아 문장이 도착하는 대로
  // 큐에 넣고 순차 재생. 첫 음성이 ~2~3초에 시작(전체 답변 대기 없이). 각 문장은
  // 자기 viseme로 립싱크 + 누적 텍스트로 자막. 음성 하나도 못 받으면 ok:false → 폴백.
  type VoiceSeg = {
    text: string;
    audio: string;
    mime?: string;
    visemes?: Array<{ offset: number; id: number }>;
    boundaries?: Array<{ offset: number; textOffset: number; length: number }>;
  };

  async function speakAnswerStream(
    question: string,
    onReveal?: (revealed: string) => void,
  ): Promise<{ ok: boolean; text: string }> {
    const myToken = ++speakTokenRef.current;
    const cancelled = () => speakTokenRef.current !== myToken;

    const queue: VoiceSeg[] = [];
    let streamDone = false;
    let gotAny = false;
    let accumulated = ""; // 완성 재생된 문장들(자막 누적)

    // 한 문장 재생 + 립싱크 + 자막(누적 + 현재 문장 진행분)
    const playSegment = (seg: VoiceSeg) =>
      new Promise<void>((resolve) => {
        if (cancelled()) return resolve();
        if (!seg.audio) {   // 합성 실패 문장 — 텍스트만 표시하고 잠깐 보여줌
          onReveal?.(accumulated + seg.text);
          setTimeout(resolve, 250);
          return;
        }
        const visemes = seg.visemes ?? [];
        const boundaries = seg.boundaries ?? [];
        const audio = new Audio(`data:${seg.mime || "audio/wav"};base64,${seg.audio}`);
        ttsAudioRef.current = audio;
        let raf = 0;
        let settled = false;
        const drive = () => {
          if (cancelled()) return finish();
          const tMs = audio.currentTime * 1000;
          let activeId = 0;
          for (let i = 0; i < visemes.length; i++) {
            if (visemes[i].offset <= tMs) activeId = visemes[i].id;
            else break;
          }
          setActiveViseme(activeId);
          if (onReveal) {
            let inSeg = "";
            if (boundaries.length) {
              let end = 0;
              for (let i = 0; i < boundaries.length; i++) {
                if (boundaries[i].offset <= tMs)
                  end = Math.max(end, boundaries[i].textOffset + boundaries[i].length);
                else break;
              }
              inSeg = seg.text.slice(0, end);
            } else if (audio.duration) {
              const ratio = Math.min(1, audio.currentTime / audio.duration);
              inSeg = seg.text.slice(0, Math.floor(seg.text.length * ratio));
            }
            onReveal(accumulated + inSeg);
          }
          raf = requestAnimationFrame(drive);
        };
        function finish() {
          if (settled) return;
          settled = true;
          cancelAnimationFrame(raf);
          clearMouth();
          if (ttsAudioRef.current === audio) ttsAudioRef.current = null;
          resolve();
        }
        audio.onplay = () => {
          setIsSpeaking(true);
          raf = requestAnimationFrame(drive);
        };
        audio.onended = finish;
        audio.onerror = finish;
        audio.play().catch(finish);
      });

    // 재생 루프: 큐가 비면 스트림 끝날 때까지 대기, 문장이 오면 순차 재생
    const playLoop = (async () => {
      while (true) {
        if (cancelled()) return;
        const seg = queue.shift();
        if (!seg) {
          if (streamDone) return;
          await new Promise((r) => setTimeout(r, 25));
          continue;
        }
        await playSegment(seg);
        accumulated += seg.text + " ";
        onReveal?.(accumulated);
        // 문장 사이 자연스러운 텀(겹쳐 들리는 느낌 방지)
        if (!cancelled()) await new Promise((r) => setTimeout(r, 130));
      }
    })();

    const ctrl = new AbortController();
    let watchdog = 0;
    const resetWatchdog = () => {
      window.clearTimeout(watchdog);
      // 15초간 아무 이벤트도 안 오면 중단 → 폴백 (영구 멈춤 방지)
      watchdog = window.setTimeout(() => ctrl.abort(), 15000);
    };
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      resetWatchdog();
      const resp = await fetch(apiUrl("/chat/voice/stream"), {
        method: "POST",
        headers,
        body: JSON.stringify({ question, team_code: favTeamCode || null, session_id: "frontend-demo" }),
        signal: ctrl.signal,
      });
      if (!resp.ok || !resp.body) {
        streamDone = true;
        await playLoop;
        return { ok: false, text: accumulated.trim() };
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        if (cancelled()) {
          reader.cancel().catch(() => {});
          break;
        }
        const { value, done } = await reader.read();
        if (done) break;
        resetWatchdog();
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n\n")) >= 0) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const line = chunk.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          try {
            const ev = JSON.parse(line.slice(5).trim());
            if (ev.done) {
              streamDone = true;
            } else if (ev.error) {
              streamDone = true; // 서버 에러 → 종료(가진 것까지 재생 후 폴백 판단)
            } else if (typeof ev.text === "string") {
              gotAny = true;        // 텍스트만 와도(합성 실패) 세그먼트로 — 자막은 보장
              queue.push(ev as VoiceSeg);
            }
          } catch {
            /* 부분 라인 무시 */
          }
        }
      }
    } catch (err) {
      console.warn("[MainViewV2] voice stream failed/aborted", err);
    } finally {
      window.clearTimeout(watchdog);
    }
    streamDone = true;
    await playLoop;
    if (gotAny && onReveal) onReveal(accumulated.trim());
    return { ok: gotAny, text: accumulated.trim() };
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

    // 인사말이 "말로 나오는 순간"에 손을 흔들도록 — 누적 텍스트가 인사말을 지나가면 1회.
    // (스트리밍이라 답변 전체를 미리 모르므로, 드러난 텍스트에서 실시간 탐지)
    let greeted = false;
    const revealWithGreet = (revealed: string) => {
      setBot(revealed);
      if (!greeted) {
        const m = revealed.toLowerCase().match(GREET_RE);
        if (m && revealed.length >= (m.index ?? 0) + m[0].length) {
          greeted = true;
          setGreetSignal((n) => n + 1);
        }
      }
    };

    // 통문장 합성 — 답변 전체를 받아 한 번에 음성(v3가 문맥을 살려 자연스러운 사투리 억양).
    // 문장별 스트리밍(청킹)은 v3가 문맥을 못 받아 밋밋해져서 통문장으로 통일.
    const answer = await fetchAnswer(question);
    await speakAnswer(answer, revealWithGreet);
    setBot(answer);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(input);
  }

  // 모든 TTS(오디오 엘리먼트 / 네이티브 / 웹 음성)를 즉시 중단 + 입모양 정리.
  function stopSpeaking() {
    speakTokenRef.current++; // 진행 중/예정된 발화를 무효화 (폴백 음성 race 방지)
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = "";
      ttsAudioRef.current = null;
    }
    TextToSpeech.stop().catch(() => {}); // 네이티브(Capacitor) 음성 중단
    window.speechSynthesis?.cancel();    // 웹 음성 중단
    clearMouth();
    setIsSpeaking(false);
  }

  function toggleMic() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    stopSpeaking(); // 마이크 켜기 전, 재생 중인 음성 중단

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
    switchToMenuTarget(key);
  }

  return (
    <section className="stage-view" aria-label="메인 화면">
      <div className="stage-bg" aria-hidden="true">
        {/* 하늘 레이어 (뒤, 느리게) — 같은 이미지 2번이라 끊김 없이 루프 */}
        <div className="stage-bg-track stage-bg-sky">
          <img className="stage-bg-image" src="/img/background_sky.png" alt="" />
          <img className="stage-bg-image" src="/img/background_sky.png" alt="" />
        </div>
        {/* 경기장 레이어 (앞, 빠르게) — background_1~4를 이어붙이고, 같은 세트를 2번 반복해 끊김 없이 루프 */}
        <div className="stage-bg-track stage-bg-ground">
          <img className="stage-bg-image" src="/img/background_1.png" alt="" />
          <img className="stage-bg-image" src="/img/background_2.png" alt="" />
          <img className="stage-bg-image" src="/img/background_3.png" alt="" />
          <img className="stage-bg-image" src="/img/background_4.png" alt="" />
          <img className="stage-bg-image" src="/img/background_1.png" alt="" />
          <img className="stage-bg-image" src="/img/background_2.png" alt="" />
          <img className="stage-bg-image" src="/img/background_3.png" alt="" />
          <img className="stage-bg-image" src="/img/background_4.png" alt="" />
        </div>
      </div>
      <div className="stage-white-fade" aria-hidden="true" />
      <div className="stage-nav-overlay" aria-hidden="true" />

      <TopMenu active="home" className="stage-nav" onNavigate={handleNav} />

      <div className="stage-character" aria-hidden="false">
        <Character3D isSpeaking={isSpeaking} greetSignal={greetSignal} className="stage-character-canvas" />
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

          <button
            type="button"
            className="stage-stop"
            onClick={stopSpeaking}
            disabled={!isSpeaking}
            aria-label="음성 정지"
            title="음성 정지"
          >
            <span aria-hidden="true">⏸</span>
          </button>

          <button type="submit" className="stage-send">
            보내기
          </button>
        </form>
      </section>

      {/* 화면이 열려있는 동안 메인 위에 중립 커버를 깔아, 메뉴↔메뉴 전환 시 뒤로 메인이 비치지 않게 한다. */}
      {(showRecords || showChat || isAttendanceOpen || isStadiumPageOpen || isSettingsOpen || closingOverlay) ? (
        <div className="screen-cover" aria-hidden="true" />
      ) : null}

      {isAttendanceOpen ? (
        <div
          className={`attendance-window-backdrop ${closingOverlay === "tamagotchi" ? "is-closing" : ""}`}
          role="presentation"
          onClick={() => closeOverlay("tamagotchi")}
        >
          <section
            className="attendance-window"
            role="dialog"
            aria-modal="true"
            aria-label="야구짝꿍"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="attendance-window-close"
              type="button"
              aria-label="뒤로가기"
              onClick={() => closeOverlay("tamagotchi")}
            >
              뒤로가기
            </button>
            <AttendanceCheckIn
              authToken={authToken}
              nickname={nickname}
              buddyNickname={buddyNickname}
              favTeamCode={favTeamCode}
              onBuddyNicknameChange={onBuddyNicknameChange}
              onCheckedTodayChange={setAttendanceCheckedToday}
              onRequestClose={() => closeOverlay("tamagotchi")}
              onNavigate={(target) => {
                switchToMenuTarget(target);
              }}
            />
          </section>
        </div>
      ) : null}

      {isStadiumPageOpen ? (
        <div
          className={`stadium-page-backdrop ${closingOverlay === "stadium" ? "is-closing" : ""}`}
          role="presentation"
          onClick={() => closeOverlay("stadium")}
        >
          <section
            className="stadium-page-window"
            role="dialog"
            aria-modal="true"
            aria-label="구장정보"
            onClick={(event) => event.stopPropagation()}
          >
            <StadiumPage
              onClose={() => closeOverlay("stadium")}
              onNavigate={(target) => {
                switchToMenuTarget(target);
              }}
            />
          </section>
        </div>
      ) : null}

      {isSettingsOpen ? (
        <div
          className={`settings-window-backdrop ${closingOverlay === "settings" ? "is-closing" : ""}`}
          role="presentation"
          onClick={() => closeOverlay("settings")}
        >
          <section
            className="settings-window"
            role="dialog"
            aria-modal="true"
            aria-label="환경설정"
            onClick={(event) => event.stopPropagation()}
          >
            <SettingsView
              onClose={() => closeOverlay("settings")}
              nickname={nickname}
              notificationEnabled={notificationEnabled}
              darkModeEnabled={darkModeEnabled}
              onNotificationEnabledChange={onNotificationEnabledChange}
              onDarkModeEnabledChange={onDarkModeEnabledChange}
              authToken={authToken}
              favTeamCode={favTeamCode}
              onFavTeamChange={onFavTeamChange}
              onLogout={onLogout}
              onNavigate={(target) => {
                switchToMenuTarget(target);
              }}
            />
          </section>
        </div>
      ) : null}

      {showRecords ? (
        <MyRecordsView
          authToken={authToken}
          onBack={() => setShowRecords(false)}
          onNavigate={switchToMenuTarget}
        />
      ) : null}

      {showChat ? (
        <TeamChatView
          authToken={authToken}
          onBack={() => setShowChat(false)}
          onNavigate={switchToMenuTarget}
        />
      ) : null}
    </section>
  );
}

export default MainViewV2;
