# 🔑 Guía Rápida: Crear Tokens de R2 en Cloudflare

## Paso a Paso Visual

### Paso 1: Ir a la sección R2
1. En el dashboard de Cloudflare, mira el **menú lateral izquierdo**
2. Busca y haz clic en **"R2"** (debería estar en la lista de servicios)

### Paso 2: Ir a Manage R2 API Tokens
Una vez en la página de R2:
- Busca en la parte **superior** de la página un botón/enlace que diga **"Manage R2 API Tokens"**
- Haz clic en él
- Esto te llevará a la página específica de tokens de R2

**Nota importante**: 
- ✅ La URL debe terminar en `/r2/api-tokens`
- ❌ NO debe ser `/account/api-tokens` (esa es otra sección)

### Paso 3: Crear el Token
1. Haz clic en **"Create API token"** (botón azul)
2. Completa el formulario:
   - **Token name**: `chatbot-uploads` (o el nombre que prefieras)
   - **Permissions**: Selecciona **"Object Read & Write"** (o "Admin Read & Write" si necesitas más permisos)
   - **Buckets**: Puedes elegir "All buckets" o seleccionar un bucket específico
   - **TTL**: Déjalo vacío si quieres que no expire

### Paso 4: COPIAR LAS CREDENCIALES INMEDIATAMENTE
⚠️ **MUY IMPORTANTE**: Después de crear el token, verás:
- **Access Key ID**: Cópialo (este es tu `R2_ACCESS_KEY_ID`)
- **Secret Access Key**: Cópialo INMEDIATAMENTE (este es tu `R2_SECRET_ACCESS_KEY`)
  - **Esta clave solo se muestra UNA VEZ**
  - Si la pierdes, tendrás que crear un nuevo token

### Paso 5: Guardar en Variables de Entorno
Agrega estas variables a tu `.env` o a Vercel:

```env
R2_ACCESS_KEY_ID=el_access_key_id_que_copiaste
R2_SECRET_ACCESS_KEY=el_secret_access_key_que_copiaste
```

## 🔍 ¿Cómo saber si estás en la página correcta?

**Página CORRECTA** (R2 API Tokens):
- URL contiene: `/r2/api-tokens`
- Título dice algo como "R2 API Tokens" o "Manage R2 API Tokens"
- Tienes opciones para crear tokens específicos de R2

**Página INCORRECTA** (Account API Tokens):
- URL contiene: `/account/api-tokens`
- Título dice "Account API tokens"
- Muestra templates como "Edit zone DNS", "Read billing info", etc.
- ❌ Esta NO es la página que necesitas para R2

## 🆘 Si no encuentras "Manage R2 API Tokens"

1. Asegúrate de estar en la página principal de R2 (no en un bucket específico)
2. Busca en la parte superior de la página, a veces está en un dropdown o menú
3. Intenta ir directamente a: `https://dash.cloudflare.com/[TU_ACCOUNT_ID]/r2/api-tokens`
   - Reemplaza `[TU_ACCOUNT_ID]` con tu Account ID real

## ✅ Verificación

Una vez que tengas las credenciales:
1. Agrégalas a tus variables de entorno
2. Reinicia tu servidor/aplicación
3. Intenta subir una imagen en el chatbot
4. Si funciona, ¡listo! 🎉

