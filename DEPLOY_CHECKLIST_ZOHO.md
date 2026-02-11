# Consola de Despliegue - Zoho CRM Integration

¡El código ha sido enviado a GitHub! 🚀

## Siguientes Pasos Críticos

Para que esto funcione en Producción (tu servidor real), debes configurar las variables de entorno.

### 1. Variables de Entorno (Environment Variables)
Agrega estas dos variables en tu panel de Vercel/Hostinger/Servidor:

*   **`ZOHO_CLIENT_ID`**: `1000.C1FLBGSIBKY6RVD4RRM2JNIYNOGBKZ`
*   **`ZOHO_CLIENT_SECRET`**: `f91a4fad4ae66cb57ad5f763192f6453e7a2a51b8a`

> **Nota:** Estas llaves son las que obtuviste de la consola de Zoho (.eu).

### 2. Verificar URL de Redirección
Asegúrate de que en la consola de Zoho (donde creaste la app) la URL de redirección coincida con tu dominio de producción:
*   Para pruebas locales: `http://localhost:3000/api/oauth/zoho/callback`
*   Para producción: `https://agentes.konsul.digital/api/oauth/zoho/callback` (o tu dominio real)

### 3. Prueba
Una vez desplegado:
1.  Ve a Integraciones.
2.  Conecta Zoho.
3.  Escribe en el chat: "Me llamo X y mi correo es Y".
4.  Verifica que aparezca en Zoho CRM.
