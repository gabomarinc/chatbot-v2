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
                        description: 'Aquí defines quién es tu agente: su nombre, su avatar y su rol básico.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-job',
                    popover: {
                        title: '💼 Descripción del Trabajo',
                        description: 'Define qué hace tu agente y en qué empresa trabaja. Esto le da contexto profesional.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-training',
                    popover: {
                        title: '📚 Base de Conocimiento',
                        description: 'Lo más importante. Carga PDFs, webs o texto para que tu agente sepa qué responder.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-intents',
                    popover: {
                        title: '🎯 Intenciones y Acciones',
                        description: 'Programas "gatillos" para detectar cuando un usuario quiere algo específico (comprar, agendar, etc.)',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-media',
                    popover: {
                        title: '🖼️ Galería Visual',
                        description: 'Sube imágenes de productos, menús o mapas. Tu agente podrá enviarlas en el chat para enriquecer la conversación visualmente.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-integrations',
                    popover: {
                        title: '🔌 Integraciones',
                        description: 'Superpoderes para tu agente. Conecta Calendarios, CRMs y otras herramientas externas para automatizar tareas reales.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-channels',
                    popover: {
                        title: '📡 Canales de Conexión',
                        description: '¿WhatsApp, Instagram o Web? Decide por dónde hablará tu agente con el mundo y conecta tus cuentas.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-settings',
                    popover: {
                        title: '⚙️ Configuración Avanzada',
                        description: 'Ajusta la "temperatura" (creatividad) del cerebro IA y otras reglas de comportamiento.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-fields',
                    popover: {
                        title: '📝 Campos Personalizados',
                        description: 'Define qué datos específicos debe recordar el agente sobre tus clientes (Talla, Presupuesto, ID, etc).',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#test-agent-btn',
                    popover: {
                        title: '🧪 Zona de Pruebas',
                        description: '¡Prueba tu agente aquí mismo antes de lanzarlo al público!',
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
