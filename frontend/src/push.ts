// 푸시 토큰 등록 — 웹(FCM 웹푸시) + 안드로이드 앱(네이티브 FCM) 둘 다.
// 받은 토큰을 백엔드 /push/register 에 저장 → 서버 notify 잡이 응원팀 경기 알림 발송.
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { apiUrl } from "./api";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAfbA66vmcQVYW96l2M-iuUiAV_ck5_ZxQ",
  authDomain: "kboai-5dea0.firebaseapp.com",
  projectId: "kboai-5dea0",
  storageBucket: "kboai-5dea0.firebasestorage.app",
  messagingSenderId: "785248354563",
  appId: "1:785248354563:web:eec008a683c31236816936",
};
const VAPID_KEY =
  "BGIQfrtIfkeB3utT-IiDL4ohXrIVBBFsK7xqzmuhHbUZIx_i5PynechLD47TH3EXvhMi-q7ZuNFvZvDCjkgB2DY";

let currentJwt = "";
let nativeReady = false;

async function saveToken(token: string, platform: string): Promise<void> {
  try {
    await fetch(apiUrl("/push/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentJwt}` },
      body: JSON.stringify({ token, platform }),
    });
  } catch (e) {
    console.error("푸시 토큰 등록 실패", e);
  }
}

/** 로그인 시 호출. 웹이면 웹푸시, 안드 앱이면 네이티브 FCM 토큰을 등록한다. */
export async function registerPush(authToken: string): Promise<void> {
  if (!authToken) return;
  currentJwt = authToken;
  if (Capacitor.isNativePlatform()) {
    await registerNative();
  } else {
    await registerWeb();
  }
}

async function registerNative(): Promise<void> {
  if (!nativeReady) {
    nativeReady = true;
    PushNotifications.addListener("registration", (t) => saveToken(t.value, "android"));
    PushNotifications.addListener("registrationError", (e) => console.error("푸시 등록 에러", e));
    PushNotifications.addListener("pushNotificationReceived", (n) =>
      console.log("푸시 수신(앱 켜져있을 때)", n));
  }
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt") perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;
  await PushNotifications.register();
}

async function registerWeb(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return;
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const { initializeApp } = await import("firebase/app");
    const { getMessaging, getToken, onMessage, isSupported } = await import("firebase/messaging");
    if (!(await isSupported())) return;
    const messaging = getMessaging(initializeApp(FIREBASE_CONFIG));
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (token) await saveToken(token, "web");
    onMessage(messaging, (payload) => console.log("웹 푸시 수신(포그라운드)", payload));
  } catch (e) {
    console.error("웹 푸시 등록 실패", e);
  }
}
