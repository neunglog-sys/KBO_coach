import { FormEvent, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { apiUrl } from "../api";
import Character3D from "./Character3D";
import PetModal from "./PetModal";
import { clearMouth, setActiveViseme } from "../lipSync";
import "./MainViewV2.css";

interface MainViewV2Props {
  authToken: string;
  favTeamCode?: string;
  onLogout: () => void;
}

interface ChatMessage {
  id: number;
  type: "user" | "bot";
  text: string;
}

const NAV_ITEMS = [
  { key: "chat", icon: "💬", label: "채팅방" },
  { key: "record", icon: "📒", label: "나만의 기록" },
  { key: "pet", icon: "🥕", label: "다마고치" },
  { key: "stadium", icon: "🏟️", label: "구장정보" },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

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

export function MainViewV2({ authToken, favTeamCode }: MainViewV2Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, type: "bot", text: "야구공: 무엇을 도와줄까?" },
  ]);
  const [input, setInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // 어떤 메뉴 화면이 열려 있는지 (null = 닫힘, "pet" = 다마고치)
  const [activePanel, setActivePanel] = useState<NavKey | null>(null);

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

  async function speakWithAzure(text: string): Promise<boolean> {
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
          lipRaf = requestAnimationFrame(driveLipSync);
        };

        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          cancelAnimationFrame(lipRaf);
          clearMouth();
          setIsSpeaking(false);
          if (ttsAudioRef.current === audio) ttsAudioRef.current = null;
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

  async function speakAnswer(text: string) {
    if (await speakWithAzure(text)) return;

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

  async function askCoach(question: string): Promise<string> {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const response = await fetch(apiUrl("/chat"), {
        method: "POST",
        headers,
        body: JSON.stringify({ question, session_id: "frontend-demo" }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.answer && !isPlaceholderAnswer(data.answer)) return data.answer as string;
      }
    } catch (err) {
      console.warn("[MainViewV2] /chat unavailable; using local fallback", err);
    }

    return buildLocalFallbackAnswer(question);
  }

  async function submitQuestion(raw: string) {
    const question = raw.trim();
    if (!question) return;

    const baseId = Date.now();
    setMessages((prev) => [...prev, { id: baseId, type: "user", text: question }]);
    setInput("");

    const answer = await askCoach(question);
    setMessages((prev) => [...prev, { id: baseId + 1, type: "bot", text: answer }]);
    void speakAnswer(answer);
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

  function handleNav(key: NavKey) {
    // 다마고치(pet)는 우리 화면을 모달로 띄운다. 나머지는 아직 미연결.
    if (key === "pet") {
      setActivePanel("pet");
      return;
    }
    console.info(`[MainViewV2] ${key} navigation is not connected yet.`);
  }

  return (
    <section className="stage-view" aria-label="메인 화면">
      <div className="stage-bg" aria-hidden="true">
        <div className="stage-bg-track">
          <img className="stage-bg-image" src="/background2.png" alt="" />
          <img className="stage-bg-image" src="/background2.png" alt="" />
        </div>
      </div>
      <div className="stage-white-fade" aria-hidden="true" />

      <nav className="stage-nav" aria-label="상단 메뉴">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className="stage-nav-item"
            onClick={() => handleNav(item.key)}
            aria-label={`${item.label} 열기`}
          >
            <span className="stage-nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="stage-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="stage-character" aria-hidden="false">
        <Character3D isSpeaking={isSpeaking} className="stage-character-canvas" />
      </div>

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

      {/* ===== 다마고치 모달 (다마고치 메뉴 누르면 열림) ===== */}
      {/* 모달 내용은 PetModal.tsx 로 분리. 여기선 열림 여부만 관리한다. */}
      {activePanel === "pet" ? (
        <PetModal
          authToken={authToken}
          favTeamCode={favTeamCode}
          onClose={() => setActivePanel(null)}
        />
      ) : null}
    </section>
  );
}

export default MainViewV2;
