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
    // 앱 실행 시 WebView가 이전 세션(옛 화면)을 잠깐 보여주는 깜빡임을 가린다.
    // 자동으로 숨기지 않고(launchAutoHide:false), 웹 첫 화면이 그려진 뒤 App.tsx에서 hide() 호출.
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#0e1018",
      showSpinner: false,
      androidSplashResourceName: "splash",
      splashImmersive: false,
    },
  },
};

export default config;
