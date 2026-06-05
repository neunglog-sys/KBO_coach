import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import { apiUrl } from "../api";
import { fallbackAnswers } from "../data/baseballBasics";
import { kboTeams } from "../data/kboTeams";
import Character3D from "./Character3D";
import { setActiveViseme, clearMouth } from "../lipSync";
// 3D(glb) 캐릭터 사용 중. Live2D로 되돌리려면 위 줄 주석 + 아래 줄 주석 해제 + JSX 교체.
// import CharacterLive2D from "./CharacterLive2D";
import AttendanceCheckIn from "./AttendanceCheckIn";

type MessageType = "bot" | "user";

interface Message {
  id: number;
  sender: string;
  text: string;
  type: MessageType;
}

interface StandingRow {
  순위?: number | string;
  팀명?: string;
  승?: number | string;
  패?: number | string;
  무?: number | string;
  승률?: number | string;
  게임차?: number | string;
}

interface GameRow {
  시간?: string;
  원정팀?: string;
  홈팀?: string;
  구장?: string;
  상태?: string;
}

interface DailySchedule {
  date: string;
  label: string;
  games: GameRow[];
}

interface GlossaryTerm {
  term?: string;
  abbr?: string;
  definition?: string;
}

interface StadiumGuide {
  team_code?: string;
  teamName: string;
  aliases: string[];
  name?: string;
  location?: string;
  parking?: string;
  subway?: string;
  food?: string;
  stadium_size?: string;
  seat_count?: number | string;
  features?: string;
  ktx_info?: string;
  taxi_info?: string;
  bus_info?: string;
  parking_tip?: string;
  restaurants?: string;
  tourism?: string;
  accommodations?: string;
  reservation_site?: string;
  reservation_tip?: string;
}

interface MainViewProps {
  authToken: string;
  onLogout: () => void;
}

const teamAliases: Record<string, string[]> = {
  doosan: ["두산", "베어스", "두산 베어스"],
  lotte: ["롯데", "자이언츠", "롯데 자이언츠"],
  samsung: ["삼성", "라이온즈", "삼성 라이온즈"],
  ssg: ["SSG", "랜더스", "SSG 랜더스"],
  lg: ["LG", "트윈스", "LG 트윈스"],
  nc: ["NC", "다이노스", "NC 다이노스"],
  kiwoom: ["키움", "히어로즈", "키움 히어로즈"],
  kt: ["KT", "위즈", "KT 위즈"],
  kia: ["KIA", "타이거즈", "KIA 타이거즈"],
  hanwha: ["한화", "이글스", "한화 이글스"],
};

const teamCodes: Record<string, string> = {
  doosan: "OB",
  lotte: "LT",
  samsung: "SS",
  ssg: "SK",
  lg: "LG",
  nc: "NC",
  kiwoom: "WO",
  kt: "KT",
  kia: "HT",
  hanwha: "HH",
};

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getScheduleDates() {
  const labels = ["오늘", "내일", "모레"];
  const today = new Date();

  return labels.map((label, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);

    return { date: formatDate(date), label };
  });
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function isPlaceholderAnswer(answer: string) {
  const normalized = normalizeText(answer);
  return (
    !answer.trim() ||
    answer.trim() === "..." ||
    normalized.includes("아직llm미연결") ||
    normalized.includes("페르소나·용어검색까지는동작") ||
    normalized.includes("llm_api_key") ||
    normalized.includes("knowledge_chunks")
  );
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
  const [isAttendanceOpen, setIsAttendanceOpen] = useState(false);
  const [attendanceCheckedToday, setAttendanceCheckedToday] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [messageId, setMessageId] = useState(2);
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [activeScheduleIndex, setActiveScheduleIndex] = useState(0);
  const [recordsStatus, setRecordsStatus] = useState("야구 기록을 불러오는 중입니다.");
  const [stadiumGuides, setStadiumGuides] = useState<StadiumGuide[]>([]);
  const [stadiumQuery, setStadiumQuery] = useState("");
  const [selectedStadiumCode, setSelectedStadiumCode] = useState(teamCodes[kboTeams[0].id]);
  const [stadiumStatus, setStadiumStatus] = useState("구장 안내를 불러오는 중입니다.");
  const [isFoodExpanded, setIsFoodExpanded] = useState(false);
  const chatLogRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Azure TTS 재생용 오디오 + viseme(입모양 타이밍) 보관 (추후 3D 입모양 립싱크에 사용)
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const visemeRef = useRef<Array<{ offset: number; id: number }>>([]);

  const supportsSpeechRecognition = useMemo(
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    [],
  );

  const selectedTeam = kboTeams.find((team) => team.id === selectedTeamId) ?? kboTeams[0];
  const selectedSchedule = schedules[activeScheduleIndex] ?? schedules[0];
  const selectedStadiumGuide =
    stadiumGuides.find((guide) => guide.team_code === selectedStadiumCode) ?? stadiumGuides[0];
  const selectedFoodInfo = useMemo(
    () => parseFoodInfo(selectedStadiumGuide?.food || selectedStadiumGuide?.restaurants),
    [selectedStadiumGuide],
  );

  useEffect(() => {
    let ignore = false;

    async function loadAttendanceStatus() {
      try {
        const response = await fetch("/attendance/status", {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { checked_today?: boolean };
        if (!ignore) {
          setAttendanceCheckedToday(Boolean(data.checked_today));
        }
      } catch {
        setAttendanceCheckedToday(false);
      }
    }

    loadAttendanceStatus();
    return () => {
      ignore = true;
    };
  }, [authToken]);

  function findStadiumGuide(query: string) {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return selectedStadiumGuide;

    return stadiumGuides.find((guide) =>
      [
        guide.team_code,
        guide.teamName,
        guide.name,
        guide.location,
        guide.parking,
        guide.subway,
        guide.food,
        guide.stadium_size,
        guide.features,
        guide.ktx_info,
        guide.taxi_info,
        guide.bus_info,
        guide.parking_tip,
        guide.restaurants,
        guide.tourism,
        guide.accommodations,
        ...guide.aliases,
      ].some((value) => value && normalizeText(String(value)).includes(normalizedQuery)),
    );
  }

  function handleStadiumSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const guide = findStadiumGuide(stadiumQuery);

    if (guide?.team_code) {
      setSelectedStadiumCode(guide.team_code);
      setStadiumStatus("");
      return;
    }

    setStadiumStatus("검색 결과가 없습니다. 구단명, 지역명, 구장명으로 다시 검색해보세요.");
  }

  function showSelectedTeamStadium() {
    const code = teamCodes[selectedTeamId];
    if (code) {
      setSelectedStadiumCode(code);
      setStadiumQuery(selectedTeam.name);
      setStadiumStatus("");
    }
  }

  function splitInfo(text?: string) {
    return (text ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function getRegionInfo(guide?: StadiumGuide) {
    if (!guide) return [];

    return splitInfo(
      [guide.ktx_info, guide.taxi_info, guide.bus_info, guide.tourism, guide.accommodations]
        .filter(Boolean)
        .join("\n"),
    );
  }

  function parseFoodInfo(food?: string) {
    const lines = splitInfo(food);
    const intro: string[] = [];
    const menuItems: string[] = [];
    const pairings: Array<{ label: string; value: string }> = [];

    lines.forEach((line) => {
      if (line.startsWith("인기 메뉴 후보:")) {
        menuItems.push(
          ...line
            .replace("인기 메뉴 후보:", "")
            .split(",")
            .map((item) => item.trim().replace(/\.$/, ""))
            .filter(Boolean),
        );
        return;
      }

      if (line.startsWith("추천 조합:")) {
        line
          .replace("추천 조합:", "")
          .split(",")
          .map((item) => item.trim().replace(/\.$/, ""))
          .filter(Boolean)
          .forEach((item) => {
            const [label, ...rest] = item.split("=");
            pairings.push({
              label: label?.trim() || "추천",
              value: rest.join("=").trim() || item,
            });
          });
        return;
      }

      intro.push(line);
    });

    return { intro, menuItems, pairings };
  }

  function findTeamFromQuestion(userQuestion: string) {
    const normalizedQuestion = normalizeText(userQuestion);
    return (
      kboTeams.find((team) =>
        (teamAliases[team.id] ?? [team.name]).some((alias) =>
          normalizedQuestion.includes(normalizeText(alias)),
        ),
      ) ?? selectedTeam
    );
  }

  function findStandingByTeam(teamName: string) {
    const normalizedTeam = normalizeText(teamName);
    return standings.find((row) => normalizeText(String(row.팀명 ?? "")).includes(normalizedTeam));
  }

  function formatGame(game: GameRow) {
    return `${game.홈팀 || "-"} vs ${game.원정팀 || "-"} (${game.시간 || game.상태 || "-"}, ${game.구장 || "-"})`;
  }

  function buildRecordsAnswer(userQuestion: string) {
    const normalizedQuestion = normalizeText(userQuestion);
    const targetTeam = findTeamFromQuestion(userQuestion);
    const targetAlias = teamAliases[targetTeam.id]?.[0] ?? targetTeam.name;

    if (/(순위|몇위|몇등|성적|전적|승률|승패|승수|패수|무승부)/.test(normalizedQuestion)) {
      const standing = findStandingByTeam(targetAlias);
      if (standing) {
        return `${targetTeam.name}는 현재 ${standing.순위 ?? "-"}위입니다. 성적은 ${standing.승 ?? "-"}승 ${standing.패 ?? "-"}패 ${standing.무 ?? "-"}무, 승률은 ${standing.승률 ?? "-"}예요.`;
      }

      if (standings.length) {
        const topTeams = standings
          .slice(0, 3)
          .map((team) => `${team.순위 ?? "-"}위 ${team.팀명 ?? "-"}`)
          .join(", ");
        return `현재 상위권은 ${topTeams} 순서예요. 특정 팀 이름을 넣어 물어보면 그 팀 성적만 골라서 알려드릴게요.`;
      }
    }

    if (/(경기|대진|일정|오늘|내일|모레|구장|시간)/.test(normalizedQuestion)) {
      const schedule =
        schedules.find((item) => normalizedQuestion.includes(normalizeText(item.label))) ??
        selectedSchedule;
      const games = schedule?.games ?? [];
      const filteredGames = games.filter((game) =>
        [game.홈팀, game.원정팀].some((team) =>
          normalizeText(String(team ?? "")).includes(normalizeText(targetAlias)),
        ),
      );
      const answerGames = filteredGames.length ? filteredGames : games;

      if (schedule && answerGames.length) {
        const gameText = answerGames.map(formatGame).join(", ");
        return `${schedule.label}(${schedule.date}) 대진은 ${gameText}입니다.`;
      }

      if (schedule) {
        return `${schedule.label}(${schedule.date})에는 현재 표시할 예정 경기 데이터가 없습니다.`;
      }
    }

    return null;
  }

  async function buildGlossaryAnswer(userQuestion: string) {
    try {
      const response = await fetch(apiUrl("/glossary"));
      if (!response.ok) return null;

      const data = await response.json();
      const terms: GlossaryTerm[] = Array.isArray(data.terms) ? data.terms : [];
      const normalizedQuestion = normalizeText(userQuestion);
      const matched = terms.find((item) => {
        const term = item.term ? normalizeText(item.term) : "";
        const abbr = item.abbr ? normalizeText(item.abbr) : "";
        return Boolean(
          (term && normalizedQuestion.includes(term)) ||
          (abbr && normalizedQuestion.includes(abbr)),
        );
      });

      if (matched?.definition) {
        const label = matched.abbr ? `${matched.term}(${matched.abbr})` : matched.term;
        return `${label}은/는 ${matched.definition}`;
      }
    } catch {
      return null;
    }

    return null;
  }

  async function buildDemoAnswer(userQuestion: string) {
    const recordsAnswer = buildRecordsAnswer(userQuestion);
    if (recordsAnswer) return recordsAnswer;

    const glossaryAnswer = await buildGlossaryAnswer(userQuestion);
    if (glossaryAnswer) return glossaryAnswer;

    const matched = fallbackAnswers.find((item) => userQuestion.includes(item.keyword));
    return matched
      ? matched.answer
      : `${selectedTeam.name} 팬 기준으로 쉽게 설명해볼게요. 야구에서는 공수 교대, 아웃카운트, 주자 위치를 함께 보면 흐름이 훨씬 쉬워져요. 더 구체적으로 물어보면 초보자 기준으로 풀어서 설명해드릴게요.`;
  }

  useEffect(() => {
    chatLogRef.current?.scrollTo({ top: chatLogRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    let isCurrent = true;

    async function loadBaseballRecords() {
      setRecordsStatus("야구 기록을 불러오는 중입니다.");

      try {
        const scheduleDates = getScheduleDates();
        const [standingsResponse, ...gameResponses] = await Promise.all([
          fetch(apiUrl("/standings")),
          ...scheduleDates.map((item) => fetch(apiUrl(`/schedule?date=${item.date}`))),
        ]);

        if (!standingsResponse.ok) {
          throw new Error("Standings API unavailable");
        }

        const standingsData = await standingsResponse.json();
        const scheduleData = await Promise.all(
          gameResponses.map(async (response, index) => {
            if (!response.ok) {
              return { ...scheduleDates[index], games: [] };
            }

            const data = await response.json();
            return {
              ...scheduleDates[index],
              games: Array.isArray(data.schedule) ? data.schedule : [],
            };
          }),
        );

        if (isCurrent) {
          setStandings(Array.isArray(standingsData.standings) ? standingsData.standings : []);
          setSchedules(scheduleData);
          setRecordsStatus("");
        }
      } catch {
        if (isCurrent) {
          setStandings([]);
          setSchedules(getScheduleDates().map((item) => ({ ...item, games: [] })));
          setRecordsStatus("백엔드 야구 기록 API에 연결할 수 없습니다.");
        }
      }
    }

    void loadBaseballRecords();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadStadiumGuides() {
      setStadiumStatus("구장 안내를 불러오는 중입니다.");

      try {
        const guides = await Promise.all(
          kboTeams.map(async (team) => {
            const code = teamCodes[team.id];
            const response = await fetch(apiUrl(`/stadiums/${code}`));
            if (!response.ok) return null;

            const data = await response.json();
            const stadium = Array.isArray(data.stadiums) ? data.stadiums[0] : null;
            if (!stadium) return null;

            return {
              ...stadium,
              teamName: team.name,
              aliases: teamAliases[team.id] ?? [team.name],
            } as StadiumGuide;
          }),
        );

        if (isCurrent) {
          const availableGuides = guides.filter((guide): guide is StadiumGuide => Boolean(guide));
          setStadiumGuides(availableGuides);
          setStadiumStatus(availableGuides.length ? "" : "구장 안내 데이터가 없습니다.");
        }
      } catch {
        if (isCurrent) {
          setStadiumGuides([]);
          setStadiumStatus("백엔드 구장 안내 API에 연결할 수 없습니다.");
        }
      }
    }

    void loadStadiumGuides();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    document.querySelectorAll(".stadium-info-block").forEach((element) => {
      element.scrollTo({ top: 0 });
    });
    setIsFoodExpanded(false);
  }, [selectedStadiumCode]);

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

      const response = await fetch(apiUrl("/chat"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          question: userQuestion,
          teamId: selectedTeamId,
          team_code: teamCodes[selectedTeamId] ?? selectedTeamId.toUpperCase(),
          sessionId: "frontend-demo",
          session_id: "frontend-demo",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.answer && !isPlaceholderAnswer(data.answer)) {
          return data.answer as string;
        }
      }
    } catch {
      // Demo fallback until the LLM API server is connected.
    }

    return buildDemoAnswer(userQuestion);
  }

  /** Azure TTS(/tts)로 음성+viseme를 받아 재생. 성공 시 true. */
  async function speakWithAzure(text: string): Promise<boolean> {
    try {
      // 이전 재생 중지
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current = null;
      }
      const resp = await fetch(apiUrl("/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!resp.ok) return false; // 503(미설정)/502 등 → 기기 TTS로 폴백
      const data = await resp.json();
      if (!data.audio) return false;

      const visemes = Array.isArray(data.visemes) ? data.visemes : [];
      visemeRef.current = visemes;
      const audio = new Audio(`data:${data.mime || "audio/mpeg"};base64,${data.audio}`);
      ttsAudioRef.current = audio;

      return await new Promise<boolean>((resolve) => {
        let settled = false;
        let lipRaf = 0;

        // 오디오 재생 시간 ↔ viseme 타임라인 매칭 → 현재 입모양 설정
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

        const done = (ok: boolean) => {
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
        audio.onended = () => done(true);
        audio.onerror = () => done(false);
        audio.play().catch(() => done(false));
      });
    } catch (err) {
      console.warn("[TTS] Azure 호출 실패 → 기기 TTS로 폴백", err);
      return false;
    }
  }

  async function speakAnswer(text: string) {
    setSpeechBubble(text);

    // 1순위: Azure Neural TTS (서버 /tts). 성공하면 여기서 끝.
    if (await speakWithAzure(text)) return;

    // 네이티브(안드로이드/iOS): WebView의 speechSynthesis가 동작하지 않으므로 Capacitor TTS 사용.
    // 입 애니메이션은 isSpeaking에 묶여 있으므로, 발화 동안 isSpeaking을 켜둔다.
    if (Capacitor.isNativePlatform()) {
      // 소리가 안 나오더라도 입은 최소 시간 동안 움직이도록 추정 시간(글자수 기반) 병행.
      const estMs = Math.min(12000, Math.max(1200, text.length * 55));
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      try {
        await TextToSpeech.stop();
      } catch {
        /* 진행 중 발화 없음 */
      }
      setIsSpeaking(true);
      const speakPromise = TextToSpeech.speak({
        text,
        lang: "ko-KR",
        rate: 1.1,
        pitch: 1.4,
        volume: 1.0,
        category: "playback",
      }).catch((err) => console.error("[TTS] native speak 실패", err));
      try {
        await Promise.all([speakPromise, sleep(estMs)]);
      } finally {
        setIsSpeaking(false);
      }
      return;
    }

    // 웹: 기존 Web Speech API
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
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    clearMouth();
    if (Capacitor.isNativePlatform()) {
      void TextToSpeech.stop();
    }
    setIsSpeaking(false);
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
        <div className="left-column">
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

        <button
          className={`attendance-entry-tile attendance-entry-standalone ${isAttendanceOpen ? "is-active" : ""}`}
          type="button"
          onClick={() => setIsAttendanceOpen((open) => !open)}
          aria-pressed={isAttendanceOpen}
        >
          <span>{attendanceCheckedToday ? "\ucd9c\uc11d\uc644\ub8cc" : "\ucd9c\uc11d"}</span>
          <strong>{attendanceCheckedToday ? "\uc624\ub298 \uc644\ub8cc" : "\uc624\ub298 +20 XP"}</strong>
        </button>

        </div>

        <div className="character-stage" aria-label="3D 캐릭터 영역">
          <div className="stadium-light"></div>
          <Character3D isSpeaking={isSpeaking} className="character" />
        </div>
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
            aria-label="\ucd9c\uc11d \uccb4\ud06c"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="attendance-window-close"
              type="button"
              aria-label="\ucd9c\uc11d \ucc3d \ub2eb\uae30"
              onClick={() => setIsAttendanceOpen(false)}
            >
              {"\ub2eb\uae30"}
            </button>
            <AttendanceCheckIn authToken={authToken} onCheckedTodayChange={setAttendanceCheckedToday} />
          </section>
        </div>
      ) : null}

      <section className="records-section" aria-labelledby="recordsTitle">
        <div className="section-title records-title">
          <div>
            <h2 className="eyebrow">KBO Records</h2>
          </div>
        </div>

        {recordsStatus ? (
          <p className="records-status" role="status">
            {recordsStatus}
          </p>
        ) : null}

        <div className="records-layout">
          <section className="standings-panel" aria-labelledby="standingsTitle">
            <div className="table-heading">
              <h3 id="standingsTitle">팀 순위</h3>
              <span>{standings.length}개 팀</span>
            </div>
            <div className="table-scroll">
              <table className="data-table standings-table">
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>팀</th>
                    <th>승</th>
                    <th>패</th>
                    <th>무</th>
                    <th>승률</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.length ? (
                    standings.map((team, index) => (
                      <tr key={`${team.팀명 || "team"}-${team.순위 || index}`}>
                        <td>
                          <span className="rank-badge">{team.순위 || index + 1}</span>
                        </td>
                        <td className="team-cell">{team.팀명 || "-"}</td>
                        <td>{team.승 ?? "-"}</td>
                        <td>{team.패 ?? "-"}</td>
                        <td>{team.무 ?? "-"}</td>
                        <td>{team.승률 ?? "-"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>순위 데이터가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="schedule-panel" aria-labelledby="scheduleTitle">
            <div className="table-heading">
              <h3 id="scheduleTitle">3일 대진표</h3>
              <div className="schedule-tabs" aria-label="대진표 날짜 선택">
                {schedules.map((schedule, index) => (
                  <button
                    className={index === activeScheduleIndex ? "is-active" : ""}
                    type="button"
                    aria-pressed={index === activeScheduleIndex}
                    key={schedule.date}
                    onClick={() => setActiveScheduleIndex(index)}
                  >
                    {schedule.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="schedule-days">
              {selectedSchedule ? (
                <article className="schedule-day" key={selectedSchedule.date}>
                  <div className="schedule-day-title">
                    <strong>{selectedSchedule.label}</strong>
                    <span>{selectedSchedule.date}</span>
                  </div>
                  <div className="table-scroll">
                    <table className="data-table schedule-table">
                      <thead>
                        <tr>
                          <th>홈 팀</th>
                          <th>어웨이 팀</th>
                          <th>시간</th>
                          <th>홈구장</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSchedule.games.length ? (
                          selectedSchedule.games.map((game, index) => (
                            <tr
                              key={`${selectedSchedule.date}-${game.홈팀 || "home"}-${game.원정팀 || "away"}-${index}`}
                            >
                              <td className="team-cell">{game.홈팀 || "-"}</td>
                              <td>{game.원정팀 || "-"}</td>
                              <td>{game.시간 || game.상태 || "-"}</td>
                              <td>{game.구장 || "-"}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4}>예정된 경기 데이터가 없습니다.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        </div>

        <section className="stadium-guide-panel" aria-labelledby="stadiumGuideTitle">
          <div className="stadium-guide-heading">
            <div>
              <p className="eyebrow">Stadium Guide</p>
              <h3 id="stadiumGuideTitle">구장 안내 · 먹거리 · 지역정보</h3>
            </div>
            <form className="stadium-search" onSubmit={handleStadiumSearch}>
              <input
                type="search"
                value={stadiumQuery}
                onChange={(event) => setStadiumQuery(event.target.value)}
                placeholder="예: 잠실, 두산, 부산, 사직"
                aria-label="지역 또는 구단명 검색"
              />
              <button type="submit">검색</button>
              <button type="button" className="text-button" onClick={showSelectedTeamStadium}>
                선택 팀
              </button>
            </form>
          </div>

          {stadiumStatus ? (
            <p className="stadium-status" role="status">
              {stadiumStatus}
            </p>
          ) : null}

          {selectedStadiumGuide ? (
            <div className="stadium-guide-content">
              <div className="stadium-overview">
                <p className="eyebrow">{selectedStadiumGuide.teamName}</p>
                <h4>{selectedStadiumGuide.name || "구장 정보"}</h4>
                <dl>
                  <div>
                    <dt>위치</dt>
                    <dd>{selectedStadiumGuide.location || "-"}</dd>
                  </div>
                  <div>
                    <dt>대중교통</dt>
                    <dd>{selectedStadiumGuide.subway || selectedStadiumGuide.bus_info || "-"}</dd>
                  </div>
                  <div>
                    <dt>좌석</dt>
                    <dd>{selectedStadiumGuide.seat_count || selectedStadiumGuide.stadium_size || "-"}</dd>
                  </div>
                  <div>
                    <dt>예매</dt>
                    <dd>{selectedStadiumGuide.reservation_site || selectedStadiumGuide.reservation_tip || "-"}</dd>
                  </div>
                </dl>
              </div>

              <div className="stadium-info-grid">
                <article className="stadium-info-block">
                  <h4>구장 안내</h4>
                  {splitInfo(selectedStadiumGuide.features || selectedStadiumGuide.parking).length ? (
                    splitInfo(selectedStadiumGuide.features || selectedStadiumGuide.parking).map(
                      (line, index) => (
                        <p key={`${selectedStadiumGuide.team_code}-guide-${index}`}>{line}</p>
                      ),
                    )
                  ) : (
                    <p>등록된 구장 안내가 없습니다.</p>
                  )}
                </article>

                {isFoodExpanded ? (
                  <button
                    className="stadium-expand-backdrop"
                    type="button"
                    aria-label="먹거리 정보 확대 닫기"
                    onClick={() => setIsFoodExpanded(false)}
                  />
                ) : null}

                <article
                  className={`stadium-info-block food-info-block ${isFoodExpanded ? "is-expanded" : ""}`}
                >
                  <h4>
                    <button type="button" onClick={() => setIsFoodExpanded((current) => !current)}>
                      먹거리 정보
                    </button>
                    {isFoodExpanded ? (
                      <button
                        className="stadium-expand-close"
                        type="button"
                        aria-label="먹거리 정보 확대 닫기"
                        onClick={() => setIsFoodExpanded(false)}
                      >
                        닫기
                      </button>
                    ) : null}
                  </h4>
                  {splitInfo(selectedStadiumGuide.food || selectedStadiumGuide.restaurants).length ? (
                    <div className="food-summary">
                      {selectedFoodInfo.intro.map((line, index) => (
                          <p key={`${selectedStadiumGuide.team_code}-food-intro-${index}`}>
                            {line}
                          </p>
                      ))}

                      {selectedFoodInfo.menuItems.length ? (
                        <div className="food-table-wrap">
                          <table className="food-table">
                            <caption>인기 메뉴</caption>
                            <tbody>
                              {selectedFoodInfo.menuItems.map((item, index) => (
                                <tr key={`${selectedStadiumGuide.team_code}-menu-${index}`}>
                                  <th>{index + 1}</th>
                                  <td>{item}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}

                      {selectedFoodInfo.pairings.length ? (
                        <div className="food-table-wrap">
                          <table className="food-table food-pairing-table">
                            <caption>추천 조합</caption>
                            <tbody>
                              {selectedFoodInfo.pairings.map((pairing, index) => (
                                <tr key={`${selectedStadiumGuide.team_code}-pairing-${index}`}>
                                  <th>{pairing.label}</th>
                                  <td>{pairing.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p>등록된 먹거리 정보가 없습니다.</p>
                  )}
                </article>

                <article className="stadium-info-block">
                  <h4>지역정보</h4>
                  {getRegionInfo(selectedStadiumGuide).length ? (
                    getRegionInfo(selectedStadiumGuide).map((line, index) => (
                      <p key={`${selectedStadiumGuide.team_code}-region-${index}`}>{line}</p>
                    ))
                  ) : (
                    <p>등록된 지역정보가 없습니다.</p>
                  )}
                </article>
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </section>
  );
}
