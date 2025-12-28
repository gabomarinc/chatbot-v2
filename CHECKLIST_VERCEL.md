# Checklist para Debugging en Vercel

## ✅ Variables de Entorno Mínimas Requeridas

Asegúrate de que estas variables estén configuradas en Vercel:

### Obligatorias:
- [ ] `DATABASE_URL` - Connection string de PostgreSQL
- [ ] `NEXTAUTH_SECRET` - Genera con: `openssl rand -base64 32`
- [ ] `NEXTAUTH_URL` - URL de tu app (ej: `https://chatbot-v2-weld.vercel.app`)
- [ ] `OPENAI_API_KEY` - Tu API key de OpenAI (sk-...)

### Opcionales pero recomendadas:
- [ ] `NEXT_PUBLIC_APP_URL` - Mismo valor que NEXTAUTH_URL

## 🔍 Cómo Verificar el Estado del Deployment

1. **Ve al Dashboard de Vercel:**
   - https://vercel.com/dashboard
   - Selecciona tu proyecto

2. **Revisa la pestaña "Deployments":**
   - Busca el deployment más reciente
   - Verifica su estado (Ready, Error, Building, etc.)

3. **Si hay un deployment con error:**
   - Haz clic en él
   - Revisa los "Build Logs" para ver el error específico
   - Copia el error completo

4. **Si no hay deployments o todos fallaron:**
   - Ve a "Settings" → "Environment Variables"
   - Verifica que todas las variables estén configuradas
   - Asegúrate de que estén configuradas para "Production", "Preview" y "Development"

## 🚨 Errores Comunes

### Error: "DEPLOYMENT_NOT_FOUND"
- Significa que el deployment específico no existe
- **Solución:** Ve al dashboard y revisa si hay deployments activos
- Si no hay deployments, intenta hacer un nuevo deploy manualmente

### Error: "Build Failed"
- Revisa los Build Logs para ver el error específico
- Común: Variables de entorno faltantes
- Común: Errores de TypeScript
- Común: Errores de Prisma (base de datos no accesible)

### Error: "DATABASE_URL not found"
- Verifica que DATABASE_URL esté configurada en Vercel
- Asegúrate de que la base de datos esté accesible desde internet

## 📝 Pasos para Hacer un Nuevo Deploy

1. **Ve al Dashboard de Vercel**
2. **Selecciona tu proyecto**
3. **Haz clic en "Deployments"**
4. **Haz clic en el botón "..." (tres puntos) del deployment más reciente**
5. **Selecciona "Redeploy"**
   - O haz push de un nuevo commit a GitHub

## 🔧 Si el Problema Persiste

1. **Verifica que el código esté en GitHub:**
   ```bash
   git status
   git log --oneline -5
   ```

2. **Verifica la conexión de Vercel con GitHub:**
   - Settings → Git
   - Verifica que el repositorio esté conectado correctamente

3. **Revisa los logs del build:**
   - En cada deployment, hay un botón para ver los "Build Logs"
   - Copia cualquier error que veas

4. **Prueba hacer un deploy manual:**
   - En Vercel, ve a "Deployments"
   - Haz clic en "Deploy" o "Redeploy"



