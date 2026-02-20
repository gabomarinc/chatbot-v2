importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDfqCOvB-kpkAb2eElQDlWHI3Qchz_UeRY",
    authDomain: "chatbot-konsul-fcm.firebaseapp.com",
    projectId: "chatbot-konsul-fcm",
    storageBucket: "chatbot-konsul-fcm.firebasestorage.app",
    messagingSenderId: "785904586562",
    appId: "1:785904586562:web:a4f551ba50b115cac7c2db"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
