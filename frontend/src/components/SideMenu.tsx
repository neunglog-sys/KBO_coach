import { Home, MessageCircle, NotebookPen, PawPrint, MapPin, Settings, X } from "lucide-react";
import type { TopMenuTarget } from "./TopMenu";
import "./SideMenu.css";

interface SideMenuProps {
  isOpen: boolean;
  active?: TopMenuTarget;
  onNavigate: (target: TopMenuTarget) => void;
  onClose: () => void;
}

const SIDE_MENU_ITEMS: ReadonlyArray<{
  readonly target: TopMenuTarget;
  readonly icon: typeof Home;
  readonly label: string;
}> = [
  { target: "home", icon: Home, label: "메인화면" },
  { target: "chat", icon: MessageCircle, label: "채팅방" },
  { target: "record", icon: NotebookPen, label: "나만의 기록" },
  { target: "tamagotchi", icon: PawPrint, label: "다마고치" },
  { target: "stadium", icon: MapPin, label: "구장정보" },
  { target: "settings", icon: Settings, label: "설정" },
];

export function SideMenu({ isOpen, active, onNavigate, onClose }: SideMenuProps) {
  return (
    <>
      <div
        className={`side-menu-backdrop ${isOpen ? "is-open" : ""}`}
        role="presentation"
        aria-hidden={!isOpen}
        onClick={onClose}
      />
      <nav
        className={`side-menu-panel ${isOpen ? "is-open" : ""}`}
        aria-label="이동 메뉴"
        aria-hidden={!isOpen}
      >
        <button className="side-menu-close" type="button" aria-label="메뉴 닫기" onClick={onClose}>
          <X aria-hidden="true" strokeWidth={2.8} />
        </button>
        <div className="side-menu-items">
          {SIDE_MENU_ITEMS.map(({ target, icon: Icon, label }) => (
            <button
              key={target}
              type="button"
              className={`side-menu-item ${target === active ? "is-active" : ""}`}
              aria-current={target === active ? "page" : undefined}
              onClick={() => {
                onClose();
                onNavigate(target);
              }}
            >
              <Icon aria-hidden="true" strokeWidth={2.4} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
