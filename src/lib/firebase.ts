import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, Messaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const messaging = async (): Promise<Messaging | null> => {
    try {
        const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
        if (!isSupported) return null;
        return getMessaging(app);
    } catch (err) {
        console.error('Firebase Messaging is not supported or failed to initialize:', err);
        return null;
    }
};

export const requestForToken = async () => {
    try {
        const msg = await messaging();
        if (!msg) return null;

        const currentToken = await getToken(msg, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (currentToken) {
            return currentToken;
        } else {
            console.log('No registration token available. Request permission to generate one.');
            return null;
        }
    } catch (err) {
        console.error('An error occurred while retrieving token:', err);
        return null;
    }
};

export const onMessageListener = async () => {
    const msg = await messaging();
    if (!msg) return null;

    return new Promise((resolve) => {
        onMessage(msg, (payload) => {
            resolve(payload);
        });
    });
};
