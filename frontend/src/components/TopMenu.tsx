import "./TopMenu.css";

export type TopMenuTarget =
  | "home"
  | "chat"
  | "record"
  | "tamagotchi"
  | "stadium"
  | "settings";

interface TopMenuProps {
  active: TopMenuTarget;
  onNavigate: (target: TopMenuTarget) => void;
  className?: string;
}

const MENU_ITEMS = [
  { target: "chat", icon: "💬", label: "채팅방" },
  { target: "record", icon: "📒", label: "나만의 기록" },
  { target: "tamagotchi", icon: "🥕", label: "야구짝꿍" },
  { target: "stadium", icon: "🏟️", label: "구장정보" },
  { target: "settings", icon: "⚙️", label: "설정" },
] as const;

export function TopMenu({ active, onNavigate, className = "" }: TopMenuProps) {
  return (
    <nav className={`app-top-menu ${className}`.trim()} aria-label="상단 메뉴">
      {MENU_ITEMS.map((item) => {
        const isActive = item.target === active;
        return (
          <button
            key={item.target}
            type="button"
            className={isActive ? "is-active" : ""}
            aria-current={isActive ? "page" : undefined}
            aria-label={`${item.label} 열기`}
            onClick={() => onNavigate(item.target)}
          >
            <span className="app-top-menu-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="app-top-menu-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
