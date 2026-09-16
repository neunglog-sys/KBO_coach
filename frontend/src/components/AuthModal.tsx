import { LoginView } from "./LoginView";
import { RegisterView } from "./RegisterView";

export type AuthModalMode = "login" | "register";

interface AuthModalProps {
  mode: AuthModalMode;
  loginError: string;
  loginNotice: string;
  registerError: string;
  onClose: () => void;
  onModeChange: (mode: AuthModalMode) => void;
  onLogin: (id: string, password: string, remember: boolean) => Promise<void>;
  onRegister: (id: string, password: string, nickname: string, favTeamCode: string) => Promise<void>;
  onGoogleLogin?: () => Promise<void>;
  onKakaoLogin?: () => void;
  onNaverLogin?: () => void;
}

export function AuthModal({
  mode,
  loginError,
  loginNotice,
  registerError,
  onClose,
  onModeChange,
  onLogin,
  onRegister,
  onGoogleLogin,
  onKakaoLogin,
  onNaverLogin,
}: AuthModalProps) {
  return (
    <div className="guest-auth-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`guest-auth-dialog is-${mode}`}
        role="dialog"
        aria-modal="true"
        aria-label={mode === "login" ? "로그인" : "회원가입"}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="guest-auth-close" aria-label="팝업 닫기" onClick={onClose}>
          ×
        </button>
        {mode === "register" ? (
          <RegisterView
            error={registerError}
            onRegister={onRegister}
            onShowLogin={() => onModeChange("login")}
          />
        ) : (
          <LoginView
            error={loginError}
            notice={loginNotice}
            onLogin={onLogin}
            onGoogleLogin={onGoogleLogin}
            onKakaoLogin={onKakaoLogin}
            onNaverLogin={onNaverLogin}
            onShowRegister={() => onModeChange("register")}
          />
        )}
      </section>
    </div>
  );
}
