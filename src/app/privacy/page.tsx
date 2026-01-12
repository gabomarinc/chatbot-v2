export default function PrivacyPage() {
    return (
        <div className="max-w-4xl mx-auto py-16 px-6 sm:px-12 bg-white min-h-screen">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">Política de Privacidad</h1>

            <div className="prose prose-slate max-w-none text-gray-600">
                <p className="mb-4">Última actualización: {new Date().toLocaleDateString()}</p>

                <p className="mb-6">
                    Kônsul ("nosotros", "nuestro") se compromete a proteger su privacidad.
                    Esta Política de Privacidad explica cómo recopilamos, usamos y protegemos su información
                    cuando utiliza nuestra plataforma de Agentes de IA y nuestros servicios de integración con WhatsApp y Meta.
                </p>

                <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">1. Información que Recopilamos</h2>
                <p className="mb-4">
                    Recopilamos información que usted nos proporciona directamente, como:
                </p>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                    <li>Información de contacto (nombre, email, teléfono).</li>
                    <li>Información de su negocio para la configuración de agentes.</li>
                    <li>Contenido de los mensajes procesados a través de nuestros agentes (para proporcionar el servicio de respuesta automática).</li>
                </ul>

                <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">2. Uso de Datos de Meta (Facebook/WhatsApp)</h2>
                <p className="mb-4">
                    Nuestra aplicación utiliza los servicios de Meta para la integración con WhatsApp Business.
                    Cumplimos estrictamente con las políticas de uso de datos de Meta:
                </p>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                    <li><strong>Propósito Limitado:</strong> Solo utilizamos los datos recibidos (mensajes, números de teléfono) para facilitar la comunicación automatizada entre su negocio y sus clientes.</li>
                    <li><strong>No Venta:</strong> No vendemos ni transferimos sus datos a terceros para fines publicitarios.</li>
                    <li><strong>Seguridad:</strong> Implementamos medidas de seguridad para proteger los tokens de acceso y la información de los mensajes.</li>
                </ul>

                <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">3. Seguridad de los Datos</h2>
                <p className="mb-6">
                    Tomamos medidas razonables para proteger su información contra pérdida, robo, uso indebido y acceso no autorizado.
                </p>

                <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">4. Contacto</h2>
                <p className="mb-6">
                    Si tiene preguntas sobre esta política, contáctenos a través de nuestro soporte.
                </p>
            </div>
        </div>
    );
}
