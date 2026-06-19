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
const KAKAO_SCRIPT_ID = "kakao-maps-sdk";

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
        reject(new Error("Kakao Maps SDK initialization timed out."));
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
      reject(new Error("Kakao Maps API key is missing."));
      return;
    }

    const onSdkLoaded = () => {
      if (!window.kakao?.maps?.load) {
        reject(new Error("Kakao Maps SDK is unavailable for this app origin."));
        return;
      }
      window.kakao.maps.load(() => {
        void waitForKakaoMapsReady().then(resolve, reject);
      });
    };

    const existingScript = document.getElementById(KAKAO_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      if (window.kakao?.maps?.load) {
        onSdkLoaded();
      } else {
        existingScript.addEventListener("load", onSdkLoaded, { once: true });
        existingScript.addEventListener("error", () => reject(new Error("Failed to load Kakao Maps SDK.")), {
          once: true,
        });
      }
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_SCRIPT_ID;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(KAKAO_MAP_KEY)}&autoload=false`;
    script.async = true;
    script.defer = true;

    const timeout = window.setTimeout(() => {
      reject(new Error("Kakao Maps SDK timed out."));
    }, KAKAO_LOAD_TIMEOUT_MS);

    script.onload = () => {
      window.clearTimeout(timeout);
      onSdkLoaded();
    };
    script.onerror = () => {
      window.clearTimeout(timeout);
      reject(new Error("Failed to load Kakao Maps SDK."));
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

        window.requestAnimationFrame(() => {
          map.relayout();
          window.requestAnimationFrame(() => map.relayout());
        });
        setIsReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load the map.");
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
    mapRef.current.relayout();
    mapRef.current.panTo(position);

    infoWindowRef.current.setContent(buildInfoContent(stadium));
    infoWindowRef.current.open(mapRef.current, marker);
  }, [selectedTeamCode, isReady, stadiums]);

  if (hasError) {
    return (
      <div className="stadium-page-map stadium-page-map-error" role="alert">
        {errorMessage || "Failed to load the map."}
      </div>
    );
  }

  return <div className="stadium-page-map" ref={containerRef} aria-label="Stadium location map" />;
}
