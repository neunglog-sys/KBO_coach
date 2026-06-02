import { useState } from "react";
import { LoginView } from "./components/LoginView";
import { MainView } from "./components/MainView";
import { RegisterView } from "./components/RegisterView";

const DEMO_AUTH = {
  id: "admin",
  pw: "admin1234",
};

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginError, setLoginError] = useState("");
  const [loginNotice, setLoginNotice] = useState("");
  const [registerError, setRegisterError] = useState("");

  async function handleLogin(id: string, password: string) {
    setLoginError("");
    setLoginNotice("");

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: id, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setAuthToken(data.access_token || data.token || "");
        setIsLoggedIn(true);
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
    } catch {
      // Static demo fallback until the FastAPI auth server is connected.
    }

    if (id === DEMO_AUTH.id && password === DEMO_AUTH.pw) {
      setAuthToken("");
      setIsLoggedIn(true);
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
      const response = await fetch("/auth/register", {
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
    setAuthToken("");
    setIsLoggedIn(false);
    setLoginError("");
    setLoginNotice("");
    setRegisterError("");
    setAuthMode("login");
  }

  return (
    <main className="app-shell">
      {isLoggedIn ? (
        <MainView authToken={authToken} onLogout={handleLogout} />
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
