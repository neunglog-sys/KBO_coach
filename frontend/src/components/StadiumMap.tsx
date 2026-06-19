import { useEffect, useRef, useState } from "react";
import type { Stadium } from "../data/stadiumData";
import { STADIUM_COORDS } from "../data/stadiumMapper";

declare global {
  interface Window {
    kakao?: any;
  }
}

const KAKAO_MAP_KEY = import.meta.env.VITE_KAKAO_MAP_KEY;
const KAKAO_LOAD_TIMEOUT_MS = 10_000;
const KAKAO_READY_POLL_MS = 50;

let kakaoLoadPromise: Promise<void> | null = null;

function isKakaoMapsReady() {
  return Boolean(
    window.kakao?.maps &&
      typeof window.kakao.maps.Map === "function" &&
      typeof window.kakao.maps.LatLng === "function",
  );
}

function waitForKakaoMapsReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (isKakaoMapsReady()) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= KAKAO_LOAD_TIMEOUT_MS) {
        reject(new Error("Kakao Maps SDK 초기화 시간이 초과되었습니다."));
        return;
      }
      window.setTimeout(check, KAKAO_READY_POLL_MS);
    };
    check();
  });
}

function loadKakaoMaps(): Promise<void> {
  if (isKakaoMapsReady()) return Promise.resolve();
  if (kakaoLoadPromise) return kakaoLoadPromise;

  const promise = new Promise<void>((resolve, reject) => {
    if (!KAKAO_MAP_KEY) {
      reject(new Error("Kakao Maps API 키가 설정되지 않았습니다."));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_KEY}&autoload=false`;
    script.async = true;
    const timeout = window.setTimeout(() => {
      reject(new Error("Kakao Maps SDK 응답 시간이 초과되었습니다."));
    }, KAKAO_LOAD_TIMEOUT_MS);
    script.onload = () => {
      window.clearTimeout(timeout);
      if (!window.kakao?.maps?.load) {
        reject(new Error("Kakao Maps SDK가 현재 앱 출처를 허용하지 않았습니다."));
        return;
      }
      window.kakao.maps.load(() => {
        void waitForKakaoMapsReady().then(resolve, reject);
      });
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Kakao Maps SDK를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  }).catch((error: unknown) => {
    kakaoLoadPromise = null;
    throw error;
  });

  kakaoLoadPromise = promise;
  return promise;
}

function buildInfoContent(stadium: Stadium) {
  const escape = (value: string) =>
    value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `
    <div style="padding:10px 12px;min-width:170px;max-width:220px;font-size:12px;line-height:1.6;color:#0a1732;">
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
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const infoWindowRef = useRef<any>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const { kakao } = window;

        // Check these logs in the browser developer console or iOS WebView debugging
        // console, not in the VSCode terminal.
        console.log("현재 origin:", window.location.origin);
        console.log("현재 href:", window.location.href);
        console.log("카카오 키 존재 여부:", !!import.meta.env.VITE_KAKAO_MAP_KEY);
        console.log("kakao 객체 존재 여부:", !!window.kakao);

        const map = new kakao.maps.Map(containerRef.current, {
          center: new kakao.maps.LatLng(36.4, 127.7),
          level: 13,
        });
        mapRef.current = map;
        infoWindowRef.current = new kakao.maps.InfoWindow({ removable: true });

        for (const stadium of stadiums) {
          const coord = STADIUM_COORDS[stadium.teamCode];
          if (!coord) continue;

          const position = new kakao.maps.LatLng(coord.lat, coord.lng);
          const marker = new kakao.maps.Marker({ position, map, title: stadium.stadiumName });
          kakao.maps.event.addListener(marker, "click", () => {
            infoWindowRef.current.setContent(buildInfoContent(stadium));
            infoWindowRef.current.open(map, marker);
          });
          markersRef.current[stadium.teamCode] = marker;
        }

        setIsReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "지도를 불러오지 못했습니다.",
          );
          setHasError(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [stadiums]);

  useEffect(() => {
    if (!isReady || !mapRef.current) return;

    const coord = STADIUM_COORDS[selectedTeamCode];
    const marker = markersRef.current[selectedTeamCode];
    const stadium = stadiums.find((item) => item.teamCode === selectedTeamCode);
    if (!coord || !marker || !stadium) return;

    const { kakao } = window;
    const position = new kakao.maps.LatLng(coord.lat, coord.lng);
    mapRef.current.setLevel(6);
    mapRef.current.panTo(position);

    infoWindowRef.current.setContent(buildInfoContent(stadium));
    infoWindowRef.current.open(mapRef.current, marker);
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
