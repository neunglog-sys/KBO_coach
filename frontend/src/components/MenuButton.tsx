import { Menu } from "lucide-react";

interface MenuButtonProps {
  onClick: () => void;
}

export function MenuButton({ onClick }: MenuButtonProps) {
  return (
    <button className="app-menu-button" type="button" aria-label="메뉴 열기" onClick={onClick}>
      <Menu aria-hidden="true" strokeWidth={2.6} />
    </button>
  );
}
