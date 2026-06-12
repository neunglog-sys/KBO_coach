import { FormEvent, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

// iOS 전용 미니 플러그인 — 음성인식 후 오디오 세션을 재생 모드로 복원 (TTS 소리 작아짐 방지)
const AudioSession = registerPlugin<{ toPlayback(): Promise<void> }>("AudioSession");
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { apiUrl } from "../api";
import { saveChat } from "../db";
import Character3D from "./Character3D";
import PetModal from "./PetModal";
import { clearMouth, setActiveSyllablePhase, setActiveViseme } from "../lipSync";
import AttendanceCheckIn from "./AttendanceCheckIn";
import { MyRecordsView } from "./MyRecordsView";
import SettingsView from "./SettingsView";
import { StadiumPage } from "./StadiumPage";
import { TeamChatView } from "./TeamChatView";
import { TopMenu, type TopMenuTarget } from "./TopMenu";
import { WeatherFx, type WeatherCondition } from "./WeatherFx";
import "./MainViewV2.css";

// 인사말 감지용 (안녕/안뇽/하이/헬로/hi/hello/hey/반가/반갑). 소문자로 매칭.
const GREET_RE = /(안녕|안뇽|하이|헬로|hello|\bhi\b|\bhey\b|반가|반갑)/;
// 걷기/뛰기 감지용 — 답변/질문에 이 단어가 있으면 캐릭터가 잠깐 움직인다(평소엔 멈춤).
const RUN_RE = /(도루|걷다|걷는|걷고|걷자|걸어|걸으|뛴다|뛰어|뛰는|뛰자|뛰며|달린다|달려|달리|달릴|질주|내달)/;
// 던지기 감지용 — 답변/질문에 이 단어가 있으면 캐릭터가 던지기 모션을 1회 재생한다.
const THROW_RE = /(던지다|던져|던지는|던지고|던질|던졌|투구|피칭|송구|throw|pitch)/i;

// 음성(TTS)에서 키워드가 "발음되는 순간"에 모션을 발동하기 위한 큐.
// at = 원본 텍스트에서 그 키워드가 다 읽힌 글자 위치(=시작+길이). 재생 중 발음된 글자 수가
// 이 값을 넘으면 해당 모션을 1회 발동한다. (텍스트 등장 시점이 아니라 음성 타이밍 기준)
type MotionKind = "greet" | "run" | "throw";
function buildMotionCues(text: string): Array<{ at: number; kind: MotionKind }> {
  const cues: Array<{ at: number; kind: MotionKind }> = [];
  const lower = text.toLowerCase();
  const g = lower.match(GREET_RE);
  if (g && g.index != null) cues.push({ at: g.index + g[0].length, kind: "greet" });
  const r = text.match(RUN_RE);
  if (r && r.index != null) cues.push({ at: r.index + r[0].length, kind: "run" });
  const t = text.match(THROW_RE);
  if (t && t.index != null) cues.push({ at: t.index + t[0].length, kind: "throw" });
  return cues;
}

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

// 응원팀별 보내기 버튼 색상. 응원팀이 없으면 기본 주황색(SEND_COLOR_DEFAULT)을 쓴다.
const SEND_COLOR_DEFAULT = "#ff7a18";
const TEAM_SEND_COLOR: Record<string, string> = {
  OB: "#131230",
  LT: "#041E42",
  SS: "#074CA1",
  SK: "#CE0E2D",
  LG: "#C30452",
  NC: "#315288",
  WO: "#7B0F1F",
  KT: "#2B2B2B",
  HT: "#C8102E",
  HH: "#FA5C1E",
};

interface MainViewV2Props {
  authToken: string;
  favTeamCode?: string;
  nickname?: string;
  buddyNickname?: string;
  notificationEnabled: boolean;
  onNotificationEnabledChange: (enabled: boolean) => void;
  onNicknameChange?: (nickname: string) => void;
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

// 보내기(전송) 버튼 아이콘 — 위쪽 화살표. stroke=currentColor라 감싼 버튼의 color를 따른다.
function SendArrowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 19V5" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      <path
        d="M6.5 10.5L12 5L17.5 10.5"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 일시정지(음성 정지) 버튼 아이콘. fill=currentColor라 감싼 버튼의 color를 따른다.
function PauseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="5" width="3.8" height="14" rx="1.9" fill="currentColor" />
      <rect x="13.2" y="5" width="3.8" height="14" rx="1.9" fill="currentColor" />
    </svg>
  );
}

// 음성 입력 버튼 아이콘(마이크 대신 쓰는 음성 웨이브 모양).
// fill=currentColor라 감싼 버튼의 color를 그대로 따른다(평소 남색 / 듣는 중 흰색).
function VoiceWaveIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="9" width="2.4" height="6" rx="1.2" fill="currentColor" />
      <rect x="8.5" y="6" width="2.4" height="12" rx="1.2" fill="currentColor" />
      <rect x="13" y="10" width="2.4" height="4" rx="1.2" fill="currentColor" />
      <rect x="17.5" y="7.5" width="2.4" height="9" rx="1.2" fill="currentColor" />
    </svg>
  );
}

export function MainViewV2({
  authToken,
  favTeamCode,
  nickname,
  buddyNickname,
  notificationEnabled,
  onNotificationEnabledChange,
  onNicknameChange,
  onFavTeamChange,
  onBuddyNicknameChange,
  onLogout,
}: MainViewV2Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, type: "bot", text: "야구공: 무엇을 도와줄까?" },
  ]);
  const [input, setInput] = useState("");
  // 응원팀별 보내기 버튼 색상(응원팀 없으면 기본 주황). 그림자도 같은 색의 반투명으로 맞춘다.
  const sendColor = TEAM_SEND_COLOR[favTeamCode ?? ""] ?? SEND_COLOR_DEFAULT;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  // 입력창 포커스(키보드 올라옴) 여부 → 오른쪽 버튼을 마이크↔보내기로 토글
  const [inputFocused, setInputFocused] = useState(false);
  // 채팅 시트 접힘 여부 — 손잡이를 아래로 끌면 메시지 영역을 접어 캐릭터를 더 보이게 한다.
  const [chatCollapsed, setChatCollapsed] = useState(false);
  // 손가락 드래그로 조절한 채팅 로그 최대 높이(px). null이면 기본 CSS(--stage-chat-limit) 사용.
  const [chatHeight, setChatHeight] = useState<number | null>(null);
  // 드래그 중에는 높이 transition을 꺼 손가락에 즉시 따라오게 한다.
  const [isResizingChat, setIsResizingChat] = useState(false);
  // 값이 증가할 때마다 캐릭터가 손 흔들기(인사) 모션을 1회 재생.
  const [greetSignal, setGreetSignal] = useState(0);
  // 값이 증가할 때마다 캐릭터가 잠깐 뛰는(빠른 걷기) 모션을 재생.
  const [runSignal, setRunSignal] = useState(0);
  // 값이 증가할 때마다 캐릭터가 던지기 모션을 1회 재생.
  const [throwSignal, setThrowSignal] = useState(0);
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
    fetch(apiUrl("/chat/warmup"), { method: "POST" }).catch(() => { });
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
      let code = favTeamCode || localStorage.getItem("myTeamCode");
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
  }, [authToken, favTeamCode]);

  const chatLogRef = useRef<HTMLDivElement | null>(null);
  // 사용자가 지금 맨 아래에 붙어 있는지 여부. 스크롤할 때마다 갱신한다.
  // 스트리밍(봇 글자 갱신) 중에는 true일 때만 따라 내린다(위로 읽는 중이면 유지).
  const pinnedToBottomRef = useRef(true);
  // 직전 렌더의 메시지 개수 — 새 말풍선 추가(턴 시작)와 스트리밍 글자 갱신을 구분한다.
  const prevMsgCountRef = useRef(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // 네이티브 음성인식 상태 (앱 전용 — 마지막 인식 텍스트와 활성 여부)
  const nativeSttLastRef = useRef("");
  const nativeSttActiveRef = useRef(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  // Web Audio 스트리밍 재생 정지 핸들 — stopSpeaking이 즉시 멈추도록.
  const audioStopRef = useRef<(() => void) | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const overlayCloseTimerRef = useRef<number | null>(null);
  // 발화 취소 토큰: stopSpeaking 시 증가시켜, 진행 중이거나 곧 시작될 폴백 음성도 무효화한다.
  const speakTokenRef = useRef(0);
  // 답변 텍스트에서 키워드를 미리 탐지해 둔 "대기 중인 모션" 플래그.
  // 텍스트 출력 시점이 아니라 TTS(음성)가 실제로 시작될 때 발동시키기 위해 ref로 보관한다.
  const pendingGreetRef = useRef(false);
  const pendingRunRef = useRef(false);
  const pendingThrowRef = useRef(false);
  // isSpeaking false→true 전환(=TTS 시작)을 감지하기 위한 직전 값.
  const prevSpeakingRef = useRef(false);
  // 음성인식 리스너는 mount 때 1회 바인딩되므로, 최신 submitQuestion(=최신 favTeamCode)을
  // ref로 참조한다. 안 그러면 음성 질문이 mount 시점의 옛 응원팀으로 전송됨(팀 변경 무시).
  const submitQuestionRef = useRef<(raw: string) => void>(() => { });
  // 채팅 시트 / 캐릭터 DOM 참조 — 드래그 리사이즈 시 최대 높이(발 밑) 계산에 사용.
  const chatSectionRef = useRef<HTMLElement | null>(null);
  const characterRef = useRef<HTMLDivElement | null>(null);
  // 손잡이 드래그 상태: 시작 Y/높이, 직전 높이, 실제 이동 여부(탭 구분용).
  const chatResizeRef = useRef<{ startY: number; startHeight: number; lastHeight: number; moved: boolean } | null>(null);

  const supportsSTT =
    Capacitor.isNativePlatform() ||   // 앱은 네이티브 음성인식 플러그인 사용 (iOS 웹뷰는 Web Speech API 미지원)
    (typeof window !== "undefined" &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));

  // 사용자의 스크롤을 추적해 "맨 아래에 붙어 있는지"를 갱신한다.
  // 위로 올리면 pinned=false가 되어 자동 스크롤이 멈추고, 다시 맨 아래로 내려오면 pinned=true.
  useEffect(() => {
    const el = chatLogRef.current;
    if (!el) return;
    const onScroll = () => {
      pinnedToBottomRef.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // 자동 스크롤 규칙:
  //  - 새 말풍선이 추가되면(user/bot 새 채팅) 위로 올려놨어도 무조건 맨 아래로 내린다.
  //  - 기존 봇 말풍선의 글자만 늘어나는 스트리밍 중에는 맨 아래 붙어 있을 때만 따라간다(읽는 중 방해 X).
  // 즉시 이동(scrollTop 직접 설정)으로 애니메이션 충돌·버벅임을 피한다.
  useEffect(() => {
    const el = chatLogRef.current;
    if (!el) return;
    const isNewMessage = messages.length > prevMsgCountRef.current;
    prevMsgCountRef.current = messages.length;
    if (isNewMessage || pinnedToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      pinnedToBottomRef.current = true;
    }
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
      if (transcript) void submitQuestionRef.current(transcript);   // 최신 submitQuestion 사용
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

  // 뒤로가기 = 열린 화면 닫고 홈으로. 웹뷰 히스토리(스냅샷 전환)를 쓰지 않고
  // 엣지 스와이프를 직접 감지 — 홈에서 스와이프해도 유령 화면 전환이 없다.
  const anyOverlayOpenRef = useRef(false);

  useEffect(() => {
    const closeAll = () => {
      stopSpeaking();
      setClosingOverlay(null);
      setIsAttendanceOpen(false);
      setIsStadiumPageOpen(false);
      setIsSettingsOpen(false);
      setShowRecords(false);
      setShowChat(false);
    };

    // iOS: 화면 왼쪽 끝(28px)에서 시작한 오른쪽 스와이프 감지
    let startX = -1;
    let startY = -1;
    const onStart = (e: TouchEvent) => {
      const t0 = e.touches[0];
      startX = t0 && t0.clientX <= 28 ? t0.clientX : -1;
      startY = t0?.clientY ?? -1;
    };
    const onMove = (e: TouchEvent) => {
      if (startX < 0 || !anyOverlayOpenRef.current) return;
      const t0 = e.touches[0];
      if (!t0) return;
      if (t0.clientX - startX > 70 && Math.abs(t0.clientY - startY) < 60) {
        startX = -1;
        closeAll();
      }
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });

    // 안드로이드: 하드웨어 뒤로가기 버튼
    let removeBack: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void import("@capacitor/app").then(({ App: CapApp }) => {
        const h = CapApp.addListener("backButton", () => {
          if (anyOverlayOpenRef.current) closeAll();
          else void CapApp.minimizeApp();
        });
        removeBack = () => void h.then((x) => x.remove());
      });
    }
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      removeBack?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 오디오 재생 + 립싱크/자막 공통 루프. 스트리밍·블로킹 둘 다 씀.
  // visemes는 '미스케일'(Azure 타임라인). 재생 길이(effDurMs)가 잡히면 scale로 보정한다.
  //   - 스트리밍: 재생 중 audio.duration이 Infinity → azEndMs/estMs로 추정, 끝나면 실측으로 정확.
  //   - 블로킹: 서버가 이미 el길이로 스케일 → azEndMs=마지막offset이라 scale≈1(이중스케일 X).
  function playTtsAudio(
    audio: HTMLAudioElement,
    text: string,
    visemes: Array<{ offset: number; id: number }>,
    azEndMs: number,
    estMs: number,
    onReveal?: (revealed: string) => void,
    boundaries?: Array<{ offset: number; textOffset: number; length: number }>,
  ): Promise<{ ok: boolean; started: boolean }> {
    ttsAudioRef.current = audio;
    // 키워드가 실제로 발음되는 순간 모션 발동(단어 경계 offset 기준). 발동된 종류는 시작 effect가
    // 중복 발동하지 않도록 pending 플래그를 미리 끈다(질문에만 있던 키워드는 그대로 둬 시작 시 폴백).
    const cues = buildMotionCues(text);
    const fired = new Set<MotionKind>();
    const fireCuesUpTo = (spokenChars: number) => {
      for (const c of cues) {
        if (!fired.has(c.kind) && spokenChars >= c.at) {
          fired.add(c.kind);
          if (c.kind === "run") setRunSignal((n) => n + 1);
          else if (c.kind === "throw") setThrowSignal((n) => n + 1);
          else setGreetSignal((n) => n + 1);
        }
      }
    };
    const bnds = boundaries ?? [];
    return new Promise((resolve) => {
      let settled = false;
      let started = false;
      let lipRaf = 0;
      const clamp = (v: number) => Math.min(2.5, Math.max(0.5, v));

      const drive = () => {
        const tMs = audio.currentTime * 1000;
        const dur = audio.duration;
        const effDurMs =
          isFinite(dur) && dur > 0 ? dur * 1000 : azEndMs > 0 ? azEndMs : estMs;
        const scale = azEndMs > 0 && effDurMs > 0 ? clamp(effDurMs / azEndMs) : 1;
        let activeId = 0;
        for (let i = 0; i < visemes.length; i++) {
          if (visemes[i].offset * scale <= tMs) activeId = visemes[i].id;
          else break;
        }
        setActiveViseme(activeId);
        // 자막은 재생 중인 실제 오디오의 진행률에 묶는다(시간비례).
        if (onReveal && effDurMs > 0) {
          const ratio = Math.min(1, tMs / effDurMs);
          const revealed = text.slice(0, Math.ceil(text.length * ratio));
          if (revealed) onReveal(revealed);
        }
        // 모션 발동: 단어 경계가 있으면 '지금까지 발음된 단어의 끝 글자수'로 정확히, 없으면 시간비례로.
        if (cues.length) {
          let spoken: number;
          if (bnds.length) {
            spoken = 0;
            for (const b of bnds) {
              if (b.offset * scale <= tMs) spoken = b.textOffset + b.length;
              else break;
            }
          } else {
            spoken = effDurMs > 0 ? Math.ceil(text.length * Math.min(1, tMs / effDurMs)) : 0;
          }
          fireCuesUpTo(spoken);
        }
        lipRaf = requestAnimationFrame(drive);
      };

      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        cancelAnimationFrame(lipRaf);
        clearMouth();
        setIsSpeaking(false);
        if (ttsAudioRef.current === audio) ttsAudioRef.current = null;
        if (ok && onReveal) onReveal(text);   // 끝나면 전체 텍스트 보장
        resolve({ ok, started });
      };

      audio.onplay = () => {
        started = true;
        // 이 경로가 단어 타이밍으로 직접 발동하므로, 해당 종류는 시작 effect의 폴백 발동을 끈다.
        for (const c of cues) {
          if (c.kind === "run") pendingRunRef.current = false;
          else if (c.kind === "throw") pendingThrowRef.current = false;
          else pendingGreetRef.current = false;
        }
        setIsSpeaking(true);
        lipRaf = requestAnimationFrame(drive);
      };
      audio.onended = () => finish(true);
      audio.onerror = () => finish(false);
      audio.play().catch(() => finish(false));
    });
  }

  // 타임스탬프 스트리밍 재생(구단 보이스) — Web Audio API로 PCM 청크를 gapless 스케줄 재생.
  // MSE(mp3)는 안드 WebView에서 안 먹혀서 Web Audio+PCM으로. ElevenLabs 글자 타임스탬프
  // (c=글자, t=시작초)로 자막·입모양을 '실제 음성' 기준 정확히 맞춘다.
  //   - 자막: 발음된 글자 수/정제길이(cleanLen) 비율을 원본 텍스트에 적용(원본 표시 유지).
  //   - 입모양: 지금 발음 중인 글자의 모음으로 setActiveSyllable.
  // Web Audio 미지원/빈 응답이면 {ok:false, started:false} → 호출부가 블로킹으로 폴백.
  function playWebAudioStream(
    streamUrl: string,
    text: string,
    cleanLen: number,
    sampleRate: number,
    onReveal?: (revealed: string) => void,
    isCancelled?: () => boolean,
  ): Promise<{ ok: boolean; started: boolean }> {
    return new Promise((resolve) => {
      let ctx = audioCtxRef.current;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) {
          resolve({ ok: false, started: false });   // Web Audio 미지원 → 블로킹 폴백
          return;
        }
        if (!ctx) {
          ctx = new AC();
          audioCtxRef.current = ctx;
        }
      } catch {
        resolve({ ok: false, started: false });
        return;
      }
      const audioCtx = ctx;
      void audioCtx.resume().catch(() => { });   // 자동재생 정책: 제스처 후 재개

      // 키워드가 발음되는 순간 모션 발동(글자 타임스탬프 기준).
      const cues = buildMotionCues(text);
      const fired = new Set<MotionKind>();
      const fireCuesUpTo = (spokenChars: number) => {
        for (const c of cues) {
          if (!fired.has(c.kind) && spokenChars >= c.at) {
            fired.add(c.kind);
            if (c.kind === "run") setRunSignal((n) => n + 1);
            else if (c.kind === "throw") setThrowSignal((n) => n + 1);
            else setGreetSignal((n) => n + 1);
          }
        }
      };

      const chars: string[] = [];
      const starts: number[] = [];
      const sources: AudioBufferSourceNode[] = [];
      let leftover = new Uint8Array(0);   // 홀수바이트 경계 이월
      let originTime = 0;                  // 재생 시작 ctx 시각(playbackTime 기준)
      let nextTime = 0;                    // 다음 청크 스케줄 시각
      let endTime = 0;                     // 마지막 청크 끝나는 시각
      let streamDone = false;
      let started = false;
      let settled = false;
      let raf = 0;
      const ac = new AbortController();

      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true;
        cancelAnimationFrame(raf);
        ac.abort();
        for (const s of sources) {
          try {
            s.onended = null;
            s.stop();
          } catch {
            /* 이미 끝남 */
          }
        }
        audioStopRef.current = null;
        clearMouth();
        setIsSpeaking(false);
        if (ok && onReveal) onReveal(text);   // 끝나면 전체 텍스트 보장
        resolve({ ok, started });
      };
      audioStopRef.current = () => finish(started);   // stopSpeaking이 즉시 호출

      const drive = () => {
        if (isCancelled?.()) {
          finish(started);
          return;
        }
        const tt = started ? Math.max(0, audioCtx.currentTime - originTime) : 0;
        let spoken = 0;
        for (let i = 0; i < starts.length; i++) {
          if (starts[i] <= tt) spoken = i + 1;
          else break;
        }
        // viseme식 입모양: 지금 음절의 진행률(phase)로 초성→모음→받침 자음까지 반영.
        if (spoken > 0) {
          const ci = spoken - 1;
          const st = starts[ci];
          const en = ci + 1 < starts.length ? starts[ci + 1] : st + 0.18; // 마지막 글자는 길이 추정
          const phase = Math.min(1, Math.max(0, (tt - st) / Math.max(0.06, en - st)));
          setActiveSyllablePhase(chars[ci], phase);
        } else {
          setActiveSyllablePhase("", 0);
        }
        if (cleanLen > 0) {
          const frac = Math.min(1, spoken / cleanLen);
          const spokenChars = Math.ceil(text.length * frac); // clean→원본 텍스트 글자수 환산
          if (cues.length) fireCuesUpTo(spokenChars);
          if (onReveal) {
            const revealed = text.slice(0, spokenChars);
            if (revealed) onReveal(revealed);
          }
        }
        // 종료: 스트림 다 받았고 재생이 마지막 청크 끝을 지남
        if (streamDone && started && audioCtx.currentTime >= endTime - 0.02) {
          finish(true);
          return;
        }
        raf = requestAnimationFrame(drive);
      };

      const schedulePcm = (incoming: Uint8Array) => {
        let data = incoming;
        if (leftover.length) {   // 이전 홀수바이트와 합쳐 int16 경계 정렬
          const merged = new Uint8Array(leftover.length + incoming.length);
          merged.set(leftover, 0);
          merged.set(incoming, leftover.length);
          data = merged;
          leftover = new Uint8Array(0);
        }
        const usable = data.length - (data.length % 2);
        if (usable < data.length) leftover = data.slice(usable);
        if (usable <= 0) return;
        const n = usable / 2;
        const dv = new DataView(data.buffer, data.byteOffset, usable);
        const buf = audioCtx.createBuffer(1, n, sampleRate);
        const chData = buf.getChannelData(0);
        for (let i = 0; i < n; i++) chData[i] = dv.getInt16(i * 2, true) / 32768;
        const src = audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtx.destination);
        if (!started) {
          started = true;
          // 이 경로가 단어 타이밍으로 직접 발동 → 해당 종류는 시작 effect 폴백 발동을 끈다.
          for (const c of cues) {
            if (c.kind === "run") pendingRunRef.current = false;
            else if (c.kind === "throw") pendingThrowRef.current = false;
            else pendingGreetRef.current = false;
          }
          setIsSpeaking(true);
          originTime = audioCtx.currentTime + 0.08;   // 약간의 리드(과거 스케줄 방지)
          nextTime = originTime;
          raf = requestAnimationFrame(drive);
        }
        const startAt = Math.max(nextTime, audioCtx.currentTime);
        src.start(startAt);
        nextTime = startAt + buf.duration;
        endTime = nextTime;
        sources.push(src);
      };

      (async () => {
        try {
          const resp = await fetch(streamUrl, { signal: ac.signal });
          if (!resp.ok || !resp.body) {
            finish(false);
            return;
          }
          const reader = resp.body.getReader();
          const dec = new TextDecoder();
          let acc = "";
          for (; ;) {
            const { done, value } = await reader.read();
            if (done) break;
            acc += dec.decode(value, { stream: true });
            let nl: number;
            while ((nl = acc.indexOf("\n")) >= 0) {
              const line = acc.slice(0, nl).trim();
              acc = acc.slice(nl + 1);
              if (!line) continue;
              const obj = JSON.parse(line) as { a?: string; c?: string[]; t?: number[] };
              if (Array.isArray(obj.c) && Array.isArray(obj.t)) {
                for (let i = 0; i < obj.c.length; i++) {
                  chars.push(obj.c[i]);
                  starts.push(obj.t[i]);
                }
              }
              if (obj.a) {
                const bin = atob(obj.a);
                const u8 = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
                schedulePcm(u8);
              }
            }
          }
          streamDone = true;
          if (!started) finish(false);   // 빈 응답(합성 실패) → 폴백. started면 drive가 종료 처리.
        } catch {
          if (!started) finish(false);   // 시작 전 끊김 → 폴백
        }
      })();
    });
  }

  async function speakWithAzure(
    text: string,
    onReveal?: (revealed: string) => void,
    isCancelled?: () => boolean,
  ): Promise<boolean> {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    audioStopRef.current?.();   // 이전 Web Audio 스트림 정지

    // 1) 타임스탬프 스트리밍(구단 보이스) — 통문장 1콜 그대로(사투리 유지), 첫 소리까지 대기 최소화.
    //    prepare: 토큰+정제길이 / stream: PCM+글자타임스탬프(NDJSON)를 Web Audio로 progressive 재생.
    try {
      const pr = await fetch(apiUrl("/tts/prepare"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, team_code: favTeamCode || null }),
      });
      if (pr.ok) {
        const pd = await pr.json();
        if (isCancelled?.()) return true;
        if (pd.token && !pd.fallback) {
          const url = apiUrl(`/tts/stream?token=${encodeURIComponent(pd.token)}`);
          const r = await playWebAudioStream(
            url, text, pd.cleanLen || text.length, pd.sampleRate || 24000, onReveal, isCancelled,
          );
          // 정상종료 or 일부라도 재생됨 → 디바이스 음성으로 중복 재생하지 않음.
          if (r.ok || r.started) return true;
          // 재생 전 실패(빈 응답·Web Audio 미지원 등)만 → 아래 블로킹으로 폴백.
        }
      }
    } catch (err) {
      console.warn("[TTS] stream prepare failed; trying blocking", err);
    }

    // 2) 블로킹 경로 — 표준어팀(Azure 단독) 또는 스트리밍 실패 시(ElevenLabs 통째 base64).
    try {
      if (isCancelled?.()) return true;
      const resp = await fetch(apiUrl("/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, team_code: favTeamCode || null }),
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      if (!data.audio) return false;
      if (isCancelled?.()) return true;
      const visemes: Array<{ offset: number; id: number }> = Array.isArray(data.visemes)
        ? data.visemes
        : [];
      const azEndMs = visemes.length ? visemes[visemes.length - 1].offset : 0;
      const boundaries: Array<{ offset: number; textOffset: number; length: number }> =
        Array.isArray(data.boundaries) ? data.boundaries : [];
      const audio = new Audio(`data:${data.mime || "audio/mpeg"};base64,${data.audio}`);
      const r = await playTtsAudio(audio, text, visemes, azEndMs, 0, onReveal, boundaries);
      return r.ok || r.started;
    } catch (err) {
      console.warn("[TTS] blocking failed; falling back to device speech", err);
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
          reader.cancel().catch(() => { });
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

    setChatCollapsed(false); // 메시지 보내면 접혀있어도 펼쳐서 답변을 보이게

    // Web Audio 잠금 해제 — 제스처(전송) 시점에 AudioContext 생성·재개해 두면
    // 안드 WebView 자동재생 정책으로 스트리밍 음성이 suspended로 멈추는 것 방지.
    try {
      const AC = window.AudioContext
        || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        if (!audioCtxRef.current) audioCtxRef.current = new AC();
        void audioCtxRef.current.resume().catch(() => { });
      }
    } catch {
      /* Web Audio 미지원 — 블로킹 폴백이 받음 */
    }

    const baseId = Date.now();
    const botId = baseId + 1;
    setMessages((prev) => [...prev, { id: baseId, type: "user", text: question }]);
    setInput("");
    setMessages((prev) => [...prev, { id: botId, type: "bot", text: "…" }]); // 답변 준비 중 표시
    const setBot = (text: string) =>
      setMessages((prev) => prev.map((m) => (m.id === botId ? { ...m, text } : m)));

    // 로컬 SQLite에 대화 이력 저장(기기 보관, 서버 미전송) — 개인화 퀴즈 출제 등에 사용
    void saveChat("frontend-demo", "user", question, favTeamCode || "").catch(() => {});

    // 통문장 — 답변 전체를 한 번에 합성해야 ElevenLabs가 문맥을 보고 사투리 억양을 살린다.
    // (청킹은 문장마다 따로 합성돼 억양이 평평해져 표준어처럼 들림 → 사용 안 함)
    const answer = await fetchAnswer(question);
    void saveChat("frontend-demo", "bot", answer, favTeamCode || "").catch(() => {});
    // 키워드 탐지는 여기서 하되, 실제 모션 발동은 TTS(음성)가 시작될 때로 미룬다.
    // (텍스트가 화면에 나오는 시점이 아니라 캐릭터가 "말하기 시작하는" 순간에 맞춰 움직이도록)
    pendingGreetRef.current = GREET_RE.test(answer) || GREET_RE.test(question);
    pendingRunRef.current = RUN_RE.test(answer) || RUN_RE.test(question);
    pendingThrowRef.current = THROW_RE.test(answer) || THROW_RE.test(question);
    await speakAnswer(answer, setBot);
    setBot(answer);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(input);
  }

  // 음성인식 리스너가 항상 최신 submitQuestion(최신 favTeamCode)을 쓰도록 매 렌더마다 갱신.
  useEffect(() => {
    submitQuestionRef.current = submitQuestion;
  });

  // TTS 시작 순간(isSpeaking false→true)에 대기 중이던 모션을 발동한다.
  // 키워드는 submitQuestion에서 미리 탐지해 pending 플래그에 담아두고, 여기서 음성과 타이밍을 맞춘다.
  // 플래그는 발동 즉시 소비(false) → 발화 중 isSpeaking이 여러 번 토글돼도 답변당 1회만 재생.
  useEffect(() => {
    if (isSpeaking && !prevSpeakingRef.current) {
      if (pendingGreetRef.current) {
        pendingGreetRef.current = false;
        setGreetSignal((n) => n + 1);
      }
      if (pendingRunRef.current) {
        pendingRunRef.current = false;
        setRunSignal((n) => n + 1);
      }
      if (pendingThrowRef.current) {
        pendingThrowRef.current = false;
        setThrowSignal((n) => n + 1);
      }
    }
    prevSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // 모든 TTS(오디오 엘리먼트 / 네이티브 / 웹 음성)를 즉시 중단 + 입모양 정리.
  function stopSpeaking() {
    speakTokenRef.current++; // 진행 중/예정된 발화를 무효화 (폴백 음성 race 방지)
    audioStopRef.current?.(); // Web Audio 스트리밍 재생 즉시 중단
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = "";
      ttsAudioRef.current = null;
    }
    TextToSpeech.stop().catch(() => { }); // 네이티브(Capacitor) 음성 중단
    window.speechSynthesis?.cancel();    // 웹 음성 중단
    clearMouth();
    setIsSpeaking(false);
  }

  async function finishNativeSTT(submit: boolean) {
    const { SpeechRecognition: NativeSTT } = await import("@capgo/capacitor-speech-recognition");
    nativeSttActiveRef.current = false;
    await NativeSTT.stop().catch(() => { });
    await NativeSTT.removeAllListeners().catch(() => { });
    if (Capacitor.getPlatform() === "ios") {
      await AudioSession.toPlayback().catch(() => { });   // 수화기 모드 → 스피커 재생 복원
    }
    setIsListening(false);
    const transcript = nativeSttLastRef.current.trim();
    nativeSttLastRef.current = "";
    if (submit && transcript) void submitQuestionRef.current(transcript);
  }

  async function startNativeSTT() {
    try {
      const { SpeechRecognition: NativeSTT } = await import("@capgo/capacitor-speech-recognition");
      const { available } = await NativeSTT.available();
      if (!available) return;
      const perm = await NativeSTT.requestPermissions();
      if (perm.speechRecognition !== "granted") return;

      nativeSttLastRef.current = "";
      await NativeSTT.removeAllListeners().catch(() => { });
      await NativeSTT.addListener("partialResults", (data: { matches?: string[] }) => {
        const t = data.matches?.[0];
        if (t) nativeSttLastRef.current = t;
      });
      // 안드로이드는 침묵 시 인식기가 스스로 종료 → 그 시점에 결과 제출
      await NativeSTT.addListener("listeningState", (data: { status?: string }) => {
        if (data.status === "stopped" && nativeSttActiveRef.current) {
          void finishNativeSTT(true);
        }
      });
      nativeSttActiveRef.current = true;
      setIsListening(true);
      await NativeSTT.start({ language: "ko-KR", maxResults: 1, partialResults: true, popup: false });
    } catch {
      nativeSttActiveRef.current = false;
      setIsListening(false);
    }
  }

  function toggleMic() {
    // 앱(iOS·안드): 네이티브 음성인식 — 다시 누르면 지금까지 들은 내용 제출
    if (Capacitor.isNativePlatform()) {
      if (isListening) {
        void finishNativeSTT(true);
        return;
      }
      stopSpeaking();
      void startNativeSTT();
      return;
    }

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

  // 채팅 로그가 커질 수 있는 최대 높이(px) — 시트 윗변이 캐릭터 발 밑(캔버스 하단)을 넘지 않도록.
  // (시트 전체높이 = 채팅로그 + 손잡이/입력바/패딩 'chrome'. 발 밑까지 남은 공간에서 chrome을 뺀다.)
  const computeMaxChatHeight = () => {
    const section = chatSectionRef.current;
    const log = chatLogRef.current;
    if (!section || !log) return Number.POSITIVE_INFINITY;
    const chrome = section.offsetHeight - log.offsetHeight; // 채팅로그 외 영역 높이
    const feetY = characterRef.current?.getBoundingClientRect().bottom ?? 0; // 캐릭터 발 밑 라인
    const gap = 8; // 발 밑과 시트 사이 약간의 여백
    return Math.max(80, window.innerHeight - feetY - gap - chrome);
  };

  // 손잡이 드래그 시작: 현재 높이와 시작 좌표 기록.
  const handleChatHandleDown = (e: ReactPointerEvent) => {
    const startHeight = chatCollapsed ? 0 : (chatLogRef.current?.offsetHeight ?? 0);
    chatResizeRef.current = { startY: e.clientY, startHeight, lastHeight: startHeight, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsResizingChat(true);
  };

  // 드래그 이동: 위로 끌면 커지고 아래로 끌면 작아진다. 발 밑(최대)까지로 제한.
  const handleChatHandleMove = (e: ReactPointerEvent) => {
    const d = chatResizeRef.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 3) d.moved = true;
    const maxH = computeMaxChatHeight();
    const next = Math.min(maxH, Math.max(0, d.startHeight - dy));
    d.lastHeight = next;
    if (chatCollapsed && next > 8) setChatCollapsed(false);
    setChatHeight(next);
  };

  // 드래그 끝: 이동 없으면 탭으로 보고 접기/펼치기 토글. 아주 작게 줄였으면 접는다.
  const handleChatHandleUp = () => {
    const d = chatResizeRef.current;
    chatResizeRef.current = null;
    setIsResizingChat(false);
    if (!d) return;
    if (!d.moved) {
      setChatCollapsed((v) => !v);
      return;
    }
    if (d.lastHeight < 40) {
      setChatCollapsed(true);
      setChatHeight(null); // 접을 땐 기본 높이로 리셋(다시 펼치면 기본 크기부터)
    }
  };

  // 메인이 다른 화면에 가려져 있으면 배경 애니메이션을 멈춰 GPU 부하를 줄인다
  // (iOS 스와이프 복귀 시 전환 렉 완화 — 재개 시 멈춘 지점부터 이어짐)
  const stageHidden =
    isAttendanceOpen || isStadiumPageOpen || isSettingsOpen || showRecords || showChat;
  anyOverlayOpenRef.current = stageHidden;

  return (
    <section className={`stage-view ${stageHidden ? "stage-paused" : ""}`.trim()} aria-label="메인 화면">
      <div className="stage-bg" aria-hidden="true">
        {/* 하늘 레이어 (뒤, 느리게) — 같은 이미지 2번이라 끊김 없이 루프 */}
        <div className="stage-bg-track stage-bg-sky">
          <img className="stage-bg-image" src="/img/sky.png" alt="" />
          <img className="stage-bg-image" src="/img/sky.png" alt="" />
        </div>
        {/* 경기장 레이어 (앞, 빠르게) — 같은 이미지 2장으로 끊김 없이 루프(-50% 이동 시 두 번째 장이 첫 장 위치로) */}
        <div className="stage-bg-track stage-bg-ground">
          <img className="stage-bg-image" src="/img/background1.2.png" alt="" />
          <img className="stage-bg-image" src="/img/background1.2.png" alt="" />
        </div>
      </div>
      <div className="stage-white-fade" aria-hidden="true" />
      <div className="stage-nav-overlay" aria-hidden="true" />

      <TopMenu active="home" className="stage-nav" onNavigate={handleNav} />

      <div className="stage-character" aria-hidden="false" ref={characterRef}>
        <Character3D isSpeaking={isSpeaking} greetSignal={greetSignal} runSignal={runSignal} throwSignal={throwSignal} className="stage-character-canvas" />
      </div>

      <WeatherFx condition={weatherCondition} />

      <section
        ref={chatSectionRef}
        className={`stage-chat ${chatCollapsed ? "is-collapsed" : ""}`}
        aria-label="야구 코치 채팅"
      >
        {/* 손잡이: 드래그로 크기 조절(발 밑까지) / 탭이면 접기·펼치기 토글 */}
        <div
          className="stage-chat-handle"
          role="button"
          tabIndex={0}
          aria-label={chatCollapsed ? "채팅창 올리기" : "채팅창 크기 조절"}
          onPointerDown={handleChatHandleDown}
          onPointerMove={handleChatHandleMove}
          onPointerUp={handleChatHandleUp}
          onPointerCancel={handleChatHandleUp}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setChatCollapsed((v) => !v);
          }}
        >
          <span className="stage-chat-grip" aria-hidden="true" />
        </div>
        <div
          className="stage-chatlog"
          ref={chatLogRef}
          aria-live="polite"
          style={
            chatHeight != null
              ? { maxHeight: `${chatHeight}px`, transition: isResizingChat ? "none" : undefined }
              : undefined
          }
        >
          {messages.map((message) => (
            <div key={message.id} className={`stage-msg ${message.type}`}>
              {message.text}
            </div>
          ))}
        </div>

        <form className="stage-inputbar" onSubmit={handleSubmit}>
          {/* 왼쪽: 음성 일시정지 (항상) */}
          <button
            type="button"
            className="stage-stop"
            onClick={stopSpeaking}
            disabled={!isSpeaking}
            aria-label="음성 정지"
            title="음성 정지"
          >
            <PauseIcon />
          </button>

          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="텍스트 입력 창"
            aria-label="질문 입력"
          />

          {/* 오른쪽: 키보드 내려감 → 마이크 / 키보드 올라옴 → 보내기(↑) */}
          {inputFocused ? (
            <button
              type="submit"
              className="stage-send-arrow"
              aria-label="보내기"
              title="보내기"
              // 응원팀 색상으로 버튼/그림자 색을 덮어쓴다(8자리 hex의 끝 4d ≈ 30% 투명도).
              style={{ background: sendColor, boxShadow: `0 6px 14px ${sendColor}4d` }}
              // 버튼 탭 시 입력창 포커스(키보드)가 풀리지 않게 → 연속 전송 가능
              onMouseDown={(e) => e.preventDefault()}
            >
              <SendArrowIcon />
            </button>
          ) : (
            <button
              type="button"
              className={`stage-mic ${isListening ? "is-on" : ""}`}
              // 앱: 무전기 방식 — 누르는 동안 녹음, 떼면 자동 제출. 웹: 기존 토글.
              onClick={() => { if (!Capacitor.isNativePlatform()) toggleMic(); }}
              onPointerDown={() => {
                if (!Capacitor.isNativePlatform() || isListening) return;
                stopSpeaking();
                void startNativeSTT();
              }}
              onPointerUp={() => {
                if (Capacitor.isNativePlatform() && isListening) void finishNativeSTT(true);
              }}
              onPointerCancel={() => {
                if (Capacitor.isNativePlatform() && isListening) void finishNativeSTT(false);
              }}
              onContextMenu={(e) => e.preventDefault()}
              disabled={!supportsSTT}
              aria-pressed={isListening}
              aria-label={isListening ? "녹음 중 — 떼면 전송" : "누르고 말하기"}
              title={supportsSTT ? "누르고 있는 동안 녹음, 떼면 전송" : "이 환경은 음성 인식을 지원하지 않습니다"}
            >
              <VoiceWaveIcon />
            </button>
          )}
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
              onNotificationEnabledChange={onNotificationEnabledChange}
              onNicknameChange={onNicknameChange}
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
