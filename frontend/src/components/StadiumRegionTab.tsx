import { Building2, Bus, Camera } from "lucide-react";
import type { Stadium } from "../data/stadiumData";
import { RegionInfoCard } from "./RegionInfoCard";

export function StadiumRegionTab({ stadium }: { stadium: Stadium }) {
  return (
    <section className="stadium-page-region-list stadium-page-tab-panel" role="tabpanel">
      <RegionInfoCard
        icon={Bus}
        title="교통"
        items={stadium.regionInfo.transportation}
      />
      <RegionInfoCard
        icon={Camera}
        title="주변 관광"
        items={stadium.regionInfo.attractions}
      />
      <RegionInfoCard
        icon={Building2}
        title="주변 지역"
        items={stadium.regionInfo.nearbyAreas}
      />
    </section>
  );
}
