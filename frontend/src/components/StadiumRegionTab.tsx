import type { Stadium } from "../data/stadiumData";
import { RegionInfoCard } from "./RegionInfoCard";

export function StadiumRegionTab({ stadium }: { stadium: Stadium }) {
  return (
    <section className="stadium-page-region-list stadium-page-tab-panel" role="tabpanel">
      <RegionInfoCard
        iconSrc="/img/baseball_icons2/transport.svg"
        title="교통"
        items={stadium.regionInfo.transportation}
      />
      <RegionInfoCard
        iconSrc="/img/baseball_icons2/tour.svg"
        title="주변 관광"
        items={stadium.regionInfo.attractions}
      />
      <RegionInfoCard
        iconSrc="/img/baseball_icons2/area.svg"
        title="주변 지역"
        items={stadium.regionInfo.nearbyAreas}
      />
    </section>
  );
}
