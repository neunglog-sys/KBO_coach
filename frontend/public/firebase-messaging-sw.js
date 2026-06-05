// 웹 푸시 백그라운드 수신 (앱 탭이 꺼져있을 때 OS 알림 표시).
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

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification?.title || "알림", {
    body: payload.notification?.body || "",
  });
});
