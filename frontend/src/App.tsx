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

function loadAuthSession() {
  const saved = sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!saved) {
    return { isLoggedIn: false, authToken: "", favTeamCode: "", nickname: "" };
  }

  try {
    const parsed = JSON.parse(saved) as {
      authToken?: string;
      isLoggedIn?: boolean;
      favTeamCode?: string;
      nickname?: string;
    };
    return {
      isLoggedIn: Boolean(parsed.isLoggedIn),
      authToken: parsed.authToken || "",
      favTeamCode: parsed.favTeamCode || "",
      nickname: parsed.nickname || "",
    };
  } catch {
    sessionStorage.removeItem(AUTH_SESSION_KEY);
    return { isLoggedIn: false, authToken: "", favTeamCode: "", nickname: "" };
  }
}

function saveAuthSession(authToken: string, favTeamCode: string, nickname: string) {
  sessionStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify({ isLoggedIn: true, authToken, favTeamCode, nickname }),
  );
}

export function App() {
  const [authSession] = useState(loadAuthSession);
  const [appSettings, setAppSettings] = useState(loadAppSettings);
  const [isLoggedIn, setIsLoggedIn] = useState(authSession.isLoggedIn);
  const [authToken, setAuthToken] = useState(authSession.authToken);
  const [favTeamCode, setFavTeamCode] = useState(authSession.favTeamCode);
  const [nickname, setNickname] = useState(authSession.nickname);
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

  async function handleLogin(id: string, password: string) {
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
        setAuthToken(token);
        setFavTeamCode(teamCode);
        setNickname(userNickname);
        setIsLoggedIn(true);
        saveAuthSession(token, teamCode, userNickname);
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
      setIsLoggedIn(true);
      saveAuthSession("", "", "야구팬");
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
    setAuthToken("");
    setFavTeamCode("");
    setNickname("");
    setIsLoggedIn(false);
    setLoginError("");
    setLoginNotice("");
    setRegisterError("");
    setAuthMode("login");
  }

  return (
    <main className="app-shell">
      {isLoggedIn ? (
        <MainViewV2
          authToken={authToken}
          favTeamCode={favTeamCode}
          nickname={nickname}
          notificationEnabled={appSettings.notificationEnabled}
          darkModeEnabled={appSettings.darkModeEnabled}
          onNotificationEnabledChange={(notificationEnabled) =>
            setAppSettings((current) => ({ ...current, notificationEnabled }))
          }
          onDarkModeEnabledChange={(darkModeEnabled) =>
            setAppSettings((current) => ({ ...current, darkModeEnabled }))
          }
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
