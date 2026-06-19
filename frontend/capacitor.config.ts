import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.neunglog.baseballcoach",
  appName: "야구볼래",
  webDir: "dist",
  android: {
    // 앱을 http://localhost 로 서빙 → http LAN 백엔드 fetch가 mixed-content로 막히지 않음.
    allowMixedContent: true,
  },
  server: {
    // Kakao Maps JavaScript SDK는 capacitor:// 출처를 웹 도메인으로 인정하지 않는다.
    // iOS WebView를 등록된 https://localhost 출처로 제공한다.
    iosScheme: "https",
    androidScheme: "http",
    cleartext: true,
  },
  ios: {
    // 웹뷰 자체 스크롤 OFF — 키보드가 화면(배경)을 통째로 끌어올리는 iOS 내장 동작 차단.
    // 앱은 고정 레이아웃 SPA라 안전 (채팅 목록 등 내부 스크롤은 영향 없음).
    scrollEnabled: false,
    // 웹뷰 밑바탕 흰색 — iOS 키보드 하단(지구본·마이크 줄)이 반투명이라 어두운 밑바탕이 비쳐 보이던 문제
    backgroundColor: "#ffffff",
  },
  plugins: {
    // 앱 실행 시 WebView가 이전 세션(옛 화면)을 잠깐 보여주는 깜빡임을 가린다.
    // 자동으로 숨기지 않고(launchAutoHide:false), 웹 첫 화면이 그려진 뒤 App.tsx에서 hide() 호출.
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#0e1018",
      showSpinner: false,
      androidSplashResourceName: "splash",
      splashImmersive: false,
    },
    // iOS: 키보드가 화면(웹뷰)을 건드리지 않게 고정 — resize=native는 100dvh 무대가
    // 재계산되며 배경이 찌그러지는 부작용. 대신 키보드 높이를 JS로 받아(App.tsx)
    // 하단 채팅 시트만 그만큼 올린다(--keyboard-inset).
    Keyboard: {
      resize: "none",
    },
  },
};

export default config;
