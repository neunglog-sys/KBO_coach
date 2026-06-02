import { useState } from "react";
import { LoginView } from "./components/LoginView";
import { MainView } from "./components/MainView";

const DEMO_AUTH = {
  id: "admin",
  pw: "admin1234",
};

export function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [loginError, setLoginError] = useState("");

  async function handleLogin(id: string, password: string) {
    setLoginError("");

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

  function handleLogout() {
    window.speechSynthesis?.cancel();
    setAuthToken("");
    setIsLoggedIn(false);
    setLoginError("");
  }

  return (
    <main className="app-shell">
      {isLoggedIn ? (
        <MainView authToken={authToken} onLogout={handleLogout} />
      ) : (
        <LoginView error={loginError} onLogin={handleLogin} />
      )}
    </main>
  );
}
