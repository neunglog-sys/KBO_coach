export type StadiumTab = "guide" | "food" | "region";

interface StadiumTabsProps {
  activeTab: StadiumTab;
  onChange: (tab: StadiumTab) => void;
}

const TABS: Array<{ id: StadiumTab; label: string }> = [
  { id: "guide", label: "구장안내" },
  { id: "food", label: "먹거리" },
  { id: "region", label: "지역정보" },
];

export function StadiumTabs({ activeTab, onChange }: StadiumTabsProps) {
  return (
    <div className="stadium-page-tabs" role="tablist" aria-label="구장 상세 정보">
      {TABS.map(({ id, label }) => (
        <button
          className={activeTab === id ? "is-active" : ""}
          type="button"
          role="tab"
          aria-selected={activeTab === id}
          key={id}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
