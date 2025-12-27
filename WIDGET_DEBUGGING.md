# Debugging del Widget - Guía

## Problema: El widget no responde a los mensajes

### Pasos para Diagnosticar

1. **Abre la Consola del Navegador:**
   - Presiona `F12` o `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
   - Ve a la pestaña "Console"
   - Busca errores en rojo cuando envías un mensaje

2. **Errores Comunes:**

   **a) "Channel not active"**
   - **Causa:** El canal no está activo en la base de datos
   - **Solución:** Ve a la configuración del canal y asegúrate de que esté activo

   **b) "Insufficient credits"**
   - **Causa:** El workspace no tiene créditos disponibles
   - **Solución:** Ve a Billing y agrega créditos al workspace

   **c) "OpenAI API Key not configured"**
   - **Causa:** La API key de OpenAI no está configurada
   - **Solución:** 
     - En Vercel: Agrega `OPENAI_API_KEY` en Environment Variables
     - O en la base de datos: Agrega la key en Admin Settings

   **d) Error de red (Network Error)**
   - **Causa:** Problema de conexión o la función no se está ejecutando
   - **Solución:** Verifica que el deployment esté funcionando correctamente

3. **Verificar en el Servidor (Logs de Vercel):**
   - Ve al dashboard de Vercel
   - Selecciona tu proyecto
   - Ve a "Functions" → Busca errores en los logs
   - O revisa "Runtime Logs" para ver errores en tiempo real

4. **Verificar Variables de Entorno:**
   - `OPENAI_API_KEY` - Debe estar configurada
   - `DATABASE_URL` - Debe estar configurada y accesible
   - `NEXTAUTH_SECRET` - Debe estar configurada

5. **Verificar el Canal:**
   - El canal debe existir en la base de datos
   - El canal debe estar activo (`isActive: true`)
   - El agente asociado debe existir

6. **Verificar Créditos:**
   - El workspace debe tener créditos disponibles
   - Ve a Billing y verifica el balance

## Pasos para Probar

1. Abre el widget en el navegador
2. Abre la consola del navegador (F12)
3. Escribe un mensaje en el widget
4. Revisa la consola para ver qué error aparece
5. Copia el error completo y compártelo

## Mensajes de Error Mejorados

Ahora el widget mostrará mensajes más claros cuando haya errores:
- Si faltan créditos: "No hay créditos disponibles..."
- Si falta la API key: "Error de configuración del servidor..."
- Otros errores: "Problemas de conexión. Por favor, intenta de nuevo."


