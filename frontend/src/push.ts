// 안드로이드 앱(Capacitor) 네이티브 FCM 등록.
// 받은 토큰을 백엔드 /push/register 에 저장 → 서버 notify 잡이 그 토큰으로 푸시 발송.
// 웹에서는 동작 안 함(웹 푸시는 별도). google-services.json 이 android/app/ 에 있어야 함.
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { apiUrl } from "./api";

let currentToken = "";
let listenersReady = false;

export async function registerPush(authToken: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !authToken) return; // 웹·비로그인 스킵
  currentToken = authToken;

  if (!listenersReady) {
    listenersReady = true;
    // FCM 토큰 발급 → 백엔드 등록
    PushNotifications.addListener("registration", async (token) => {
      try {
        await fetch(apiUrl("/push/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentToken}` },
          body: JSON.stringify({ token: token.value, platform: "android" }),
        });
      } catch (e) {
        console.error("푸시 토큰 등록 실패", e);
      }
    });
    PushNotifications.addListener("registrationError", (e) => console.error("푸시 등록 에러", e));
    PushNotifications.addListener("pushNotificationReceived", (n) =>
      console.log("푸시 수신(앱 켜져있을 때)", n));
  }

  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt") perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;
  await PushNotifications.register();
}
