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
                        title: '👤 Perfil e Identidad',
                        description: 'Este es el primer paso para dar vida a tu agente. Aquí configurarás su apariencia pública y su personalidad base.\n\n• **Nombre:** Cómo se presentará ante los usuarios.\n• **Avatar:** Una imagen genera confianza; usa el logo de tu empresa o una foto humana.\n• **Rol:** Define si será un Asistente servicial, un Vendedor agresivo o un Soporte técnico calmado.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-job',
                    popover: {
                        title: '💼 Contexto Laboral',
                        description: 'Para que la IA sea efectiva, necesita saber "quién es" profesionalmente. \n\nDefine la **Empresa** que representa y su **Puesto de Trabajo**. En la "Descripción", sé muy detallado sobre qué productos venden, cuál es la propuesta de valor única y qué tono de voz debe usar (formal, cercano, técnico). Cuanto más contexto, mejores respuestas.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-training',
                    popover: {
                        title: '📚 Base de Conocimiento (Cerebro)',
                        description: 'Aquí es donde "educas" a tu agente. Sin datos, la IA puede alucinar.\n\n• **Archivos:** Sube PDFs con menús, listas de precios, políticas de devolución o manuales técnicos.\n• **Sitios Web:** Agrega tu URL para que el agente lea tu página y aprenda sobre tu negocio automáticamente.\nLa IA buscará en esta información antes de responder cualquier pregunta.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-intents',
                    popover: {
                        title: '🎯 Intenciones y Automatización',
                        description: 'Las "Intenciones" son superpoderes que permiten al agente actuar, no solo hablar.\n\nConfigura palabras clave o frases (ej: "Quiero agendar") que disparen acciones específicas:\n• Abrir un calendario de reservas.\n• Enviar un formulario de contacto.\n• Derivar la charla a un humano.\nEs la clave para convertir conversaciones en ventas.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-media',
                    popover: {
                        title: '🖼️ Galería Multimedia',
                        description: 'El texto a veces no es suficiente. Aquí puedes cargar una biblioteca de imágenes:\n\n• Fotos de productos destacados.\n• Mapas de ubicación de la oficina.\n• Gráficos o esquemas explicativos.\n\nTu agente será capaz de seleccionar y enviar la imagen correcta en el momento justo de la conversación.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-integrations',
                    popover: {
                        title: '🔌 Conectividad e Integraciones',
                        description: 'Tu agente no es una isla. Aquí lo conectas con tus herramientas de negocio:\n\n• **Calendario:** Para que agende citas directamente en tu agenda.\n• **CRM:** Para guardar automáticamente los datos de clientes potenciales.\n• **Hojas de Cálculo:** Para registrar pedidos o incidencias.\nAutomatiza el flujo de trabajo completo sin intervención manual.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-channels',
                    popover: {
                        title: '📡 Canales de Comunicación',
                        description: 'La omnicanalidad simplificada. Decide por dónde podrán contactar a este agente:\n\n• **WhatsApp:** Ideal para ventas y soporte rápido.\n• **Web Widget:** Para captar visitas en tu página.\n• **Instagram/Facebook:** Para responder consultas sociales.\n\nPuedes tener el mismo "cerebro" atendiendo todos estos canales simultáneamente.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-settings',
                    popover: {
                        title: '⚙️ Configuración del Motor IA',
                        description: 'Ajustes técnicos para refinar el comportamiento:\n\n• **Modelo:** Elige entre rapidez (Flash) o razonamiento complejo (Pro).\n• **Temperatura:** Sube el valor para más creatividad, bájalo para precisión robótica.\n• **Emojis:** Actívalos para un trato más humano y cálido.\n• **Zona Horaria:** Crítico para que el agente entienda "mañana a las 5pm".',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-fields',
                    popover: {
                        title: '📝 Captura de Datos (Campos)',
                        description: 'Convierte el chat en una base de datos. Define qué información es vital recolectar:\n\nEjemplos: *Correo electrónico, Teléfono, Presupuesto, Talla, Fecha de evento*.\n\nEl agente preguntará de forma natural por estos datos durante la charla y los guardará en el perfil del contacto automáticamente.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#test-agent-btn',
                    popover: {
                        title: '🧪 Zona de Pruebas (Playground)',
                        description: 'El paso final y más importante. Antes de conectar tu agente al mundo real, pruébalo aquí.\n\nSimula conversaciones reales, intenta "romperlo" con preguntas difíciles y verifica que usa las herramientas correctas. ¡Asegúrate de que está listo para brillar!',
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
