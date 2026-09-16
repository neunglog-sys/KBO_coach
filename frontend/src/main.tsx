import React from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { App } from "./App";
import "../styles.css";
import "./theme.css";

// 데스크톱 웹(비-네이티브, 최상위 창, 600px 이상)에서는 앱을 '폰 크기 iframe' 안에 넣어
// 실제 모바일처럼 보이게 한다. iframe 안에서는 뷰포트가 폰 폭(≈430px)이라 모든 화면·미디어쿼리·
// 오버레이(사이드메뉴/모달 포함)가 모바일 레이아웃으로 정상 렌더된다. 화면별 보정이 필요 없다.
// 네이티브 앱과 실제 모바일 웹(좁은 화면), 그리고 iframe 내부에는 프레임을 씌우지 않는다.
const isWeb = !Capacitor.isNativePlatform();
const isTopWindow = window.self === window.top;
const useDeviceFrame = isWeb && isTopWindow && window.innerWidth >= 600;

if (useDeviceFrame) {
  document.documentElement.classList.add("is-web-frame");
  const rootEl = document.getElementById("root") as HTMLElement;
  const iframe = document.createElement("iframe");
  iframe.className = "device-frame-iframe";
  iframe.title = "모바일 미리보기";
  iframe.src = window.location.href; // 같은 앱을 폰 폭 뷰포트로 다시 로드(내부에선 isTopWindow=false → 앱 렌더)
  rootEl.appendChild(iframe);
  document.getElementById("app-startup-cover")?.classList.add("is-ready");
} else {
  if (isWeb) document.documentElement.classList.add("is-web");

  createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.getElementById("app-startup-cover")?.classList.add("is-ready");
      window.dispatchEvent(new Event("app:first-paint"));
    });
  });
}

// 최상위 웹 창이 600px 경계를 어느 방향으로든 넘으면 현재 레이아웃을 다시 선택한다.
// 모바일 폭에서 시작한 뒤 다시 넓혀도 데스크톱 프레임과 바깥 장식이 복원되어야 한다.
if (isWeb && isTopWindow) {
  let wasDeviceFrame = window.innerWidth >= 600;
  window.addEventListener("resize", () => {
    const shouldUseDeviceFrame = window.innerWidth >= 600;
    if (shouldUseDeviceFrame !== wasDeviceFrame) {
      wasDeviceFrame = shouldUseDeviceFrame;
      window.location.reload();
    }
  });
}
