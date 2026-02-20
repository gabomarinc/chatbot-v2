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
        <div className="fixed bottom-0 md:bottom-8 left-0 md:left-8 z-[60] w-full md:w-auto p-4 md:p-0 animate-bounce-in">
            <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-white p-6 md:p-8 max-w-sm w-full mx-auto md:mx-0 relative overflow-hidden group ring-1 ring-black/5">
                {/* Decorative background gradient */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-amber-500/10" />

                <div className="flex flex-col gap-5 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                            <Bell className="w-7 h-7 text-white animate-pulse" />
                        </div>
                        <div>
                            <h4 className="text-lg font-[900] text-gray-900 leading-tight">Activar Notificaciones</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.1em] text-amber-600">Recomendado</span>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                        No te pierdas ningún mensaje. Recibe alertas en tiempo real sobre nuevas conversaciones y asignaciones.
                    </p>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRequestPermission}
                            className="flex-1 bg-gray-900 text-white text-xs font-black uppercase tracking-widest h-12 rounded-xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/10 flex items-center justify-center gap-2"
                        >
                            <Bell className="w-3.5 h-3.5" />
                            Permitir ahora
                        </button>
                        <button
                            onClick={() => setIsSupported(false)}
                            className="px-4 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors h-12 flex items-center justify-center"
                        >
                            Luego
                        </button>
                    </div>
                </div>

                {/* Progress bar hint */}
                <div className="absolute bottom-0 left-0 h-1 bg-amber-500 w-full opacity-20" />
            </div>
        </div>
    );
}
