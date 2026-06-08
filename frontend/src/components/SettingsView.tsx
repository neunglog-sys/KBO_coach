import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  LogOut,
  LockKeyhole,
  Moon,
  Trophy,
  User,
  UserX,
  X,
  type LucideIcon,
} from "lucide-react";
import { applyDarkMode, loadAppSettings, saveAppSettings } from "../appSettings";
import { apiUrl } from "../api";
import "./SettingsView.css";
import { TopMenu, type TopMenuTarget } from "./TopMenu";

type SettingsScreen = "main" | "myInfo" | "password" | "team";

interface SettingsViewProps {
  onClose: () => void;
  onNavigate?: (target: TopMenuTarget) => void;
  notificationEnabled?: boolean;
  darkModeEnabled?: boolean;
  onNotificationEnabledChange?: (enabled: boolean) => void;
  onDarkModeEnabledChange?: (enabled: boolean) => void;
  authToken?: string;
  favTeamCode?: string;
  onFavTeamChange?: (code: string) => void;
  onLogout?: () => void;
}

const TEAMS = [
  "KIA 타이거즈",
  "삼성 라이온즈",
  "LG 트윈스",
  "두산 베어스",
  "KT 위즈",
  "SSG 랜더스",
  "롯데 자이언츠",
  "한화 이글스",
  "NC 다이노스",
  "키움 히어로즈",
];

const TEAM_CODE: Record<string, string> = {
  "KIA 타이거즈": "HT",
  "삼성 라이온즈": "SS",
  "LG 트윈스": "LG",
  "두산 베어스": "OB",
  "KT 위즈": "KT",
  "SSG 랜더스": "SK",
  "롯데 자이언츠": "LT",
  "한화 이글스": "HH",
  "NC 다이노스": "NC",
  "키움 히어로즈": "WO",
};
const CODE_TO_TEAM: Record<string, string> = Object.fromEntries(
  Object.entries(TEAM_CODE).map(([name, code]) => [code, name]),
);

function IconCircle({
  icon: Icon,
  className = "",
}: {
  icon: LucideIcon;
  className?: string;
}) {
  return (
    <span className={`settings-icon-circle ${className}`} aria-hidden="true">
      <Icon strokeWidth={2.6} />
    </span>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="settings-back-button" type="button" aria-label="뒤로가기" onClick={onClick}>
      <ArrowLeft aria-hidden="true" strokeWidth={2.8} />
    </button>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="settings-close-button" type="button" aria-label="메인화면으로 이동" onClick={onClick}>
      <X aria-hidden="true" strokeWidth={2.8} />
    </button>
  );
}

function SettingsHeader({
  title,
  onBack,
  onClose,
}: {
  title: string;
  onBack: () => void;
  onClose?: () => void;
}) {
  return (
    <header className="settings-header">
      <BackButton onClick={onBack} />
      <h2>{title}</h2>
      {onClose ? <CloseButton onClick={onClose} /> : <span />}
    </header>
  );
}

function ToggleRow({
  icon,
  title,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="settings-toggle-row">
      <IconCircle icon={icon} />
      <div className="settings-row-text">
        <strong>{title}</strong>
        <span>on/off</span>
      </div>
      <button
        className={`settings-toggle ${checked ? "is-on" : ""}`}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span />
        <b>{checked ? "ON" : "OFF"}</b>
      </button>
    </div>
  );
}

function MenuCard({
  icon,
  title,
  description,
  danger,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`settings-menu-card ${danger ? "is-danger" : ""}`}
      type="button"
      onClick={onClick}
    >
      <IconCircle icon={icon} className={danger ? "is-danger" : ""} />
      <span className="settings-row-text">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </span>
      <ChevronRight className="settings-chevron" aria-hidden="true" strokeWidth={3} />
    </button>
  );
}

export default function SettingsView({
  onClose,
  onNavigate,
  notificationEnabled: controlledNotificationEnabled,
  darkModeEnabled: controlledDarkModeEnabled,
  onNotificationEnabledChange,
  onDarkModeEnabledChange,
  authToken,
  favTeamCode,
  onFavTeamChange,
  onLogout = () => {},
}: SettingsViewProps) {
  const [screen, setScreen] = useState<SettingsScreen>("main");
  const [fallbackSettings, setFallbackSettings] = useState(loadAppSettings);
  const [selectedTeam, setSelectedTeam] = useState(
    CODE_TO_TEAM[favTeamCode ?? ""] ?? "삼성 라이온즈",
  );
  const [notice, setNotice] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [confirmAction, setConfirmAction] = useState<"logout" | "delete" | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notificationEnabled =
    controlledNotificationEnabled ?? fallbackSettings.notificationEnabled;
  const darkModeEnabled = controlledDarkModeEnabled ?? fallbackSettings.darkModeEnabled;

  function handleNotificationChange(enabled: boolean) {
    if (onNotificationEnabledChange) {
      onNotificationEnabledChange(enabled);
      return;
    }
    setFallbackSettings((current) => {
      const next = { ...current, notificationEnabled: enabled };
      saveAppSettings(next);
      return next;
    });
  }

  function handleDarkModeChange(enabled: boolean) {
    if (onDarkModeEnabledChange) {
      onDarkModeEnabledChange(enabled);
      return;
    }
    setFallbackSettings((current) => {
      const next = { ...current, darkModeEnabled: enabled };
      saveAppSettings(next);
      applyDarkMode(enabled);
      return next;
    });
  }

  function goBack() {
    setNotice("");
    if (screen === "password" || screen === "team") {
      setScreen("myInfo");
      return;
    }
    if (screen === "myInfo") {
      setScreen("main");
      return;
    }
    onClose();
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("비밀번호 변경 요청이 준비되었습니다.");
  }

  async function handlePasswordChangeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");

    if (!authToken) {
      setNotice("로그인 후 비밀번호를 변경할 수 있습니다.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotice("새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setNotice("새 비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/auth/me/password"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          current_password: passwordForm.currentPassword,
          new_password: passwordForm.newPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "비밀번호 변경에 실패했습니다.");

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice("비밀번호가 변경되었습니다.");
      window.setTimeout(() => {
        setNotice("");
        setScreen("myInfo");
      }, 900);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogoutConfirm() {
    setNotice("");
    if (authToken) {
      try {
        await fetch(apiUrl("/auth/logout"), {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // JWT logout is completed by clearing client-side session state.
      }
    }
    setConfirmAction(null);
    onLogout();
  }

  async function handleDeleteAccountConfirm() {
    setNotice("");

    if (deleteConfirmText.trim() !== "탈퇴") {
      setNotice("회원탈퇴를 진행하려면 확인 문구에 '탈퇴'를 입력해주세요.");
      return;
    }

    if (!authToken) {
      setNotice("로그인 후 회원탈퇴를 진행할 수 있습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/auth/me"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "회원탈퇴에 실패했습니다.");

      setConfirmAction(null);
      setDeleteConfirmText("");
      onLogout();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "회원탈퇴에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function closeConfirmModal() {
    if (isSubmitting) return;
    setConfirmAction(null);
    setDeleteConfirmText("");
  }

  async function handleTeamSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = TEAM_CODE[selectedTeam];
    if (!code) {
      setNotice("알 수 없는 팀입니다.");
      return;
    }
    if (!authToken) {   // 비로그인/데모: 전역 상태만 갱신
      onFavTeamChange?.(code);
      setNotice(`${selectedTeam}으로 응원구단을 변경했습니다.`);
      return;
    }
    try {
      const res = await fetch(apiUrl("/auth/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ fav_team_code: code }),
      });
      if (!res.ok) throw new Error("update failed");
      onFavTeamChange?.(code);   // 전역 로그인 상태 + sessionStorage 갱신 → 메인/다마고치/구장정보/챗 동기화
      setNotice(`${selectedTeam}으로 응원구단을 변경했습니다.`);
      return;
    } catch {
      setNotice("응원구단 변경에 실패했어요. 잠시 후 다시 시도해주세요.");
      return;
    }
  }

  return (
    <section className="settings-app-screen">
      {screen === "main" ? (
        <>
          <SettingsHeader title="환경 설정" onBack={goBack} />
          <TopMenu
            active="settings"
            className="settings-top-menu"
            onNavigate={(target) => {
              if (target === "settings") return;
              onNavigate?.(target);
            }}
          />

          <div className="settings-stack">
            <MenuCard
              icon={User}
              title="내 정보"
              description="프로필 및 계정 정보를 확인하고 관리합니다."
              onClick={() => setScreen("myInfo")}
            />
            <div className="settings-large-card">
              <ToggleRow
                icon={Bell}
                title="알림 기능"
                checked={notificationEnabled}
                onChange={handleNotificationChange}
              />
              <div className="settings-divider" />
              <ToggleRow
                icon={Moon}
                title="다크모드"
                checked={darkModeEnabled}
                onChange={handleDarkModeChange}
              />
            </div>
          </div>
        </>
      ) : null}

      {screen === "myInfo" ? (
        <>
          <SettingsHeader title="내 정보" onBack={goBack} onClose={onClose} />
          <div className="settings-card-list">
            <MenuCard icon={LockKeyhole} title="비밀번호 변경" onClick={() => setScreen("password")} />
            <MenuCard icon={Trophy} title="응원구단 변경" onClick={() => setScreen("team")} />
            <MenuCard
              icon={LogOut}
              title="로그아웃"
              onClick={() => {
                setNotice("");
                setConfirmAction("logout");
              }}
            />
            <MenuCard
              icon={UserX}
              title="회원탈퇴"
              danger
              onClick={() => {
                setNotice("");
                setDeleteConfirmText("");
                setConfirmAction("delete");
              }}
            />
          </div>
          {notice ? <p className="settings-notice">{notice}</p> : null}
        </>
      ) : null}

      {screen === "password" ? (
        <>
          <SettingsHeader title="비밀번호 변경" onBack={goBack} onClose={onClose} />
          <form className="settings-form-card" onSubmit={handlePasswordChangeSubmit}>
            <label>
              <span>현재 비밀번호</span>
              <input
                type="password"
                autoComplete="current-password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
                }
                required
              />
            </label>
            <label>
              <span>새로운 비밀번호</span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
                }
                required
              />
            </label>
            <label>
              <span>새로운 비밀번호 확인</span>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
                }
                required
              />
            </label>
            <button className="settings-primary-button" type="submit" disabled={isSubmitting}>
              변경하기
            </button>
            {notice ? <p className="settings-notice">{notice}</p> : null}
          </form>
        </>
      ) : null}

      {screen === "team" ? (
        <>
          <SettingsHeader title="응원구단 변경" onBack={goBack} onClose={onClose} />
          <form className="settings-team-card" onSubmit={handleTeamSubmit}>
            <fieldset>
              <legend className="hidden">응원구단 선택</legend>
              {TEAMS.map((team) => (
                <label className="settings-radio-row" key={team}>
                  <input
                    type="radio"
                    name="favoriteTeam"
                    value={team}
                    checked={selectedTeam === team}
                    onChange={() => setSelectedTeam(team)}
                  />
                  <span aria-hidden="true" />
                  <strong>{team}</strong>
                </label>
              ))}
            </fieldset>
            <button className="settings-primary-button" type="submit">
              변경하기
            </button>
            {notice ? <p className="settings-notice">{notice}</p> : null}
          </form>
        </>
      ) : null}

      <div className="settings-stadium-decoration" aria-hidden="true">
        <span />
        <span />
      </div>

      {confirmAction ? (
        <div className="settings-confirm-backdrop" role="presentation" onClick={closeConfirmModal}>
          <section
            className="settings-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-label={confirmAction === "logout" ? "로그아웃 확인" : "회원탈퇴 확인"}
            onClick={(event) => event.stopPropagation()}
          >
            {confirmAction === "logout" ? (
              <>
                <h3>로그아웃 하시겠습니까?</h3>
                <p>현재 로그인 세션이 삭제되고 로그인 화면으로 이동합니다.</p>
                <div className="settings-confirm-actions">
                  <button type="button" className="settings-secondary-button" onClick={closeConfirmModal}>
                    취소
                  </button>
                  <button
                    type="button"
                    className="settings-primary-button"
                    disabled={isSubmitting}
                    onClick={() => void handleLogoutConfirm()}
                  >
                    로그아웃
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>정말 회원탈퇴 하시겠습니까?</h3>
                <p>
                  탈퇴 후 계정 정보는 복구할 수 없습니다. 계속하려면 아래 입력칸에
                  <strong> 탈퇴</strong>를 입력해주세요.
                </p>
                <input
                  className="settings-confirm-input"
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder="탈퇴"
                  disabled={isSubmitting}
                />
                <div className="settings-confirm-actions">
                  <button type="button" className="settings-secondary-button" onClick={closeConfirmModal}>
                    취소
                  </button>
                  <button
                    type="button"
                    className="settings-primary-button is-danger"
                    disabled={isSubmitting || deleteConfirmText.trim() !== "탈퇴"}
                    onClick={() => void handleDeleteAccountConfirm()}
                  >
                    {isSubmitting ? "탈퇴 처리 중..." : "회원탈퇴"}
                  </button>
                </div>
              </>
            )}
            {notice ? <p className="settings-notice">{notice}</p> : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}
