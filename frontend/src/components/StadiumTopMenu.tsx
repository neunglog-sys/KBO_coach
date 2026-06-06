import { TopMenu, type TopMenuTarget } from "./TopMenu";

export type StadiumMenuTarget = TopMenuTarget;

interface StadiumTopMenuProps {
  onNavigate: (target: StadiumMenuTarget) => void;
}

export function StadiumTopMenu({ onNavigate }: StadiumTopMenuProps) {
  return <TopMenu active="stadium" className="stadium-page-top-menu" onNavigate={onNavigate} />;
}
