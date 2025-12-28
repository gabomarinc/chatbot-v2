# Guía de Configuración de Cloudflare R2

Esta guía te ayudará a encontrar todas las credenciales necesarias para configurar R2 en tu aplicación.

## 📋 Pasos para Obtener las Credenciales

### 1. **R2_ACCOUNT_ID** (Account ID de Cloudflare)

**Ubicación:**
1. Inicia sesión en [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. En la barra lateral derecha, verás el **Account ID** directamente visible
   - Está en la parte inferior de la barra lateral, debajo de tu nombre
   - Es un código alfanumérico (ejemplo: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5`)
3. También puedes encontrarlo en:
   - Cualquier página del dashboard en la barra lateral derecha
   - O haciendo clic en tu perfil → verás el Account ID

### 2. **R2_BUCKET_NAME** (Nombre del Bucket)

**Ubicación:**
1. Ve a **R2** en el menú lateral izquierdo del dashboard de Cloudflare
2. Si ya tienes un bucket:
   - Verás la lista de buckets
   - El nombre del bucket es el que aparece en la lista
3. Si necesitas crear un bucket:
   - Haz clic en **"Create bucket"**
   - Ingresa un nombre (ejemplo: `chatbot-uploads`)
   - Haz clic en **"Create bucket"**
   - El nombre que ingresaste es tu `R2_BUCKET_NAME`

### 3. **R2_ACCESS_KEY_ID** y **R2_SECRET_ACCESS_KEY** (API Tokens)

**⚠️ IMPORTANTE: No uses "Account API tokens", necesitas los tokens específicos de R2**

**Ubicación correcta:**
1. **Desde la barra lateral izquierda**, haz clic en **"R2"** (o busca "R2" en el menú)
2. Una vez en la página de R2, busca el botón/enlace **"Manage R2 API Tokens"** que está en la parte superior de la página
   - Este enlace te llevará a la sección específica de tokens de R2
   - O ve directamente a: `https://dash.cloudflare.com/[TU_ACCOUNT_ID]/r2/api-tokens`
   - La URL debe tener `/r2/api-tokens` al final, NO `/account/api-tokens`

3. En la página de **"R2 API Tokens"**, haz clic en **"Create API token"**

4. Configura el token:
   - **Token name**: Un nombre descriptivo (ej: `chatbot-upload-token`)
   - **Permissions**: Selecciona **"Object Read & Write"** o **"Admin Read & Write"**
   - **TTL**: Opcional, puedes dejarlo en blanco para que no expire
   - **Buckets**: Puedes restringirlo a un bucket específico o dejarlo en "All buckets"

5. Haz clic en **"Create API Token"**

6. **IMPORTANTE**: Copia inmediatamente las credenciales que aparecen:
   - **Access Key ID** → Este es tu `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → Este es tu `R2_SECRET_ACCESS_KEY`
   - ⚠️ **La Secret Access Key solo se muestra UNA VEZ**. Si la pierdes, tendrás que crear un nuevo token.

**Diferencias importantes:**
- ❌ **"Account API Tokens"** = Tokens generales para toda la cuenta (NO son los que necesitas)
- ✅ **"R2 API Tokens"** = Tokens específicos para R2 (ESTOS son los que necesitas)

### 4. **R2_PUBLIC_DOMAIN** (Dominio Público - Opcional)

**Para usar URLs públicas directamente:**

**Opción A: Usar un Custom Domain (Recomendado)**
1. Ve a tu bucket en R2
2. Haz clic en **"Settings"** del bucket
3. Ve a la sección **"Public Access"**
4. Haz clic en **"Connect Domain"**
5. Ingresa un subdominio (ej: `uploads.tudominio.com`)
6. Sigue las instrucciones para configurar el DNS
7. Una vez configurado, `R2_PUBLIC_DOMAIN` será `https://uploads.tudominio.com`

**Opción B: Usar R2.dev Subdomain (Limitado)**
1. Ve a tu bucket en R2
2. Haz clic en **"Settings"** del bucket
3. Ve a la sección **"Public Access"**
4. Si está disponible, puedes usar el subdominio R2.dev
   - Será algo como: `https://<account-id>.r2.cloudflarestorage.com/<bucket-name>`
   - ⚠️ Esta opción tiene limitaciones y no siempre está disponible

**Opción C: Sin dominio público (Usar Pre-signed URLs)**
- Si no configuras `R2_PUBLIC_DOMAIN`, el código intentará usar una URL directa
- En producción, es mejor usar pre-signed URLs (requiere modificación del código)

## 🔧 Configuración en tu Aplicación

Una vez que tengas todas las credenciales, agrégales a tu archivo `.env` o a las variables de entorno de Vercel:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5
R2_ACCESS_KEY_ID=tu_access_key_id_aqui
R2_SECRET_ACCESS_KEY=tu_secret_access_key_aqui
R2_BUCKET_NAME=chatbot-uploads
R2_PUBLIC_DOMAIN=https://uploads.tudominio.com  # Opcional, solo si configuraste un dominio público
```

## 📝 Notas Importantes

1. **Seguridad**: Nunca compartas tus credenciales ni las subas a repositorios públicos
2. **Secret Access Key**: Solo se muestra una vez al crear el token. Guárdala en un lugar seguro
3. **Permisos**: Para producción, crea tokens con permisos mínimos necesarios (solo el bucket que necesitas)
4. **Región**: El código actual usa `eu.r2.cloudflarestorage.com`. Si tu bucket está en otra región, puede que necesites ajustar el endpoint en `src/lib/r2.ts`
5. **CORS**: Si vas a servir archivos públicamente desde un dominio diferente, configura CORS en la configuración del bucket

## 🔍 Verificación

Para verificar que todo está configurado correctamente:

1. Intenta subir una imagen en el chatbot
2. Revisa los logs del servidor si hay errores
3. Si todo está bien, deberías ver la imagen subida y accesible en la URL proporcionada

## 🆘 Troubleshooting

**Error: "R2 credentials not configured"**
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que los nombres de las variables sean exactos (case-sensitive)

**Error: "Access Denied" o "403 Forbidden"**
- Verifica que el API Token tenga los permisos correctos
- Asegúrate de que el token tenga acceso al bucket especificado

**Error: "Bucket not found"**
- Verifica que el nombre del bucket sea correcto
- Asegúrate de que el bucket exista en tu cuenta de Cloudflare

**URLs no funcionan públicamente**
- Configura un dominio público o usa pre-signed URLs
- Verifica que el bucket tenga acceso público configurado si es necesario

