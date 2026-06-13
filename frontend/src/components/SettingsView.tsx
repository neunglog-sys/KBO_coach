import { FormEvent, useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { AppBackButton } from "./AppBackButton";
import { loadAppSettings, saveAppSettings } from "../appSettings";
import { apiUrl } from "../api";
import "./SettingsView.css";
import type { TopMenuTarget } from "./TopMenu";
import { MenuButton } from "./MenuButton";
import { SideMenu } from "./SideMenu";

type SettingsScreen = "main" | "myInfo" | "password" | "team";

interface SettingsViewProps {
  onClose: () => void;
  onNavigate?: (target: TopMenuTarget) => void;
  nickname?: string;
  notificationEnabled?: boolean;
  onNotificationEnabledChange?: (enabled: boolean) => void;
  onNicknameChange?: (nickname: string) => void;
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

const SETTING_ICONS = {
  profile: "/img/baseball_icons2/profile.png",
  password: "/img/baseball_icons2/password.png",
  teamChange: "/img/baseball_icons2/team_change.png",
  logout: "/img/baseball_icons2/logout.png",
  withdraw: "/img/baseball_icons2/withdraw.png",
  notification: "/img/baseball_icons2/notification.png",
  settings: "/img/baseball_icons2/settings.svg",
} as const;

function roParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  if (code < 0 || code > 11171) return "으로";
  return code % 28 === 0 || code % 28 === 8 ? "로" : "으로";
}

function ImgCircle({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  return (
    <span className={`settings-img-circle ${className}`} aria-hidden="true">
      <img src={src} alt="" className="setting-icon" />
    </span>
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
  onMenuOpen,
}: {
  title: string;
  onBack: () => void;
  onClose?: () => void;
  onMenuOpen: () => void;
}) {
  return (
    <header className="settings-header">
      <AppBackButton onClick={onBack} />
      <h2>{title}</h2>
      <div className="settings-header-actions">
        <MenuButton onClick={onMenuOpen} />
        {onClose ? <CloseButton onClick={onClose} /> : null}
      </div>
    </header>
  );
}

function ToggleRow({
  iconSrc,
  title,
  checked,
  onChange,
}: {
  iconSrc: string;
  title: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="settings-toggle-row">
      <ImgCircle src={iconSrc} />
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
  iconSrc,
  title,
  description,
  danger,
  onClick,
}: {
  iconSrc: string;
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
      <ImgCircle src={iconSrc} className={danger ? "is-danger" : ""} />
      <span className="settings-row-text">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
      </span>
      <ChevronRight className="settings-chevron" aria-hidden="true" strokeWidth={3} />
    </button>
  );
}

function ActionRow({
  iconSrc,
  title,
  onClick,
}: {
  iconSrc: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button className="settings-action-row" type="button" onClick={onClick}>
      <ImgCircle src={iconSrc} />
      <span className="settings-row-text">
        <strong>{title}</strong>
      </span>
      <ChevronRight className="settings-chevron" aria-hidden="true" strokeWidth={3} />
    </button>
  );
}

export default function SettingsView({
  onClose,
  onNavigate,
  nickname,
  notificationEnabled: controlledNotificationEnabled,
  onNotificationEnabledChange,
  onNicknameChange,
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
  const [nicknameInput, setNicknameInput] = useState(nickname?.trim() || "");
  const [sideMenuOpen, setSideMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"logout" | "delete" | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const notificationEnabled =
    controlledNotificationEnabled ?? fallbackSettings.notificationEnabled;

  useEffect(() => {
    setNicknameInput(nickname?.trim() || "");
  }, [nickname]);

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

  async function handleNicknameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextNickname = nicknameInput.trim();
    setNotice("");

    if (!nextNickname) {
      setNotice("닉네임을 입력해주세요.");
      return;
    }
    if (nextNickname.length > 50) {
      setNotice("닉네임은 50자 이하로 입력해주세요.");
      return;
    }
    if (!authToken) {
      onNicknameChange?.(nextNickname);
      setNotice("닉네임이 변경되었습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(apiUrl("/auth/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ nickname: nextNickname }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.detail || "닉네임 변경에 실패했습니다.");
      const savedNickname = String(data?.nickname || nextNickname);
      setNicknameInput(savedNickname);
      onNicknameChange?.(savedNickname);
      setNotice("닉네임이 변경되었습니다.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "닉네임 변경에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
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
    if (!authToken) {
      onFavTeamChange?.(code);
      setNotice(`${selectedTeam}${roParticle(selectedTeam)} 응원구단을 변경했습니다.`);
      window.setTimeout(() => { setNotice(""); setScreen("myInfo"); }, 1000);
      return;
    }
    try {
      const res = await fetch(apiUrl("/auth/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ fav_team_code: code }),
      });
      if (!res.ok) throw new Error("update failed");
      onFavTeamChange?.(code);
      setNotice(`${selectedTeam}${roParticle(selectedTeam)} 응원구단을 변경했습니다.`);
      window.setTimeout(() => { setNotice(""); setScreen("myInfo"); }, 1000);
      return;
    } catch {
      setNotice("응원구단 변경에 실패했어요. 잠시 후 다시 시도해주세요.");
      return;
    }
  }

  return (
    <section className="settings-app-screen">
      <div className="settings-screen-anim" key={screen}>
        {screen === "main" ? (
          <>
            <SettingsHeader title="환경 설정" onBack={goBack} onMenuOpen={() => setSideMenuOpen(true)} />

            <div className="settings-stack">
              <MenuCard
                iconSrc={SETTING_ICONS.profile}
                title="내 정보"
                description="프로필 및 계정 정보를 확인하고 관리합니다."
                onClick={() => setScreen("myInfo")}
              />
              <div className="settings-large-card">
                <ToggleRow
                  iconSrc={SETTING_ICONS.notification}
                  title="알림 기능"
                  checked={notificationEnabled}
                  onChange={handleNotificationChange}
                />
                <div className="settings-divider" />
                <ActionRow
                  iconSrc={SETTING_ICONS.logout}
                  title="로그아웃"
                  onClick={() => {
                    setNotice("");
                    setConfirmAction("logout");
                  }}
                />
              </div>
            </div>
          </>
        ) : null}

        {screen === "myInfo" ? (
          <>
            <SettingsHeader title="내 정보" onBack={goBack} onMenuOpen={() => setSideMenuOpen(true)} />

            <div className="settings-card-list">
              <form className="settings-account-card settings-nickname-form" onSubmit={handleNicknameSubmit}>
                <ImgCircle src={SETTING_ICONS.profile} />
                <div className="settings-nickname-fields">
                  <label htmlFor="settings-nickname">닉네임</label>
                  <div>
                    <input
                      id="settings-nickname"
                      value={nicknameInput}
                      maxLength={50}
                      onChange={(event) => setNicknameInput(event.target.value)}
                    />
                    <button
                      className="settings-blue-action-button"
                      type="submit"
                      disabled={isSubmitting || nicknameInput.trim() === (nickname?.trim() || "")}
                    >
                      변경
                    </button>
                  </div>
                </div>
              </form>

              <MenuCard iconSrc={SETTING_ICONS.password} title="비밀번호 변경" onClick={() => setScreen("password")} />
              <MenuCard iconSrc={SETTING_ICONS.teamChange} title="응원구단 변경" onClick={() => setScreen("team")} />
              <MenuCard
                iconSrc={SETTING_ICONS.withdraw}
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
            <SettingsHeader title="비밀번호 변경" onBack={goBack} onMenuOpen={() => setSideMenuOpen(true)} />
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
              <button className="settings-primary-button settings-blue-action-button" type="submit" disabled={isSubmitting}>
                변경하기
              </button>
              {notice ? <p className="settings-notice">{notice}</p> : null}
            </form>
          </>
        ) : null}

        {screen === "team" ? (
          <>
            <SettingsHeader title="응원구단 변경" onBack={goBack} onMenuOpen={() => setSideMenuOpen(true)} />
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
              <button className="settings-primary-button settings-blue-action-button" type="submit">
                변경하기
              </button>
              {notice ? <p className="settings-notice">{notice}</p> : null}
            </form>
          </>
        ) : null}
      </div>

      <SideMenu
        isOpen={sideMenuOpen}
        active="settings"
        onNavigate={(target) => onNavigate?.(target)}
        onClose={() => setSideMenuOpen(false)}
      />

      <div className="settings-stadium-decoration" aria-hidden="true">
        <span />
        <span />
      </div>

      {confirmAction ? (
        <div className="settings-confirm-backdrop" role="presentation" onClick={closeConfirmModal}>
          <section
            className={`settings-confirm-modal is-${confirmAction}`}
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
                    className="settings-primary-button settings-blue-action-button"
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
                    className="settings-primary-button settings-blue-action-button settings-delete-confirm-button is-danger"
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