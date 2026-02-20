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
                    element: '#config-toggle',
                    popover: {
                        title: '🚀 Modos de Configuración',
                        description: 'Hemos simplificado la interfaz. <br><br>• <strong>Básica:</strong> Lo esencial para que tu agente funcione hoy mismo.<br>• <strong>Avanzada:</strong> Herramientas de poder para usuarios expertos que buscan automatización total.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-profile',
                    popover: {
                        title: '👤 Perfil e Identidad',
                        description: 'Configura su apariencia y personalidad base. <br><br><strong>• Avatar:</strong> Usa el logo de tu empresa o una foto humana para generar confianza.<br><strong>• Rol:</strong> Define si será un Asistente, Vendedor o Soporte.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-job',
                    popover: {
                        title: '💼 Contexto Laboral',
                        description: 'Define la <strong>Empresa</strong> y el <strong>Puesto</strong>. Sé detallado en la descripción; cuanto más contexto tenga sobre tu negocio, mejores serán sus respuestas.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-training',
                    popover: {
                        title: '📚 Entrenamiento (Cerebro)',
                        description: 'Sube <strong>PDFs, Excel o tu Sitio Web</strong>. El agente leerá esta información y la usará para responder a los clientes con precisión quirúrgica.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-channels',
                    popover: {
                        title: '📡 Canales',
                        description: 'Conecta tu agente a <strong>WhatsApp, Instagram o tu Web</strong>. Un mismo "cerebro" atendiendo a todos tus clientes por donde ellos prefieran.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#config-advanced',
                    popover: {
                        title: '⚡️ Configuración Avanzada',
                        description: '¿Listo para el siguiente nivel? Haz clic aquí para desbloquear funciones de automatización, integraciones con CRMs y ajustes finos del motor de IA.',
                        side: 'bottom',
                        align: 'start',
                        onNextClick: () => {
                            const btn = document.getElementById('config-advanced');
                            if (btn) btn.click();
                            setTimeout(() => {
                                driverObj.current.moveNext();
                            }, 300);
                        }
                    },
                },
                {
                    element: '#tab-intents',
                    popover: {
                        title: '🎯 Intenciones',
                        description: 'Configura "superpoderes" sociales. Detecta cuando alguien quiere "agendar" o "comprar" y dispara acciones automáticas.',
                        side: 'bottom',
                        align: 'start',
                        onPrevClick: () => {
                            const btn = document.getElementById('config-basic');
                            if (btn) btn.click();
                            setTimeout(() => {
                                driverObj.current.movePrevious();
                            }, 300);
                        }
                    }
                },
                {
                    element: '#tab-media',
                    popover: {
                        title: '🖼️ Galería Multimedia',
                        description: 'Carga fotos de tus productos o mapas. El agente enviará la imagen correcta en el momento justo del chat.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-integrations',
                    popover: {
                        title: '🔌 Conectividad',
                        description: 'Conecta tu bot con <strong>Google Calendar, CRMs o Hojas de Cálculo</strong>. Automatiza ventas y registros sin mover un dedo.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-settings',
                    popover: {
                        title: '⚙️ Ajustes del Motor',
                        description: 'Controla la "Temperatura" (creatividad) y elige el modelo de IA. Ajusta el tono con emojis y define la zona horaria comercial.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-fields',
                    popover: {
                        title: '📝 Captura de Datos',
                        description: 'Define qué datos son vitales (Email, Teléfono) y el bot los recolectará y guardará en tu base de datos automáticamente.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#test-agent-btn',
                    popover: {
                        title: '🧪 Zona de Pruebas',
                        description: '¡El paso final! Antes de lanzarlo al mundo, conversa con tu agente aquí para asegurarte de que está listo para brillar.',
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
