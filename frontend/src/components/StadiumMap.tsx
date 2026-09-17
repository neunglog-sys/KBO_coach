import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIconUrl from "leaflet/dist/images/marker-icon.png";
import markerIcon2xUrl from "leaflet/dist/images/marker-icon-2x.png";
import markerShadowUrl from "leaflet/dist/images/marker-shadow.png";
import type { Stadium } from "../data/stadiumData";
import { STADIUM_COORDS } from "../data/stadiumMapper";

// 카카오맵에서 Leaflet + OpenStreetMap으로 교체했다.
// 카카오맵 JavaScript SDK는 앱에 등록된 도메인에서만 동작해서, 서버를 NCP 도메인으로 옮긴 뒤
// "domain mismatched"(401)로 지도가 뜨지 않았다. Leaflet은 키도 도메인 등록도 필요 없다.
// 좌표(STADIUM_COORDS)와 화면 구성은 그대로 두고 지도 레이어만 바꿨다.

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// OSM 타일 이용 규약상 출처 표기는 필수다.
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const KOREA_CENTER: [number, number] = [36.4, 127.7];
const KOREA_ZOOM = 7;      // 전국이 보이는 배율
const FOCUS_ZOOM = 13;     // 구단 선택 시 구장 주변

// 번들러가 처리한 실제 이미지 경로를 쓰도록 기본 아이콘을 다시 지정한다(기본값은 CDN 상대경로라 깨진다).
const markerIcon = L.icon({
  iconUrl: markerIconUrl,
  iconRetinaUrl: markerIcon2xUrl,
  shadowUrl: markerShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function buildInfoContent(stadium: Stadium) {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
    <div style="padding:2px 2px 0;min-width:170px;max-width:220px;font-size:12px;line-height:1.6;color:#0a1732;">
      <strong style="font-size:13px;">${escape(stadium.teamName)}</strong><br/>
      ${escape(stadium.stadiumName)}<br/>
      <span style="color:#65758a;">${escape(stadium.address)}</span>
    </div>
  `;
}

export function StadiumMap({
  stadiums,
  selectedTeamCode,
}: {
  stadiums: Stadium[];
  selectedTeamCode: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let map: L.Map | null = null;

    try {
      map = L.map(containerRef.current, {
        center: KOREA_CENTER,
        zoom: KOREA_ZOOM,
        zoomControl: true,
        attributionControl: true,
      });
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);

      markersRef.current = {};
      for (const stadium of stadiums) {
        const coord = STADIUM_COORDS[stadium.teamCode];
        if (!coord) continue;
        const marker = L.marker([coord.lat, coord.lng], {
          icon: markerIcon,
          title: stadium.stadiumName,
        })
          .addTo(map)
          .bindPopup(buildInfoContent(stadium));
        markersRef.current[stadium.teamCode] = marker;
      }

      mapRef.current = map;
      // 탭 전환 등으로 컨테이너 크기가 나중에 정해지면 타일이 잘려 보인다 → 다음 프레임에 재계산.
      window.setTimeout(() => map?.invalidateSize(), 0);
      setIsReady(true);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "지도를 불러오지 못했습니다.");
      setHasError(true);
    }

    return () => {
      map?.remove();
      mapRef.current = null;
      markersRef.current = {};
      setIsReady(false);
    };
  }, [stadiums]);

  useEffect(() => {
    if (!isReady || !mapRef.current) return;

    const coord = STADIUM_COORDS[selectedTeamCode];
    const marker = markersRef.current[selectedTeamCode];
    if (!coord || !marker) return;

    mapRef.current.invalidateSize();
    mapRef.current.setView([coord.lat, coord.lng], FOCUS_ZOOM, { animate: true });
    marker.openPopup();
  }, [selectedTeamCode, isReady, stadiums]);

  if (hasError) {
    return (
      <div className="stadium-page-map stadium-page-map-error" role="alert">
        {errorMessage || "지도를 불러오지 못했습니다."}
      </div>
    );
  }

  return <div className="stadium-page-map" ref={containerRef} aria-label="구장 위치 지도" />;
}
