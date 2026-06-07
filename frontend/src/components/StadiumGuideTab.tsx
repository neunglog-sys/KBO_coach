import { Lightbulb, MapPin } from "lucide-react";
import type { Stadium } from "../data/stadiumData";

export function StadiumGuideTab({ stadium }: { stadium: Stadium }) {
  return (
    <section className="stadium-page-tab-panel" role="tabpanel">
      <article className="stadium-page-guide-card">
        <img src={stadium.imageUrl} alt={`${stadium.stadiumName} 전경`} />
        <div className="stadium-page-guide-copy">
          <h3>{stadium.stadiumName}</h3>
          <p className="stadium-page-home-team">{stadium.teamNames.join(" / ")}</p>
          <p className="stadium-page-address">
            <MapPin aria-hidden="true" />
            <span>{stadium.address}</span>
          </p>
          <p className="stadium-page-description">{stadium.description}</p>
        </div>
      </article>

      <section className="stadium-page-tips">
        <h3>
          <Lightbulb aria-hidden="true" />
          이용 팁
        </h3>
        {stadium.tips.length ? (
          <ul>
            {stadium.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        ) : <p className="stadium-page-empty-copy">준비 중입니다</p>}
      </section>
    </section>
  );
}
