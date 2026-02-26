import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }
    } catch (error) {
        console.error('Firebase Admin Initialization Error:', error);
    }
}

export const getAdminMessaging = () => {
    if (admin.apps.length > 0) {
        return admin.messaging();
    }
    return null;
};
