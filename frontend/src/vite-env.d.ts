/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 백엔드 API 기본 주소. 미설정 시 상대경로(웹 dev 프록시) 사용. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
