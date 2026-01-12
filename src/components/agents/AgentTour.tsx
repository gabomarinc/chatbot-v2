'use client';

import { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { markAgentTourSeen } from '@/lib/actions/user';
import { useRouter } from 'next/navigation';

interface AgentTourProps {
    hasSeenTour: boolean;
}

export function AgentTour({ hasSeenTour }: AgentTourProps) {
    const driverObj = useRef<any>(null);
    const router = useRouter();

    useEffect(() => {
        driverObj.current = driver({
            showProgress: true,
            animate: true,
            allowClose: true,
            doneBtnText: '¡Entendido!',
            nextBtnText: 'Siguiente',
            prevBtnText: 'Anterior',
            progressText: 'Paso {{current}} de {{total}}',
            steps: [
                {
                    element: '#tab-profile',
                    popover: {
                        title: '👤 Perfil de Identidad',
                        description: 'Aquí nace tu agente. Dale un nombre con personalidad (ej. "Sofia") y un avatar amigable. Define si es un Asistente formal o un Vendedor carismático.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-job',
                    popover: {
                        title: '💼 Descripción del Trabajo',
                        description: 'El contexto lo es todo. Dile dónde trabaja (ej. "Inmobiliaria Deluxe") y qué vende. Cuantos más detalles le des sobre su empresa, mejor representará tu marca.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-training',
                    popover: {
                        title: '📚 Base de Conocimiento',
                        description: 'El cerebro de tu agente. 🧠 Sube tus PDFs de precios, manuales o el enlace de tu web. Ej: Sube "Menu_2024.pdf" para que sepa todos tus platos.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-intents',
                    popover: {
                        title: '🎯 Intenciones y Acciones',
                        description: 'Automatiza la magia. Detecta cuando alguien dice "Cita" y haz que el agente abra tu Calendario automáticamente. O si dicen "Precio", que envíe el PDF de tarifas.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-media',
                    popover: {
                        title: '🖼️ Galería Visual',
                        description: 'Una imagen vale más que mil palabras. Sube fotos de tus productos o un mapa de ubicación. Tu agente sabrá cuándo enviarlas en el chat para enamorar al cliente.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-integrations',
                    popover: {
                        title: '🔌 Integraciones',
                        description: 'Conecta con el mundo real. Enlaza Google Calendar para agendar reuniones o tu CRM para guardar leads. Haz que tu agente trabaje por ti mientras duermes.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-channels',
                    popover: {
                        title: '📡 Canales de Conexión',
                        description: 'Omnicanalidad real. Conecta WhatsApp, Instagram o tu Web. Tu agente estará listo para responder al instante, sea por donde sea que te escriban.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-settings',
                    popover: {
                        title: '⚙️ Configuración Avanzada',
                        description: 'Ajuste fino. ¿Quieres un agente creativo (Temp 0.9) o preciso (Temp 0.2)? Configura su zona horaria y si puede usar emojis 😎 para parecer más humano.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-fields',
                    popover: {
                        title: '📝 Campos Personalizados',
                        description: 'Memoria de elefante. Configura qué datos debe extraer y guardar del cliente. Ej: Crea un campo "Presupuesto" y el agente preguntará y guardará ese dato por ti.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#test-agent-btn',
                    popover: {
                        title: '🧪 Zona de Pruebas',
                        description: '¡Prueba tu agente aquí mismo antes de lanzarlo al público! Verifica que responda como esperas.',
                        side: 'left',
                        align: 'start'
                    }
                }
            ],
            onDestroyed: () => {
                // If checking hasSeenTour inside component logic to update DB
                if (!hasSeenTour) {
                    markAgentTourSeen();
                    router.refresh();
                }
            }
        });

        // Auto start if not seen
        if (!hasSeenTour) {
            // Small timeout to ensure DOM is ready
            setTimeout(() => {
                driverObj.current.drive();
            }, 1000);
        }

        // Listen for manual trigger
        const handleManualTrigger = () => {
            driverObj.current.drive();
        };

        window.addEventListener('trigger-agent-tour', handleManualTrigger);

        return () => {
            window.removeEventListener('trigger-agent-tour', handleManualTrigger);
            if (driverObj.current) {
                driverObj.current.destroy();
            }
        };
    }, [hasSeenTour, router]);

    return null; // Headless component
}
