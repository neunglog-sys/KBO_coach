import { Lightbulb, MapPin } from "lucide-react";
import type { Stadium } from "../data/stadiumData";
import { StadiumMap } from "./StadiumMap";

export function StadiumGuideTab({ stadium, stadiums }: { stadium: Stadium; stadiums: Stadium[] }) {
  return (
    <section className="stadium-page-tab-panel" role="tabpanel">
      <article className="stadium-page-guide-card">
        <div className="stadium-page-guide-image">
          <img
            src={stadium.imageUrl}
            alt={`${stadium.stadiumName} 전경`}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = "/img/background.png";
            }}
          />
          <span className="stadium-page-ai-image-badge">AI로 만든 이미지입니다.</span>
        </div>
        <div className="stadium-page-guide-copy">
          <h3>{stadium.stadiumName}</h3>
          <div className="stadium-page-guide-details">
            <p className="stadium-page-home-team">{stadium.teamNames.join(" / ")}</p>
            <p className="stadium-page-address">
              <MapPin aria-hidden="true" />
              <span>{stadium.address}</span>
            </p>
            <p className="stadium-page-description">{stadium.description}</p>
          </div>
        </div>
      </article>

      <section className="stadium-page-map-card">
        <h3 className="stadium-page-section-title">
          <MapPin aria-hidden="true" />
          구장 위치
        </h3>
        <StadiumMap stadiums={stadiums} selectedTeamCode={stadium.teamCode} />
      </section>

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
