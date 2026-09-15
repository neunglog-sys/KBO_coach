import { useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { apiUrl } from "./api";
import { loadAppSettings, saveAppSettings } from "./appSettings";
import { disablePush, registerPush } from "./push";
import { initDb } from "./db";
import { LoginView } from "./components/LoginView";
// import { MainView } from "./components/MainView"; // 구버전 메인(되돌리려면 이 줄 + 아래 JSX 교체)
import { MainViewV2 } from "./components/MainViewV2";
import { RegisterView } from "./components/RegisterView";
import { TeamSelectOnboarding } from "./components/TeamSelectOnboarding";
import { FpsOverlay } from "./components/FpsOverlay";

// 팀 선택 온보딩 강제 표시 (개발용 — 배포/발표 전 반드시 false!)
const FORCE_SHOW_TEAM_ONBOARDING = false;

const DEMO_AUTH = {
  id: "admin",
  pw: "admin1234",
};

const AUTH_SESSION_KEY = "baseballCoachAuth";
const MAIN_STAGE_ASSETS = ["/img/sky.png", "/img/background1.2.png"];

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

let mainStageAssetsPromise: Promise<void> | null = null;

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const image = new Image();
    const finish = () => {
      const decode = image.decode?.();
      if (decode) {
        void decode.catch(() => {}).finally(resolve);
        return;
      }
      resolve();
    };

    image.onload = finish;
    image.onerror = () => resolve();
    image.src = src;
  });
}

function preloadMainStageAssets() {
  if (!mainStageAssetsPromise) {
    mainStageAssetsPromise = Promise.all(MAIN_STAGE_ASSETS.map(preloadImage)).then(() => {});
  }
  return mainStageAssetsPromise;
}

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

function readKakaoAuthSession(url = window.location.href): AuthSession | null {
  let rawSession: string | null = null;

  try {
    const parsedUrl = new URL(url);
    rawSession = parsedUrl.searchParams.get("kakao_session");

    const hash = parsedUrl.hash.startsWith("#")
      ? parsedUrl.hash.slice(1)
      : parsedUrl.hash;
    if (!rawSession && hash) {
      rawSession = new URLSearchParams(hash).get("kakao_session");
    }
  } catch {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    rawSession = hash ? new URLSearchParams(hash).get("kakao_session") : null;
  }

  if (!rawSession) return null;

  const session = parseAuthSession(rawSession);
  if (url === window.location.href) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }
  return session?.isLoggedIn && session.authToken ? session : null;
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
  const [showExitHint, setShowExitHint] = useState(false);
  const lastLoginBackPressRef = useRef(0);
  const exitHintTimerRef = useRef<number | null>(null);
  const authTokenRef = useRef(authToken);
  authTokenRef.current = authToken;

  // 토큰 자동 갱신(슬라이딩 만료) — 앱 시작 시 + 6시간마다 새 토큰 재발급.
  // 활성 유저는 재로그인 없이 유지. 만료(401)돼도 강제 로그아웃하지 않고 다음 접속 때 재로그인.
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    async function refreshToken() {
      const token = authTokenRef.current;
      if (!token) return;
      try {
        const res = await fetch(apiUrl("/auth/refresh"), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return; // 만료 등 → 강제 로그아웃 안 함, 다음 접속 때 재로그인
        const data = await res.json();
        if (cancelled || !data.token) return;
        setAuthToken(data.token);
        const cur = loadAuthSession(); // 최신 세션값 유지 + 토큰만 교체(favTeam 등 덮어쓰기 방지)
        saveAuthSession(data.token, cur.favTeamCode, cur.nickname, cur.buddyNickname);
      } catch {
        // 네트워크 실패 무시 — 다음 주기에 재시도
      }
    }
    void refreshToken();
    const id = window.setInterval(refreshToken, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn) {
      void preloadMainStageAssets();
    }
  }, [isLoggedIn]);

  function runRouteTransition(update: () => void) {
    update();
  }

  function applyKakaoSession(kakaoSession: AuthSession) {
    runRouteTransition(() => {
      setAuthToken(kakaoSession.authToken);
      setFavTeamCode(kakaoSession.favTeamCode);
      setNickname(kakaoSession.nickname);
      setBuddyNickname(kakaoSession.buddyNickname);
      setIsLoggedIn(true);
    });
    saveAuthSession(
      kakaoSession.authToken,
      kakaoSession.favTeamCode,
      kakaoSession.nickname,
      kakaoSession.buddyNickname,
      true,
    );
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  useEffect(() => {
    const kakaoSession = readKakaoAuthSession();
    if (!kakaoSession) return;
    applyKakaoSession(kakaoSession);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      const kakaoSession = readKakaoAuthSession(url);
      if (kakaoSession) {
        applyKakaoSession(kakaoSession);
      }
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);

  // 앱 시작 시 로컬 SQLite 초기화 (채팅이력·직관기록 저장소)
  useEffect(() => {
    initDb().catch((e) => console.error("SQLite 초기화 실패", e));
  }, []);

  // 스플래시 화면: 웹 첫 화면이 실제로 그려진 뒤에 숨긴다.
  // (자동 숨김을 끄고 여기서 내려야, WebView가 이전 세션의 옛 화면을 잠깐 보여주는 깜빡임을 가린다.)
  useEffect(() => {
    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      import("@capacitor/splash-screen")
        .then(({ SplashScreen }) => SplashScreen.hide())
        .catch(() => {});
    };
    window.addEventListener("app:first-paint", hide, { once: true });
    const t = window.setTimeout(hide, 2500);
    return () => {
      window.removeEventListener("app:first-paint", hide);
      window.clearTimeout(t);
    };
  }, []);

  // 플랫폼별 CSS 분기용 클래스 (예: .plat-ios — 배경 스크롤 속도 등)
  useEffect(() => {
    document.documentElement.classList.add(`plat-${Capacitor.getPlatform()}`);
  }, []);

  useEffect(() => {
    if (
      isLoggedIn ||
      !Capacitor.isNativePlatform() ||
      Capacitor.getPlatform() !== "android"
    ) {
      return;
    }

    const listener = CapacitorApp.addListener("backButton", () => {
      if (authMode === "register") {
        setRegisterError("");
        setAuthMode("login");
        setShowExitHint(false);
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }

      const now = Date.now();
      if (now - lastLoginBackPressRef.current <= 2000) {
        if (exitHintTimerRef.current !== null) {
          window.clearTimeout(exitHintTimerRef.current);
        }
        void CapacitorApp.exitApp();
        return;
      }

      lastLoginBackPressRef.current = now;
      setShowExitHint(true);
      if (exitHintTimerRef.current !== null) {
        window.clearTimeout(exitHintTimerRef.current);
      }
      exitHintTimerRef.current = window.setTimeout(() => {
        setShowExitHint(false);
        exitHintTimerRef.current = null;
      }, 2000);
    });

    return () => {
      void listener.then((handle) => handle.remove());
      if (exitHintTimerRef.current !== null) {
        window.clearTimeout(exitHintTimerRef.current);
        exitHintTimerRef.current = null;
      }
      setShowExitHint(false);
      lastLoginBackPressRef.current = 0;
    };
  }, [authMode, isLoggedIn]);

  // iOS: 키보드 높이를 CSS 변수로 전달 — 화면(웹뷰)은 고정한 채(resize=none)
  // 하단 입력 시트만 키보드 위로 올린다. 닫힐 때 잔여 스크롤 어긋남도 복원.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const platform = Capacitor.getPlatform();
    let cleanup: (() => void) | undefined;
    void import("@capacitor/keyboard").then(({ Keyboard }) => {
      // 키보드 위 기본 액세서리 바(완료 버튼) 복구 — 플러그인 설치 시 기본값이 숨김이라 명시적으로 켠다
      if (platform === "ios") {
        void Keyboard.setAccessoryBarVisible({ isVisible: true }).catch(() => { });
      }
      // 키보드가 가린 높이를 실측(visualViewport)으로 계산 — 플러그인 수치는 완료 버튼 바
      // 포함 여부가 기기마다 달라 시트와 키보드 사이에 틈이 생긴다. 실측이 항상 정확.
      const applyInset = (fallback: number) => {
        if (platform !== "ios") {
          document.documentElement.style.setProperty("--keyboard-inset", "0px");
          return;
        }
        const vv = window.visualViewport;
        const measured = vv ? Math.round(window.innerHeight - vv.height - vv.offsetTop) : 0;
        const inset = measured > 60 ? measured : fallback;
        document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
      };
      const show = Keyboard.addListener("keyboardWillShow", (info) => {
        applyInset(info.keyboardHeight);
        document.documentElement.classList.add("kb-open");
        // 키보드 등장 애니메이션이 끝난 뒤 실측값으로 한 번 더 보정
        window.setTimeout(() => applyInset(info.keyboardHeight), 350);
      });
      const hide = Keyboard.addListener("keyboardWillHide", () => {
        document.documentElement.style.setProperty("--keyboard-inset", "0px");
        document.documentElement.classList.remove("kb-open");
        window.scrollTo(0, 0);   // 키보드가 끌어올린 화면 어긋남 복원
      });
      cleanup = () => {
        void show.then((h) => h.remove());
        void hide.then((h) => h.remove());
        document.documentElement.style.setProperty("--keyboard-inset", "0px");
        document.documentElement.classList.remove("kb-open");
      };
    });
    return () => cleanup?.();
  }, []);

  // 로그인 상태면 안드로이드 FCM 토큰을 백엔드에 등록 (웹은 내부에서 스킵)
  useEffect(() => {
    saveAppSettings(appSettings);
    localStorage.removeItem("baseballCoachDarkModeEnabled");
    document.documentElement.classList.remove("theme-dark");
    document.documentElement.style.colorScheme = "light";
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
        runRouteTransition(() => {
          setAuthToken(token);
          setFavTeamCode(teamCode);
          setNickname(userNickname);
          setBuddyNickname(userBuddyNickname);
          setIsLoggedIn(true);
        });
        saveAuthSession(token, teamCode, userNickname, userBuddyNickname, remember);
        window.scrollTo({ top: 0, behavior: "auto" });
        return;
      }
    } catch {
      // Static demo fallback until the FastAPI auth server is connected.
    }

    if (id === DEMO_AUTH.id && password === DEMO_AUTH.pw) {
      runRouteTransition(() => {
        setAuthToken("");
        setFavTeamCode("");
        setNickname("야구팬");
        setBuddyNickname("");
        setIsLoggedIn(true);
      });
      saveAuthSession("", "", "야구팬", "", remember);
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    setLoginError("아이디 또는 비밀번호가 올바르지 않습니다.");
  }

  // 구글 로그인: 네이티브 플러그인으로 idToken 발급 → 백엔드(/auth/google) 검증 → 세션 저장.
  async function handleGoogleLogin() {
    setLoginError("");
    setLoginNotice("");

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      setLoginError("구글 로그인 설정이 필요합니다 (VITE_GOOGLE_CLIENT_ID).");
      return;
    }

    try {
      // 동적 import — 웹 프리뷰 등 네이티브 플러그인이 없는 환경에서 모듈 로드시 깨지지 않게.
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      await SocialLogin.initialize({ google: { webClientId: clientId } });
      // scopes를 넘기면 MainActivity 수정이 필요(@capgo 제약). idToken만 쓰므로 옵션 비움 —
      // 이메일·이름은 idToken 클레임에 이미 포함된다.
      const res = await SocialLogin.login({
        provider: "google",
        options: {},
      });
      const result = res.result as { idToken?: string | null };
      const idToken = result?.idToken;
      if (!idToken) {
        setLoginError("구글 토큰을 받지 못했습니다.");
        return;
      }

      const response = await fetch(apiUrl("/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail =
          typeof errorData?.detail === "string" ? errorData.detail : "";
        setLoginError(
          detail
            ? `구글 로그인 실패: ${detail}`
            : `구글 로그인 실패 (서버 응답 ${response.status})`,
        );
        return;
      }

      const data = await response.json();
      const token = data.access_token || data.token || "";
      const teamCode = data.user?.fav_team_code || "";
      const userNickname = data.user?.nickname || "";
      const userBuddyNickname = data.user?.buddy_nickname || "";
      runRouteTransition(() => {
        setAuthToken(token);
        setFavTeamCode(teamCode);
        setNickname(userNickname);
        setBuddyNickname(userBuddyNickname);
        setIsLoggedIn(true);
      });
      saveAuthSession(token, teamCode, userNickname, userBuddyNickname, true);
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLoginError(
        message
          ? `구글 로그인 중 오류: ${message}`
          : "구글 로그인 중 오류가 발생했습니다.",
      );
    }
  }

  function handleKakaoLogin() {
    setLoginError("");
    setLoginNotice("");
    const source = Capacitor.isNativePlatform() ? "?from=app" : "";
    window.location.href = apiUrl(`/auth/kakao/start${source}`);
  }

  function handleNaverLogin() {
    setLoginError("");
    setLoginNotice("");
    const source = Capacitor.isNativePlatform() ? "?from=app" : "";
    window.location.href = apiUrl(`/auth/naver/start${source}`);
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
        runRouteTransition(() => {
          setAuthMode("login");
          setLoginNotice("회원가입이 완료되었습니다. 로그인해주세요.");
          setRegisterError("");
        });
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
    runRouteTransition(() => {
      setAuthToken("");
      setFavTeamCode("");
      setNickname("");
      setBuddyNickname("");
      setIsLoggedIn(false);
      setLoginError("");
      setLoginNotice("");
      setRegisterError("");
      setAuthMode("login");
    });
    window.history.replaceState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  // 응원구단 변경: 전역 로그인 상태 + sessionStorage 갱신 → 메인/다마고치/구장정보/챗이 같은 팀 값을 봄
  function handleFavTeamChange(code: string) {
    runRouteTransition(() => setFavTeamCode(code));
    saveAuthSession(authToken, code, nickname, buddyNickname);
  }

  function handleBuddyNicknameChange(nextBuddyNickname: string) {
    setBuddyNickname(nextBuddyNickname);
    saveAuthSession(authToken, favTeamCode, nickname, nextBuddyNickname);
  }

  function handleNicknameChange(nextNickname: string) {
    setNickname(nextNickname);
    saveAuthSession(authToken, favTeamCode, nextNickname, buddyNickname);
  }

  const needsTeamOnboarding = FORCE_SHOW_TEAM_ONBOARDING || Boolean(authToken && !favTeamCode);

  return (
    <main className="app-shell">
      <FpsOverlay enabled={new URLSearchParams(window.location.search).has("fps")} />
      <div
        key={isLoggedIn ? "app" : authMode}
        className="app-route-transition"
      >
        {isLoggedIn ? (
          <>
          {!needsTeamOnboarding ? (
          <MainViewV2
            authToken={authToken}
            favTeamCode={favTeamCode}
            nickname={nickname}
            buddyNickname={buddyNickname}
            notificationEnabled={appSettings.notificationEnabled}
            onNotificationEnabledChange={(notificationEnabled) =>
              setAppSettings((current) => ({ ...current, notificationEnabled }))
            }
            onNicknameChange={handleNicknameChange}
            onFavTeamChange={handleFavTeamChange}
            onBuddyNicknameChange={handleBuddyNicknameChange}
            onLogout={handleLogout}
          />
          ) : null}
          {/* 최초 1회 응원구단 선택 — favTeamCode 없을 때만. FORCE 플래그는 개발용 */}
          {needsTeamOnboarding ? (
            <TeamSelectOnboarding
              authToken={authToken}
              onComplete={handleFavTeamChange}
              onBack={handleLogout}
            />
          ) : null}
          </>
        ) : authMode === "register" ? (
          <RegisterView
          error={registerError}
          onRegister={handleRegister}
          onShowLogin={() => {
            setRegisterError("");
            runRouteTransition(() => setAuthMode("login"));
          }}
          />
        ) : (
          <LoginView
          error={loginError}
          notice={loginNotice}
          showExitHint={showExitHint}
          onLogin={handleLogin}
          onGoogleLogin={handleGoogleLogin}
          onKakaoLogin={handleKakaoLogin}
          onNaverLogin={handleNaverLogin}
          onShowRegister={() => {
            setLoginError("");
            setLoginNotice("");
            runRouteTransition(() => setAuthMode("register"));
          }}
          />
        )}
      </div>
    </main>
  );
}
