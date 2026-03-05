(function () {
    // 1. Configuración
    const script = document.currentScript;
    const channelId = script.getAttribute('data-channel-id');

    // Detect base URL from script src
    const scriptSrc = script.src;
    const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
    const widgetUrl = `${baseUrl}/widget/${channelId}`;

    if (!channelId) {
        console.error('Kônsul Widget: data-channel-id is required');
        return;
    }

    // 2. Función de Inicialización
    function initWidget() {
        // Evitar duplicados
        if (document.getElementById('konsul-widget-container')) return;

        // Estilos
        const style = document.createElement('style');
        style.innerHTML = `
            :root {
                --konsul-primary: #21AC96;
                --konsul-primary-hover: #1a8a78;
            }
            .konsul-widget-container {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 2147483647; /* Max Z-Index safe range */
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            .konsul-bubble {
                width: 60px;
                height: 60px;
                border-radius: 30px;
                background: var(--konsul-primary);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s, background 0.2s;
            }
            .konsul-bubble:hover {
                transform: scale(1.05);
                filter: brightness(0.9);
            }
            .konsul-bubble svg {
                width: 32px;
                height: 32px;
                fill: white;
            }
            .konsul-iframe-container {
                position: fixed;
                bottom: 100px;
                right: 20px;
                width: 400px;
                height: 600px;
                max-height: calc(100vh - 120px);
                background: white;
                border-radius: 16px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                overflow: hidden;
                opacity: 0;
                pointer-events: none;
                transform: translateY(20px);
                transition: opacity 0.3s, transform 0.3s;
                z-index: 2147483647;
                display: flex; /* Ensure it takes space inside when visible */
                flex-direction: column;
            }
            .konsul-iframe-container.open {
                opacity: 1;
                pointer-events: auto;
                transform: translateY(0);
            }
            .konsul-iframe {
                width: 100%;
                height: 100%;
                border: none;
                flex: 1;
            }
            @media (max-width: 480px) {
                .konsul-iframe-container {
                    width: 100%;
                    height: 100%;
                    bottom: 0;
                    right: 0;
                    border-radius: 0;
                    max-height: 100vh;
                }
            }
        `;
        document.head.appendChild(style);

        // Crear Bubble Button
        const container = document.createElement('div');
        container.id = 'konsul-widget-container';
        container.className = 'konsul-widget-container';

        const bubble = document.createElement('div');
        bubble.className = 'konsul-bubble';
        bubble.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
        `;

        // Crear Iframe Container
        const iframeContainer = document.createElement('div');
        iframeContainer.className = 'konsul-iframe-container';

        // Preload iframe immediately (hidden) to ensure it's "created" as user requested
        const iframe = document.createElement('iframe');
        iframe.src = widgetUrl;
        iframe.className = 'konsul-iframe';
        iframe.allow = "camera; microphone; autoplay; encrypted-media"; // Standard permissions
        iframeContainer.appendChild(iframe);

        bubble.onclick = () => {
            const isOpen = iframeContainer.classList.contains('open');
            if (isOpen) {
                iframeContainer.classList.remove('open');
            } else {
                iframeContainer.classList.add('open');
            }
        };

        container.appendChild(bubble);
        document.body.appendChild(iframeContainer);
        document.body.appendChild(container);

        // Listen for color configuration from iframe
        window.addEventListener('message', (event) => {
            if (event.data?.type === 'KONSUL_WIDGET_COLOR' && event.data.color) {
                const root = document.documentElement;
                root.style.setProperty('--konsul-primary', event.data.color);
                // Create a slightly darker version for hover (hacky but works for HEX)
                try {
                    root.style.setProperty('--konsul-primary-hover', event.data.color);
                    // We can also use filter in CSS instead of calculating darker color
                } catch (e) { }
            }
        });
    }

    // 3. Ejecutar cuando el DOM esté listo
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initWidget();
    } else {
        document.addEventListener('DOMContentLoaded', initWidget);
    }

})();
