import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { getApp, getApps, initializeApp } from "firebase/app";
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { apiUrl } from "./api";
import { isNotificationEnabled } from "./appSettings";

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
const PUSH_TOKEN_KEY = "baseballCoachPushToken";
const PUSH_PLATFORM_KEY = "baseballCoachPushPlatform";

let currentJwt = "";
let nativeReady = false;
let webMessageListenerReady = false;

function rememberToken(token: string, platform: string) {
  localStorage.setItem(PUSH_TOKEN_KEY, token);
  localStorage.setItem(PUSH_PLATFORM_KEY, platform);
}

function forgetToken() {
  localStorage.removeItem(PUSH_TOKEN_KEY);
  localStorage.removeItem(PUSH_PLATFORM_KEY);
}

async function saveToken(token: string, platform: string): Promise<void> {
  if (!currentJwt || !isNotificationEnabled()) return;

  try {
    const response = await fetch(apiUrl("/push/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentJwt}` },
      body: JSON.stringify({ token, platform }),
    });
    if (response.ok) rememberToken(token, platform);
  } catch (error) {
    console.error("푸시 토큰 등록 실패", error);
  }
}

async function syncServiceWorkerPreference(enabled: boolean) {
  if (!("serviceWorker" in navigator)) return;

  const registration =
    (await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js")) ??
    (enabled
      ? await navigator.serviceWorker.register("/firebase-messaging-sw.js")
      : undefined);

  registration?.active?.postMessage({
    type: "NOTIFICATION_PREFERENCE",
    enabled,
  });
}

export async function registerPush(authToken: string): Promise<void> {
  if (!authToken || !isNotificationEnabled()) return;
  currentJwt = authToken;

  if (Capacitor.isNativePlatform()) {
    await registerNative();
  } else {
    await registerWeb();
  }
}

export async function disablePush(authToken: string): Promise<void> {
  if (!authToken) return;
  currentJwt = authToken;

  try {
    await fetch(apiUrl("/push/register/all"), {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
  } catch (error) {
    console.error("서버 푸시 토큰 해제 실패", error);
  }

  if (Capacitor.isNativePlatform()) {
    try {
      if (Capacitor.getPlatform() === "ios") {
        await FirebaseMessaging.deleteToken();
        await FirebaseMessaging.removeAllListeners();
      } else {
        await PushNotifications.unregister();
        await PushNotifications.removeAllListeners();
      }
      nativeReady = false;
    } catch (error) {
      console.error("네이티브 푸시 해제 실패", error);
    }
  } else {
    await syncServiceWorkerPreference(false);
    try {
      if (await isSupported()) {
        const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
        await deleteToken(getMessaging(app));
      }
    } catch (error) {
      console.error("웹 푸시 토큰 해제 실패", error);
    }
  }

  forgetToken();
}

async function registerNative(): Promise<void> {
  if (!isNotificationEnabled()) return;

  // iOS: @capacitor-firebase/messaging로 APNs↔FCM 처리 → FCM 토큰을 직접 받아 백엔드 FCM 발송과 호환.
  //      (@capacitor/push-notifications는 iOS에선 APNs 원시 토큰만 줘서 FCM 발송에 못 씀)
  if (Capacitor.getPlatform() === "ios") {
    if (!nativeReady) {
      nativeReady = true;
      await FirebaseMessaging.addListener("tokenReceived", (event) => {
        if (event?.token && isNotificationEnabled()) void saveToken(event.token, "ios");
      });
      await FirebaseMessaging.addListener("notificationReceived", (event) => {
        if (isNotificationEnabled()) console.log("푸시 수신", event);
      });
    }
    let perm = await FirebaseMessaging.checkPermissions();
    if (perm.receive === "prompt") perm = await FirebaseMessaging.requestPermissions();
    if (perm.receive !== "granted" || !isNotificationEnabled()) return;
    const { token } = await FirebaseMessaging.getToken();
    if (token && isNotificationEnabled()) await saveToken(token, "ios");
    return;
  }

  // Android: @capacitor/push-notifications (registration 이벤트가 FCM 토큰 반환)
  if (!nativeReady) {
    nativeReady = true;
    await PushNotifications.addListener("registration", (token) => {
      if (isNotificationEnabled()) void saveToken(token.value, "android");
    });
    await PushNotifications.addListener("registrationError", (error) =>
      console.error("푸시 등록 오류", error),
    );
    await PushNotifications.addListener("pushNotificationReceived", (notification) => {
      if (isNotificationEnabled()) console.log("푸시 수신", notification);
    });
  }

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === "prompt") {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== "granted" || !isNotificationEnabled()) return;
  await PushNotifications.register();
}

async function registerWeb(): Promise<void> {
  try {
    if (!isNotificationEnabled() || !("serviceWorker" in navigator) || !("Notification" in window)) {
      return;
    }
    if (!(await isSupported())) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted" || !isNotificationEnabled()) return;

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    await syncServiceWorkerPreference(true);
    const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token && isNotificationEnabled()) await saveToken(token, "web");
    if (!webMessageListenerReady) {
      webMessageListenerReady = true;
      onMessage(messaging, (payload) => {
        if (isNotificationEnabled()) console.log("포그라운드 푸시 수신", payload);
      });
    }
  } catch (error) {
    console.error("웹 푸시 등록 실패", error);
  }
}
