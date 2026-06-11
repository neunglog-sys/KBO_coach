import { Map, MapPin, Utensils } from "lucide-react";

export type StadiumTab = "guide" | "food" | "region";

interface StadiumTabsProps {
  activeTab: StadiumTab;
  onChange: (tab: StadiumTab) => void;
}

const TABS = [
  { id: "guide", label: "구장안내", Icon: Map },
  { id: "food", label: "먹거리", Icon: Utensils },
  { id: "region", label: "지역정보", Icon: MapPin },
] satisfies Array<{
  id: StadiumTab;
  label: string;
  Icon: typeof Map;
}>;

export function StadiumTabs({ activeTab, onChange }: StadiumTabsProps) {
  return (
    <div className="stadium-page-tabs" role="tablist" aria-label="구장 상세 정보">
      {TABS.map(({ id, label, Icon }) => (
        <button
          className={activeTab === id ? "is-active" : ""}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          key={id}
          onClick={() => onChange(id)}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
