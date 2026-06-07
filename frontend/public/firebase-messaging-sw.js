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
  });
});
