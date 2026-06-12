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
