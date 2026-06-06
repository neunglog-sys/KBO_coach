import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  LockKeyhole,
  Moon,
  Trophy,
  User,
  UserX,
  type LucideIcon,
} from "lucide-react";
import "./SettingsView.css";
import { TopMenu, type TopMenuTarget } from "./TopMenu";

type SettingsScreen = "main" | "myInfo" | "password" | "team";

interface SettingsViewProps {
  onClose: () => void;
  onNavigate?: (target: TopMenuTarget) => void;
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

function SettingsHeader({
  title,
  onBack,
}: {
  title: string;
  onBack: () => void;
}) {
  return (
    <header className="settings-header">
      <BackButton onClick={onBack} />
      <h2>{title}</h2>
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

export default function SettingsView({ onClose, onNavigate }: SettingsViewProps) {
  const [screen, setScreen] = useState<SettingsScreen>("main");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("삼성 라이온즈");
  const [notice, setNotice] = useState("");

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

  function handleTeamSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(`${selectedTeam}으로 응원구단을 변경했습니다.`);
  }

  return (
    <section className={`settings-app-screen ${darkModeEnabled ? "is-dark-preview" : ""}`}>
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
                onChange={setNotificationEnabled}
              />
              <div className="settings-divider" />
              <ToggleRow
                icon={Moon}
                title="다크모드"
                checked={darkModeEnabled}
                onChange={setDarkModeEnabled}
              />
            </div>
          </div>
        </>
      ) : null}

      {screen === "myInfo" ? (
        <>
          <SettingsHeader title="내 정보" onBack={goBack} />
          <div className="settings-card-list">
            <MenuCard icon={LockKeyhole} title="비밀번호 변경" onClick={() => setScreen("password")} />
            <MenuCard icon={Trophy} title="응원구단 변경" onClick={() => setScreen("team")} />
            <MenuCard icon={UserX} title="회원탈퇴" danger onClick={() => setNotice("회원탈퇴 기능은 준비 중입니다.")} />
          </div>
          {notice ? <p className="settings-notice">{notice}</p> : null}
        </>
      ) : null}

      {screen === "password" ? (
        <>
          <SettingsHeader title="비밀번호 변경" onBack={goBack} />
          <form className="settings-form-card" onSubmit={handlePasswordSubmit}>
            <label>
              <span>현재 비밀번호</span>
              <input type="password" autoComplete="current-password" required />
            </label>
            <label>
              <span>새로운 비밀번호</span>
              <input type="password" autoComplete="new-password" required />
            </label>
            <label>
              <span>새로운 비밀번호 확인</span>
              <input type="password" autoComplete="new-password" required />
            </label>
            <button className="settings-primary-button" type="submit">
              변경하기
            </button>
            {notice ? <p className="settings-notice">{notice}</p> : null}
          </form>
        </>
      ) : null}

      {screen === "team" ? (
        <>
          <SettingsHeader title="응원구단 변경" onBack={goBack} />
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
    </section>
  );
}
