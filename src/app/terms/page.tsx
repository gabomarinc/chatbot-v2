export default function TermsPage() {
    return (
        <div className="max-w-4xl mx-auto py-16 px-6 sm:px-12 bg-white min-h-screen">
            <h1 className="text-3xl font-bold mb-8 text-gray-900">Términos y Condiciones</h1>

            <div className="prose prose-slate max-w-none text-gray-600">
                <p className="mb-4">Última actualización: {new Date().toLocaleDateString()}</p>

                <p className="mb-6">
                    Bienvenido a Kônsul. Al utilizar nuestros servicios, usted acepta estos Términos y Condiciones.
                </p>

                <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">1. Uso del Servicio</h2>
                <p className="mb-4">
                    Kônsul proporciona herramientas para crear y gestionar agentes de Inteligencia Artificial para atención al cliente
                    en canales como WhatsApp, Web e Instagram.
                </p>
                <ul className="list-disc pl-6 mb-6 space-y-2">
                    <li>Usted es responsable del contenido que sus agentes generan.</li>
                    <li>No debe utilizar el servicio para enviar spam o contenido ilegal.</li>
                    <li>Debe cumplir con las políticas de comercio y mensajería de WhatsApp y Meta.</li>
                </ul>

                <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">2. Integración con Meta</h2>
                <p className="mb-4">
                    Al conectar su cuenta de WhatsApp Business, usted autoriza a Kônsul a gestionar mensajes en su nombre.
                    Usted mantiene la propiedad de su cuenta de WhatsApp y sus clientes.
                </p>

                <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">3. Responsabilidad</h2>
                <p className="mb-6">
                    El servicio se proporciona "tal cual". Kônsul no garantiza que el servicio sea ininterrumpido o libre de errores.
                </p>

                <h2 className="text-xl font-bold mt-8 mb-4 text-gray-900">4. Modificaciones</h2>
                <p className="mb-6">
                    Nos reservamos el derecho de modificar estos términos en cualquier momento.
                </p>
            </div>
        </div>
    );
}
