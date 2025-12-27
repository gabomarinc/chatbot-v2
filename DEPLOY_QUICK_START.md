# 🚀 Quick Start - Despliegue en Vercel

## Paso 1: Subir código a GitHub

```bash
cd /Users/ortizalfano/Downloads/chatbot-v2-interno-NO

# Si no tienes git inicializado
git init
git add .
git commit -m "Initial commit: Preparado para Vercel"

# Agregar remoto
git remote add origin https://github.com/gabomarinc/chatbot-v2.git
git branch -M main
git push -u origin main
```

## Paso 2: Conectar con Vercel

1. Ve a https://vercel.com
2. "Add New..." → "Project"
3. Importa `gabomarinc/chatbot-v2`
4. Vercel detectará Next.js automáticamente

## Paso 3: Variables de Entorno

En Vercel → Settings → Environment Variables, agrega:

**Mínimas requeridas:**
- `DATABASE_URL` - Tu conexión a PostgreSQL
- `NEXTAUTH_SECRET` - Genera con: `openssl rand -base64 32`
- `NEXTAUTH_URL` - **Después del deploy:** `https://tu-app.vercel.app`
- `OPENAI_API_KEY` - Tu key de OpenAI

**Opcionales:**
- `META_APP_ID` - Para WhatsApp
- `META_APP_SECRET` - Para WhatsApp
- `GOOGLE_CLIENT_ID` - Para Google Calendar
- `GOOGLE_CLIENT_SECRET` - Para Google Calendar
- Variables de AWS S3 si usas almacenamiento

## Paso 4: Deploy

1. Click en "Deploy"
2. Espera a que termine
3. Obtén tu URL: `https://tu-app.vercel.app`

## Paso 5: Actualizar URLs después del deploy

**En Vercel:**
- Actualiza `NEXTAUTH_URL` = `https://tu-app.vercel.app`
- Agrega `NEXT_PUBLIC_APP_URL` = `https://tu-app.vercel.app`
- Haz "Redeploy" para aplicar cambios

**En Meta (si usas WhatsApp):**
- URI de redireccionamiento: `https://tu-app.vercel.app/channels/setup/whatsapp`

**En Google Cloud (si usas Google):**
- Redirect URI: `https://tu-app.vercel.app/api/auth/callback/google`

## Paso 6: Migraciones de Base de Datos

Ejecuta las migraciones en tu base de datos:

```bash
# Localmente (si tienes acceso)
npx prisma migrate deploy

# O en Vercel usando el CLI
vercel env pull .env.local
npx prisma migrate deploy
```

## ✅ Listo!

Tu app debería estar funcionando en `https://tu-app.vercel.app`

Para más detalles, consulta `VERCEL_DEPLOYMENT.md`


