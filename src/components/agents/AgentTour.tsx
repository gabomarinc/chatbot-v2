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
                        description: 'Este es el primer paso para dar vida a tu agente. Aquí configurarás su apariencia pública y su personalidad base.<br><br><strong>• Nombre:</strong> Cómo se presentará ante los usuarios.<br><strong>• Avatar:</strong> Una imagen genera confianza; usa el logo de tu empresa o una foto humana.<br><strong>• Rol:</strong> Define si será un Asistente servicial, un Vendedor agresivo o un Soporte técnico calmado.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-job',
                    popover: {
                        title: '💼 Contexto Laboral',
                        description: 'Para que la IA sea efectiva, necesita saber "quién es" profesionalmente.<br><br>Define la <strong>Empresa</strong> que representa y su <strong>Puesto de Trabajo</strong>. En la "Descripción", sé muy detallado sobre qué productos venden, cuál es la propuesta de valor única y qué tono de voz debe usar (formal, cercano, técnico).<br><br><em>Cuanto más contexto, mejores respuestas.</em>',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-training',
                    popover: {
                        title: '📚 Base de Conocimiento (Cerebro)',
                        description: 'Aquí es donde "educas" a tu agente. Sin datos, la IA puede alucinar.<br><br><strong>• Archivos:</strong> Sube PDFs con menús, listas de precios, políticas de devolución o manuales técnicos.<br><strong>• Sitios Web:</strong> Agrega tu URL para que el agente lea tu página y aprenda sobre tu negocio automáticamente.<br><br>La IA buscará en esta información antes de responder cualquier pregunta.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-intents',
                    popover: {
                        title: '🎯 Intenciones y Automatización',
                        description: 'Las "Intenciones" son superpoderes que permiten al agente actuar, no solo hablar.<br><br>Configura palabras clave o frases (ej: "Quiero agendar") que disparen acciones específicas:<br>• Abrir un calendario de reservas.<br>• Enviar un formulario de contacto.<br>• Derivar la charla a un humano.<br><br><strong>Es la clave para convertir conversaciones en ventas.</strong>',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-media',
                    popover: {
                        title: '🖼️ Galería Multimedia',
                        description: 'El texto a veces no es suficiente. Aquí puedes cargar una biblioteca de imágenes:<br><br>• Fotos de productos destacados.<br>• Mapas de ubicación de la oficina.<br>• Gráficos o esquemas explicativos.<br><br>Tu agente será capaz de seleccionar y enviar la imagen correcta en el momento justo de la conversación.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-integrations',
                    popover: {
                        title: '🔌 Conectividad e Integraciones',
                        description: 'Tu agente no es una isla. Aquí lo conectas con tus herramientas de negocio:<br><br><strong>• Calendario:</strong> Para que agende citas directamente en tu agenda.<br><strong>• CRM:</strong> Para guardar automáticamente los datos de clientes potenciales.<br><strong>• Hojas de Cálculo:</strong> Para registrar pedidos o incidencias.<br><br>Automatiza el flujo de trabajo completo sin intervención manual.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-channels',
                    popover: {
                        title: '📡 Canales de Comunicación',
                        description: 'La omnicanalidad simplificada. Decide por dónde podrán contactar a este agente:<br><br><strong>• WhatsApp:</strong> Ideal para ventas y soporte rápido.<br><strong>• Web Widget:</strong> Para captar visitas en tu página.<br><strong>• Instagram/Facebook:</strong> Para responder consultas sociales.<br><br>Puedes tener el mismo "cerebro" atendiendo todos estos canales simultáneamente.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-settings',
                    popover: {
                        title: '⚙️ Configuración del Motor IA',
                        description: 'Ajustes técnicos para refinar el comportamiento:<br><br><strong>• Modelo:</strong> Elige entre rapidez (Flash) o razonamiento complejo (Pro).<br><strong>• Temperatura:</strong> Sube el valor para más creatividad, bájalo para precisión robótica.<br><strong>• Emojis:</strong> Actívalos para un trato más humano y cálido.<br><strong>• Zona Horaria:</strong> Crítico para que el agente entienda "mañana a las 5pm".',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#tab-fields',
                    popover: {
                        title: '📝 Captura de Datos (Campos)',
                        description: 'Convierte el chat en una base de datos. Define qué información es vital recolectar:<br><br>Ejemplos: <em>Correo electrónico, Teléfono, Presupuesto, Talla, Fecha de evento</em>.<br><br>El agente preguntará de forma natural por estos datos durante la charla y los guardará en el perfil del contacto automáticamente.',
                        side: 'bottom',
                        align: 'start'
                    }
                },
                {
                    element: '#test-agent-btn',
                    popover: {
                        title: '🧪 Zona de Pruebas (Playground)',
                        description: 'El paso final y más importante. Antes de conectar tu agente al mundo real, pruébalo aquí.<br><br>Simula conversaciones reales, intenta "romperlo" con preguntas difíciles y verifica que usa las herramientas correctas. <br><br><strong>¡Asegúrate de que está listo para brillar!</strong>',
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
