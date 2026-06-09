importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyAfbA66vmcQVYW96l2M-iuUiAV_ck5_ZxQ",
  authDomain: "kboai-5dea0.firebaseapp.com",
  projectId: "kboai-5dea0",
  storageBucket: "kboai-5dea0.firebasestorage.app",
  messagingSenderId: "785248354563",
  appId: "1:785248354563:web:eec008a683c31236816936",
});

const PREFERENCE_CACHE = "baseball-coach-push-preference";
const PREFERENCE_URL = "/__notification-preference__";
const messaging = firebase.messaging();

// 새 SW를 즉시 활성화·장악 → fix 이전 버전 SW가 남아 알림을 중복 표시하는 문제 방지.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  if (event.data?.type !== "NOTIFICATION_PREFERENCE") return;
  event.waitUntil(
    caches.open(PREFERENCE_CACHE).then((cache) =>
      cache.put(
        PREFERENCE_URL,
        new Response(event.data.enabled ? "true" : "false"),
      ),
    ),
  );
});

async function notificationsEnabled() {
  const cache = await caches.open(PREFERENCE_CACHE);
  const saved = await cache.match(PREFERENCE_URL);
  return !saved || (await saved.text()) !== "false";
}

messaging.onBackgroundMessage(async (payload) => {
  if (!(await notificationsEnabled())) return;

  // Firebase displays notification payloads itself. Data-only payloads are
  // displayed here so the saved preference can be checked first.
  if (payload.notification) return;
  const data = payload.data || {};
  await self.registration.showNotification(data.title || "알림", {
    body: data.body || "",
    data: { url: data.url || "/" },
  });
});

// 알림 클릭 → 웹에서도 앱을 연다. (이 핸들러가 없으면 웹은 알림 눌러도 아무 일 안 일어남.
// 안드는 OS가 네이티브로 앱을 열어줘서 됐던 것.) 열린 탭이 있으면 포커스, 없으면 새로 연다.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            if (target !== "/" && "navigate" in client) {
              client.navigate(target).catch(() => {});
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(target);
      }),
  );
});
