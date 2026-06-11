/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 백엔드 API 기본 주소. 미설정 시 상대경로(웹 dev 프록시) 사용. */
  readonly VITE_API_BASE?: string;
  /** Kakao Maps JavaScript SDK 앱 키 (구장정보 > 구장안내 지도). */
  readonly VITE_KAKAO_MAP_KEY?: string;
  /** 구글 로그인용 웹 OAuth 클라이언트 ID (xxxx.apps.googleusercontent.com). */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
