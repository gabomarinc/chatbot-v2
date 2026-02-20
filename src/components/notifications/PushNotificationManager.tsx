'use client';

import { useEffect, useState } from 'react';
import { requestForToken, onMessageListener } from '@/lib/firebase';
import { saveFCMToken } from '@/lib/actions/user';
import { toast } from 'sonner';
import { Bell, BellOff, X } from 'lucide-react';

export function PushNotificationManager() {
    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        const checkSupport = () => {
            const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
            setIsSupported(supported);
            if (supported) {
                setPermission(Notification.permission);
            }
        };

        checkSupport();

        // Listen for foreground messages
        onMessageListener().then((payload: any) => {
            if (payload) {
                toast(payload.notification.title, {
                    description: payload.notification.body,
                    icon: <Bell className="w-4 h-4 text-primary" />,
                });
            }
        });
    }, []);

    const handleRequestPermission = async () => {
        if (!isSupported) return;

        try {
            const token = await requestForToken();
            if (token) {
                await saveFCMToken(token);
                setPermission('granted');
                toast.success('Notificaciones activadas', {
                    description: 'Recibirás alertas en tiempo real sobre tus conversaciones.'
                });
            } else {
                setPermission(Notification.permission);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            toast.error('Error al activar notificaciones');
        }
    };

    if (!isSupported || permission === 'granted') return null;

    return (
        <div className="fixed bottom-6 left-6 z-50 animate-bounce-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 max-w-sm flex items-start gap-4 ring-1 ring-black/5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                    <h4 className="text-sm font-black text-gray-900 mb-1">Activar Notificaciones</h4>
                    <p className="text-xs text-gray-400 font-medium mb-3 leading-relaxed">
                        No te pierdas ningún mensaje de tus clientes. Recibe alertas en tiempo real.
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRequestPermission}
                            className="text-[10px] font-black uppercase tracking-widest bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-black transition-colors"
                        >
                            Permitir
                        </button>
                        <button
                            onClick={() => setIsSupported(false)} // Hide for now
                            className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2 hover:text-gray-600 transition-colors"
                        >
                            Ahora no
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
