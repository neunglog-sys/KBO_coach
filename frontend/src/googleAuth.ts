import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";

const GOOGLE_WEB_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || "";

let initializationPromise: Promise<void> | null = null;

export function isGoogleLoginConfigured() {
  return Boolean(GOOGLE_WEB_CLIENT_ID);
}

export function initializeGoogleLogin() {
  if (!GOOGLE_WEB_CLIENT_ID) {
    return Promise.reject(new Error("VITE_GOOGLE_CLIENT_ID is not configured"));
  }

  if (!initializationPromise) {
    const google = Capacitor.isNativePlatform()
      ? { webClientId: GOOGLE_WEB_CLIENT_ID }
      : {
          webClientId: GOOGLE_WEB_CLIENT_ID,
          // 웹 OAuth 팝업은 인증 후 이 주소로 돌아온다. 경로에 따라 redirect URI가
          // 달라지지 않도록 루트 URL로 고정하고 Google Console에도 동일하게 등록한다.
          redirectUrl: `${window.location.origin}/`,
        };

    initializationPromise = SocialLogin.initialize({ google }).catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

export async function loginWithGoogle() {
  await initializeGoogleLogin();
  return SocialLogin.login({
    provider: "google",
    // Android는 빈 옵션일 때 Credential Manager 기본 로그인 화면을 사용한다.
    // 웹은 플러그인이 openid/email/profile 범위를 자동으로 요청한다.
    options: {},
  });
}

// 웹 OAuth 완료 팝업은 앱을 새로 로드한다. 이때 플러그인의 웹 구현이 로드되어야
// 저장된 OAuth 상태를 읽고 원래 창으로 토큰을 전달할 수 있으므로 앱 시작과 함께 준비한다.
if (!Capacitor.isNativePlatform() && GOOGLE_WEB_CLIENT_ID) {
  void initializeGoogleLogin().catch((error) => {
    console.error("Google 로그인 초기화 실패", error);
  });
}
