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
  // notification payload가 있으면 브라우저가 자동으로 알림을 띄운다.
  // 여기서 또 showNotification 하면 알림이 2개로 중복되므로, 자동표시에 맡기고 종료한다.
  // 데이터 전용 메시지(notification 없음)일 때만 직접 표시한다.
  if (payload.notification) return;
  const d = payload.data || {};
  self.registration.showNotification(d.title || "알림", { body: d.body || "" });
});
