import { useEffect, useState } from "react";
import { apiUrl } from "./api";
import { applyDarkMode, loadAppSettings, saveAppSettings } from "./appSettings";
import { disablePush, registerPush } from "./push";
import { initDb } from "./db";
import { LoginView } from "./components/LoginView";
// import { MainView } from "./components/MainView"; // 구버전 메인(되돌리려면 이 줄 + 아래 JSX 교체)
import { MainViewV2 } from "./components/MainViewV2";
import { RegisterView } from "./components/RegisterView";

const DEMO_AUTH = {
  id: "admin",
  pw: "admin1234",
};

const AUTH_SESSION_KEY = "baseballCoachAuth";

type AuthSession = {
  isLoggedIn: boolean;
  authToken: string;
  favTeamCode: string;
  nickname: string;
  buddyNickname: string;
};

const EMPTY_AUTH_SESSION: AuthSession = {
  isLoggedIn: false,
  authToken: "",
  favTeamCode: "",
  nickname: "",
  buddyNickname: "",
};

function parseAuthSession(saved: string | null): AuthSession | null {
  if (!saved) {
    return null;
  }

  try {
    const parsed = JSON.parse(saved) as {
      authToken?: string;
      isLoggedIn?: boolean;
      favTeamCode?: string;
      nickname?: string;
      buddyNickname?: string;
    };
    return {
      isLoggedIn: Boolean(parsed.isLoggedIn),
      authToken: parsed.authToken || "",
      favTeamCode: parsed.favTeamCode || "",
      nickname: parsed.nickname || "",
      buddyNickname: parsed.buddyNickname || "",
    };
  } catch {
    return null;
  }
}

function loadAuthSession() {
  const savedLocal = localStorage.getItem(AUTH_SESSION_KEY);
  const localSession = parseAuthSession(savedLocal);
  if (localSession) {
    sessionStorage.setItem(AUTH_SESSION_KEY, savedLocal || "");
    return localSession;
  }
  if (savedLocal) {
    localStorage.removeItem(AUTH_SESSION_KEY);
  }

  const savedSession = sessionStorage.getItem(AUTH_SESSION_KEY);
  const session = parseAuthSession(savedSession);
  if (session) {
    return session;
  }
  if (savedSession) {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
  }

  return EMPTY_AUTH_SESSION;
}

function saveAuthSession(
  authToken: string,
  favTeamCode: string,
  nickname: string,
  buddyNickname = "",
  remember = localStorage.getItem(AUTH_SESSION_KEY) != null,
) {
  const value = JSON.stringify({ isLoggedIn: true, authToken, favTeamCode, nickname, buddyNickname });
  sessionStorage.setItem(AUTH_SESSION_KEY, value);
  if (remember) {
    localStorage.setItem(AUTH_SESSION_KEY, value);
  } else {
    localStorage.removeItem(AUTH_SESSION_KEY);
  }
}

function clearTamagotchiLocalState() {
  const prefixes = [
    "baseballCoachGender",
    "baseballCoachBuddyNickname",
    "baseballCoachTamagotchi",
    "baseballCoachAttendance",
    "baseballCoachLevelSeen",
  ];
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key && prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))) {
      localStorage.removeItem(key);
    }
  }
}

export function App() {
  const [authSession] = useState(loadAuthSession);
  const [appSettings, setAppSettings] = useState(loadAppSettings);
  const [isLoggedIn, setIsLoggedIn] = useState(authSession.isLoggedIn);
  const [authToken, setAuthToken] = useState(authSession.authToken);
  const [favTeamCode, setFavTeamCode] = useState(authSession.favTeamCode);
  const [nickname, setNickname] = useState(authSession.nickname);
  const [buddyNickname, setBuddyNickname] = useState(authSession.buddyNickname);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginError, setLoginError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [registerError, setRegisterError] = useState("");

  // 앱 시작 시 로컬 SQLite 초기화 (채팅이력·직관기록 저장소)
  useEffect(() => {
    initDb().catch((e) => console.error("SQLite 초기화 실패", e));
  }, []);

  // 로그인 상태면 안드로이드 FCM 토큰을 백엔드에 등록 (웹은 내부에서 스킵)
  useEffect(() => {
    saveAppSettings(appSettings);
    applyDarkMode(appSettings.darkModeEnabled);
  }, [appSettings]);

  useEffect(() => {
    if (!isLoggedIn || !authToken) return;
    if (appSettings.notificationEnabled) {
      void registerPush(authToken);
    } else {
      void disablePush(authToken);
    }
  }, [isLoggedIn, authToken, appSettings.notificationEnabled]);

  async function handleLogin(id: string, password: string, remember = false) {
    setLoginError("");
    setLoginNotice("");

    try {
      const response = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: id, password }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.access_token || data.token || "";
        const teamCode = data.user?.fav_team_code || ""; // 로그인 응답의 응원팀
        const userNickname = data.user?.nickname || "";
        const userBuddyNickname = data.user?.buddy_nickname || "";
        setAuthToken(token);
        setFavTeamCode(teamCode);
        setNickname(userNickname);
        setBuddyNickname(userBuddyNickname);
        setIsLoggedIn(true);
        saveAuthSession(token, teamCode, userNickname, userBuddyNickname, remember);
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
    } catch {
      // Static demo fallback until the FastAPI auth server is connected.
    }

    if (id === DEMO_AUTH.id && password === DEMO_AUTH.pw) {
      setAuthToken("");
      setFavTeamCode("");
      setNickname("야구팬");
      setBuddyNickname("");
      setIsLoggedIn(true);
      saveAuthSession("", "", "야구팬", "", remember);
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    setLoginError("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  async function handleRegister(
    id: string,
    password: string,
    nickname: string,
    favTeamCode: string,
  ) {
    setRegisterError("");

    try {
      const response = await fetch(apiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: id,
          password,
          nickname,
          fav_team_code: favTeamCode || null,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        setAuthMode("login");
        setLoginNotice("회원가입이 완료되었습니다. 로그인해주세요.");
        setRegisterError("");
        return;
      }

      setRegisterError(data?.detail || "회원가입 중 문제가 발생했습니다.");
      return;
    } catch {
      setRegisterError("백엔드 서버에 연결할 수 없습니다.");
    }
  }

  function handleLogout() {
    window.speechSynthesis?.cancel();
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem(AUTH_SESSION_KEY);
    localStorage.removeItem("myTeamCode");
    clearTamagotchiLocalState();
    setAuthToken("");
    setFavTeamCode("");
    setNickname("");
    setBuddyNickname("");
    setIsLoggedIn(false);
    setLoginError("");
    setLoginNotice("");
    setRegisterError("");
    setAuthMode("login");
    window.history.replaceState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  // 응원구단 변경: 전역 로그인 상태 + sessionStorage 갱신 → 메인/다마고치/구장정보/챗이 같은 팀 값을 봄
  function handleFavTeamChange(code: string) {
    setFavTeamCode(code);
    saveAuthSession(authToken, code, nickname, buddyNickname);
  }

  function handleBuddyNicknameChange(nextBuddyNickname: string) {
    setBuddyNickname(nextBuddyNickname);
    saveAuthSession(authToken, favTeamCode, nickname, nextBuddyNickname);
  }

  return (
    <main className="app-shell">
      {isLoggedIn ? (
        <MainViewV2
          authToken={authToken}
          favTeamCode={favTeamCode}
          nickname={nickname}
          buddyNickname={buddyNickname}
          notificationEnabled={appSettings.notificationEnabled}
          darkModeEnabled={appSettings.darkModeEnabled}
          onNotificationEnabledChange={(notificationEnabled) =>
            setAppSettings((current) => ({ ...current, notificationEnabled }))
          }
          onDarkModeEnabledChange={(darkModeEnabled) =>
            setAppSettings((current) => ({ ...current, darkModeEnabled }))
          }
          onFavTeamChange={handleFavTeamChange}
          onBuddyNicknameChange={handleBuddyNicknameChange}
          onLogout={handleLogout}
        />
      ) : authMode === "register" ? (
        <RegisterView
          error={registerError}
          onRegister={handleRegister}
          onShowLogin={() => {
            setRegisterError("");
            setAuthMode("login");
          }}
        />
      ) : (
        <LoginView
          error={loginError}
          notice={loginNotice}
          onLogin={handleLogin}
          onShowRegister={() => {
            setLoginError("");
            setLoginNotice("");
            setAuthMode("register");
          }}
        />
      )}
    </main>
  );
}
