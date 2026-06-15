import type { CSSProperties } from "react";
import {
  BusFront,
  CarTaxiFront,
  SquareParking,
  TrainFront,
  type LucideIcon,
} from "lucide-react";
import type { Stadium } from "../data/stadiumData";

type TransportationKind = "subway" | "bus" | "taxi" | "parking";

const TEAM_ACCENTS: Record<string, string> = {
  LG: "195, 4, 82",
  OB: "19, 18, 48",
  WO: "123, 15, 31",
  SK: "206, 14, 45",
  KT: "43, 43, 43",
  HT: "200, 16, 46",
  SS: "7, 76, 161",
  LT: "4, 30, 66",
  HH: "250, 92, 30",
  NC: "49, 82, 136",
};

const TRANSPORTATION_META: Record<
  TransportationKind,
  { Icon: LucideIcon; label: string }
> = {
  subway: {
    Icon: TrainFront,
    label: "지하철·기차",
  },
  bus: {
    Icon: BusFront,
    label: "버스",
  },
  taxi: {
    Icon: CarTaxiFront,
    label: "택시",
  },
  parking: {
    Icon: SquareParking,
    label: "주차",
  },
};

function EmptyRegionInfo() {
  return <p className="stadium-region-empty">등록된 지역정보가 없습니다</p>;
}

export function StadiumRegionTab({ stadium }: { stadium: Stadium }) {
  const summaryTags = [stadium.teamName, stadium.city].filter(
    (tag, index, tags) => Boolean(tag) && tags.indexOf(tag) === index,
  );
  const summaryStyle = {
    "--stadium-region-accent": TEAM_ACCENTS[stadium.teamCode] ?? "23, 109, 255",
  } as CSSProperties;
  const transportation = stadium.regionInfo.transportation.reduce<
    Record<TransportationKind, string[]>
  >(
    (groups, item) => {
      groups[item.kind].push(item.text);
      return groups;
    },
    { subway: [], bus: [], taxi: [], parking: [] },
  );
  const transportationEntries = (
    Object.keys(TRANSPORTATION_META) as TransportationKind[]
  ).filter((kind) => transportation[kind].length);

  return (
    <section className="stadium-region-tab stadium-page-tab-panel" role="tabpanel">
      <article className="stadium-region-summary" style={summaryStyle}>
        <div>
          <p className="stadium-region-summary-label">선택한 구장</p>
          <h3>{stadium.stadiumName}</h3>
          <p className="stadium-region-address">{stadium.address}</p>
        </div>
        {summaryTags.length ? (
          <div className="stadium-region-summary-tags" aria-label="구장 태그">
            {summaryTags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        ) : null}
      </article>

      <article className="stadium-region-section stadium-region-transport">
        <header>
          <span className="stadium-region-heading-icon" aria-hidden="true">
            <img src="/img/baseball_icons2/transport.png" alt="" />
          </span>
          <h3>교통</h3>
        </header>
        {transportationEntries.length ? (
          <div className="stadium-region-transport-list">
            {transportationEntries.map((kind) => {
              const meta = TRANSPORTATION_META[kind];
              const TransportIcon = meta.Icon;
              return (
                <div className="stadium-region-transport-row" key={kind}>
                  <span className={`stadium-region-transport-icon is-${kind}`} aria-hidden="true">
                    <TransportIcon />
                  </span>
                  <div>
                    <strong>{meta.label}</strong>
                    {transportation[kind].map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : <EmptyRegionInfo />}
      </article>

      <article className="stadium-region-section">
        <header>
          <span className="stadium-region-heading-icon" aria-hidden="true">
            <img src="/img/baseball_icons2/tour.png" alt="" />
          </span>
          <h3>주변 관광</h3>
        </header>
        {stadium.regionInfo.attractions.length ? (
          <div className="stadium-region-attraction-grid">
            {stadium.regionInfo.attractions.map((attraction) => (
              <span key={attraction}>{attraction}</span>
            ))}
          </div>
        ) : <EmptyRegionInfo />}
      </article>

      <article className="stadium-region-section">
        <header>
          <span className="stadium-region-heading-icon" aria-hidden="true">
            <img src="/img/baseball_icons2/area.png" alt="" />
          </span>
          <h3>주변 지역</h3>
        </header>
        {stadium.regionInfo.nearbyAreas.length ? (
          <div className="stadium-region-area-tags">
            {stadium.regionInfo.nearbyAreas.map((area) => (
              <span key={area}>{area}</span>
            ))}
          </div>
        ) : <EmptyRegionInfo />}
      </article>
    </section>
  );
}
