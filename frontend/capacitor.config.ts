import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.neunglog.baseballcoach",
  appName: "공복이",
  webDir: "dist",
  android: {
    // 앱을 http://localhost 로 서빙 → http LAN 백엔드 fetch가 mixed-content로 막히지 않음.
    allowMixedContent: true,
  },
  server: {
    androidScheme: "http",
    cleartext: true,
  },
  ios: {
    // 웹뷰 자체 스크롤 OFF — 키보드가 화면(배경)을 통째로 끌어올리는 iOS 내장 동작 차단.
    // 앱은 고정 레이아웃 SPA라 안전 (채팅 목록 등 내부 스크롤은 영향 없음).
    scrollEnabled: false,
  },
  plugins: {
    // iOS: 키보드가 화면(웹뷰)을 건드리지 않게 고정 — resize=native는 100dvh 무대가
    // 재계산되며 배경이 찌그러지는 부작용. 대신 키보드 높이를 JS로 받아(App.tsx)
    // 하단 채팅 시트만 그만큼 올린다(--keyboard-inset).
    Keyboard: {
      resize: "none",
    },
  },
};

export default config;
