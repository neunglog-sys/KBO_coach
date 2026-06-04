// 백엔드 API 주소 중앙화.
// - 웹(개발): VITE_API_BASE 미설정 → "" → 상대경로 → Vite dev 프록시(127.0.0.1:8000) 사용.
// - 안드로이드 앱: vite build --mode android 시 .env.android의 VITE_API_BASE(배포 백엔드)를 사용.
export const API_BASE: string = import.meta.env.VITE_API_BASE ?? "";

/** 상대 API 경로를 환경에 맞는 절대/상대 URL로 변환한다. 예: apiUrl("/chat") */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
