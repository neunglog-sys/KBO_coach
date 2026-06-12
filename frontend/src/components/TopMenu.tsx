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

const ICON_BASE_PATH = "/img/baseball_icons2";

const MENU_ITEMS: ReadonlyArray<{
  readonly target: TopMenuTarget;
  readonly icon: string;
  readonly imgSrc?: string;
  readonly label: string;
}> = [
  {
    target: "chat",
    icon: "💬",
    imgSrc: `${ICON_BASE_PATH}/채팅방.png?v=9`,
    label: "채팅방",
  },
  {
    target: "record",
    icon: "📒",
    imgSrc: `${ICON_BASE_PATH}/나만의기록.png?v=9`,
    label: "나만의 기록",
  },
  {
    target: "tamagotchi",
    icon: "🥕",
    imgSrc: `${ICON_BASE_PATH}/야구짝꿍.png?v=9`,
    label: "야구짝꿍",
  },
  {
    target: "stadium",
    icon: "🏟️",
    imgSrc: `${ICON_BASE_PATH}/구장정보.png?v=9`,
    label: "구장정보",
  },
  {
    target: "settings",
    icon: "⚙️",
    imgSrc: `${ICON_BASE_PATH}/설정.png?v=9`,
    label: "설정",
  },
];

export function TopMenu({ active, onNavigate, className = "" }: TopMenuProps) {
  return (
    <nav className={`app-top-menu ${className}`.trim()} aria-label="상단 메뉴">
      {MENU_ITEMS.map((item) => {
        const isActive = item.target === active;

        return (
          <button
            key={item.target}
            type="button"
            data-target={item.target}
            className={isActive ? "is-active" : ""}
            aria-current={isActive ? "page" : undefined}
            aria-label={`${item.label} 열기`}
            onClick={() => onNavigate(item.target)}
          >
            <span className="app-top-menu-icon" aria-hidden="true">
              {item.imgSrc ? <img src={item.imgSrc} alt="" /> : item.icon}
            </span>
            <span className="app-top-menu-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
