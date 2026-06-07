import type { LucideIcon } from "lucide-react";

interface RegionInfoCardProps {
  icon: LucideIcon;
  title: string;
  items: string[];
}

export function RegionInfoCard({ icon: Icon, title, items }: RegionInfoCardProps) {
  return (
    <article className="stadium-page-region-card">
      <span aria-hidden="true">
        <Icon strokeWidth={2.5} />
      </span>
      <div>
        <h3>{title}</h3>
        {items.length ? (
          <ul>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : <p className="stadium-page-empty-copy">준비 중입니다</p>}
      </div>
    </article>
  );
}
