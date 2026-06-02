import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { basics, fallbackAnswers } from "../data/baseballBasics";
import { kboTeams } from "../data/kboTeams";

type MessageType = "bot" | "user";

interface Message {
  id: number;
  sender: string;
  text: string;
  type: MessageType;
}

interface MainViewProps {
  authToken: string;
  onLogout: () => void;
}

export function MainView({ authToken, onLogout }: MainViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      sender: "야구공 코치",
      text: "응원하는 팀을 고르고 마이크 버튼을 눌러 질문해보세요. 제가 음성으로도 대답해드릴게요.",
      type: "bot",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState(kboTeams[0].id);
  const [voiceStatus, setVoiceStatus] = useState("음성 인식 대기 중");
  const [speechBubble, setSpeechBubble] = useState("팀을 고르고 질문을 말해보세요.");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [messageId, setMessageId] = useState(2);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const supportsSpeechRecognition = useMemo(
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    [],
  );

  const selectedTeam = kboTeams.find((team) => team.id === selectedTeamId) ?? kboTeams[0];

  useEffect(() => {
    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    function refreshVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }

    refreshVoices();
    window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
    };
  }, []);

  useEffect(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceStatus("이 브라우저는 음성 인식을 지원하지 않습니다.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.addEventListener("result", (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join("")
        .trim();

      setQuestion(transcript);
      setVoiceStatus(transcript ? "음성 인식 완료" : "음성을 인식하지 못했습니다.");

      if (transcript) {
        void submitQuestion(transcript);
      }
    });

    recognition.addEventListener("end", () => {
      setIsListening(false);
      setVoiceStatus((current) =>
        current === "듣고 있어요. 질문을 말해주세요." ? "음성 인식 대기 중" : current,
      );
    });

    recognition.addEventListener("error", (event) => {
      setIsListening(false);
      setVoiceStatus(
        event.error === "not-allowed"
          ? "마이크 권한이 필요합니다."
          : "음성 인식 중 문제가 발생했습니다.",
      );
    });

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [selectedTeamId]);

  async function askCoach(userQuestion: string) {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const response = await fetch("/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          question: userQuestion,
          teamId: selectedTeamId,
          sessionId: "frontend-demo",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.answer) {
          return data.answer as string;
        }
      }
    } catch {
      // Static demo fallback until the LLM API server is connected.
    }

    const matched = fallbackAnswers.find((item) => userQuestion.includes(item.keyword));
    return matched
      ? matched.answer
      : `${selectedTeam.name} 팬 기준으로 쉽게 설명해볼게요. 야구에서는 공수 교대, 아웃카운트, 주자 위치를 함께 보면 흐름이 훨씬 쉬워져요. 더 구체적으로 물어보면 초보자 기준으로 풀어서 설명해드릴게요.`;
  }

  function speakAnswer(text: string) {
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const koreanVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("ko"));
    const childLikeVoice =
      koreanVoices.find((voice) => /female|girl|yuna|sora|sunhi|heami|kyuri/i.test(voice.name)) ||
      koreanVoices[0] ||
      voices.find((voice) => /female|girl|child/i.test(voice.name));

    if (childLikeVoice) {
      utterance.voice = childLikeVoice;
    }

    utterance.lang = "ko-KR";
    utterance.rate = 1.08;
    utterance.pitch = 1.55;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setSpeechBubble(text);
    };
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  async function submitQuestion(rawQuestion: string) {
    const cleanQuestion = rawQuestion.trim();
    if (!cleanQuestion) return;

    const userMessageId = messageId;
    const pendingMessageId = messageId + 1;
    setMessageId((current) => current + 2);
    setQuestion("");
    setMessages((current) => [
      ...current,
      { id: userMessageId, sender: "나", text: cleanQuestion, type: "user" },
      { id: pendingMessageId, sender: "야구공 코치", text: "답변을 준비하고 있어요.", type: "bot" },
    ]);
    setSpeechBubble("답변을 준비하고 있어요.");

    const answer = await askCoach(cleanQuestion);
    setMessages((current) =>
      current.map((message) =>
        message.id === pendingMessageId ? { ...message, text: answer } : message,
      ),
    );
    speakAnswer(answer);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitQuestion(question);
  }

  function handleMicClick() {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    window.speechSynthesis?.cancel();
    setIsListening(true);
    setVoiceStatus("듣고 있어요. 질문을 말해주세요.");
    recognition.start();
  }

  return (
    <section id="mainView" className="main-view" aria-label="메인">
      <header className="topbar">
        <div>
          <p className="eyebrow">AI Baseball Guide</p>
          <h1>말로 질문하면 야구공 코치가 답해요</h1>
        </div>
        <button id="logoutButton" className="ghost-button" type="button" onClick={onLogout}>
          로그아웃
        </button>
      </header>

      <section className="hero-layout" aria-label="질문 답변">
        <aside className="chat-panel">
          <div className="panel-heading">
            <p className="eyebrow">Voice Question</p>
            <h2>마이크로 야구 규칙을 물어보세요</h2>
          </div>

          <label className="team-selector">
            <span>야구 10단 팀 선택</span>
            <select
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
              aria-label="야구 10단 팀 선택"
            >
              {kboTeams.map((team) => (
                <option value={team.id} key={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <div id="chatLog" className="chat-log" aria-live="polite" ref={chatLogRef}>
            {messages.map((message) => (
              <article className={`message ${message.type}`} key={message.id}>
                <strong>{message.sender}</strong>
                <p>{message.text}</p>
              </article>
            ))}
          </div>

          <form id="chatForm" className="chat-form" onSubmit={handleSubmit}>
            <button
              id="micButton"
              className={`mic-button ${isListening ? "is-listening" : ""}`}
              type="button"
              aria-label="음성으로 질문하기"
              disabled={!supportsSpeechRecognition}
              onClick={handleMicClick}
            >
              <span aria-hidden="true">MIC</span>
            </button>
            <input
              id="questionInput"
              type="text"
              placeholder="예: 볼넷이 뭐야?"
              aria-label="질문 입력"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              required
            />
            <button type="submit">질문</button>
          </form>

          <p id="voiceStatus" className="voice-status" aria-live="polite">
            {voiceStatus}
          </p>
        </aside>

        <div className="character-stage" aria-label="Live2D 캐릭터 영역">
          <div className="stadium-light"></div>
          <img
            src="img/character.png"
            alt="야구 초보자를 안내하는 야구공 캐릭터"
            className={`character ${isSpeaking ? "is-speaking" : ""}`}
          />
          <div id="speechBubble" className="speech-bubble">
            {speechBubble}
          </div>
        </div>
      </section>

      <section className="basics-section" aria-labelledby="basicsTitle">
        <div className="section-title">
          <p className="eyebrow">Basics</p>
          <h2 id="basicsTitle">야구 기초</h2>
        </div>
        <div className="basics-scroll" tabIndex={0} aria-label="야구 기초 이미지 목록">
          <div id="basicsGrid" className="basics-grid">
            {basics.map((item) => (
              <article className="basic-card" key={item.title}>
                <img src={item.src} alt={`${item.title} 설명 이미지`} loading="lazy" />
                <h3>{item.title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
}
