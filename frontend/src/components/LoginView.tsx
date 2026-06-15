import { FormEvent, useState } from "react";

interface LoginViewProps {
  error: string;
  notice: string;
  showExitHint?: boolean;
  onLogin: (id: string, password: string, remember: boolean) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  onKakaoLogin?: () => void;
  onNaverLogin?: () => void;
  onShowRegister: () => void;
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
      {off ? <line x1="3" y1="3" x2="21" y2="21" /> : null}
    </svg>
  );
}

export function LoginView({
  error,
  notice,
  showExitHint = false,
  onLogin,
  onGoogleLogin,
  onKakaoLogin,
  onNaverLogin,
  onShowRegister,
}: LoginViewProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialNotice, setSocialNotice] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onLogin(id.trim(), password, rememberLogin);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSocialClick() {
    setSocialNotice("소셜 로그인은 준비 중이에요. 회원가입으로 시작해 주세요.");
  }

  function handleGoogleClick() {
    setSocialNotice("");
    if (onGoogleLogin) {
      void onGoogleLogin();
    } else {
      handleSocialClick();
    }
  }

  function handleKakaoClick() {
    setSocialNotice("");
    if (onKakaoLogin) {
      onKakaoLogin();
    } else {
      handleSocialClick();
    }
  }

  function handleNaverClick() {
    setSocialNotice("");
    if (onNaverLogin) {
      onNaverLogin();
    } else {
      handleSocialClick();
    }
  }

  return (
    <section className="login-view auth-login-screen" aria-label="로그인">
      <form id="loginForm" className="auth-login-card" onSubmit={handleSubmit}>
        <div className="auth-hero">
          <img className="auth-hero-img" src="/img/gongbok.png" alt="공복이" width={280} height={280} />
        </div>

        <div className="auth-line-field">
          <input
            id="userId"
            type="text"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ID"
            value={id}
            onChange={(event) => setId(event.target.value)}
            required
          />
        </div>

        <div className="auth-line-field" style={{ marginBottom: "10px" }}>
          <input
            id="userPw"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="PW"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            className="auth-eye"
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 표시"}
            onClick={() => setShowPassword((prev) => !prev)}
          >
            <EyeIcon off={showPassword} />
          </button>
        </div>

        {error ? (
          <p id="loginError" className="error-text" role="alert">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="notice-text" aria-live="polite">
            {notice}
          </p>
        ) : null}

        <label
          className="auth-remember"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "8px",
            marginTop: "8px",
            marginBottom: "14px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={rememberLogin}
            onChange={(event) => setRememberLogin(event.target.checked)}
            style={{
              width: "16px",
              height: "16px",
              minWidth: "16px",
              minHeight: "16px",
              margin: 0,
              padding: 0,
              flexShrink: 0,
              cursor: "pointer",
              accentColor: "#258cff",
              appearance: "auto",
              WebkitAppearance: "checkbox",
            }}
          />
          <span>자동 로그인</span>
        </label>

        <button type="submit" className="auth-login-submit" disabled={isSubmitting} style={{ marginTop: "0px" }}>
          {isSubmitting ? "확인 중" : "LOGIN"}
        </button>

        <p className="auth-login-hint">
          계정이 없으신가요?{" "}
          <button type="button" className="auth-login-link" onClick={onShowRegister}>
            회원가입
          </button>
        </p>

        <div
          style={{
            width: "220px",
            margin: "0 auto",
          }}
        >
          <div className="auth-social" role="group" aria-label="소셜 로그인">
            <button
              type="button"
              className="auth-social-button is-google"
              aria-label="구글로 로그인"
              onClick={handleGoogleClick}
            >
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path
                  fill="#FFC107"
                  d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                />
              </svg>
            </button>
            <button
              type="button"
              className="auth-social-button is-kakao"
              aria-label="카카오로 로그인"
              onClick={handleKakaoClick}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#3A1D1D"
                  d="M12 4C6.48 4 2 7.58 2 12c0 2.86 1.92 5.36 4.8 6.77-.21.74-.76 2.68-.87 3.1 0 0-.02.15.08.21.1.06.22.02.22.02.29-.04 3.36-2.2 3.9-2.58.6.08 1.22.13 1.87.13 5.52 0 10-3.58 10-8S17.52 4 12 4z"
                />
              </svg>
            </button>
            <button
              type="button"
              className="auth-social-button is-naver"
              aria-label="네이버로 로그인"
              onClick={handleNaverClick}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#ffffff"
                  d="M16.273 12.845 7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727z"
                />
              </svg>
            </button>
          </div>

          <p
            style={{
              width: "100%",
              margin: "10px 0 0",
              fontSize: "10pt",
              lineHeight: "1.35",
              color: "#7d8794",
              textAlign: "center",
              wordBreak: "keep-all",
            }}
          >
            로그인 시{" "}
            <span
              style={{
                color: "#258cff",
                textDecoration: "underline",
              }}
            >
              서비스 약관
            </span>
            {" "}및{" "}
            <span
              style={{
                color: "#258cff",
                textDecoration: "underline",
              }}
            >
              개인정보 처리방침
            </span>
            에 동의합니다.
          </p>
        </div>

        <p className="auth-social-notice" aria-live="polite">
          {socialNotice}
        </p>
      </form>
      {showExitHint ? (
        <p className="auth-exit-hint" role="status" aria-live="polite">
          뒤로가기를 한번 더 누르면 앱이 꺼집니다.
        </p>
      ) : null}
    </section>
  );
}
