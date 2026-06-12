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
    // iOS: 키보드가 화면을 '덮지' 않고 웹뷰를 줄이게 — 하단 고정 채팅 입력창이 키보드 위로 올라옴.
    // (안드로이드는 기존 adjustResize 동작 그대로)
    Keyboard: {
      resize: "native",
    },
  },
};

export default config;
