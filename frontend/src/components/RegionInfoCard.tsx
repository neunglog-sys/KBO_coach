interface RegionInfoCardProps {
  iconSrc: string;
  title: string;
  items: string[];
}

export function RegionInfoCard({ iconSrc, title, items }: RegionInfoCardProps) {
  return (
    <article className="stadium-page-region-card">
      <span aria-hidden="true">
        <img src={iconSrc} alt="" />
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
