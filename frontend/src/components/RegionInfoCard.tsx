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
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
