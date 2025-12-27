# Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar el proyecto en Vercel.

## 📋 Prerrequisitos

1. Una cuenta en [Vercel](https://vercel.com)
2. Una cuenta en [GitHub](https://github.com)
3. El código subido al repositorio: `https://github.com/gabomarinc/chatbot-v2.git`

## 🚀 Pasos para Desplegar

### 1. Subir el código a GitHub

Si aún no has subido el código:

```bash
# Asegúrate de estar en la raíz del proyecto
cd /Users/ortizalfano/Downloads/chatbot-v2-interno-NO

# Inicializa git (si no está inicializado)
git init

# Agrega el remoto de GitHub
git remote add origin https://github.com/gabomarinc/chatbot-v2.git

# Agrega todos los archivos
git add .

# Haz commit
git commit -m "Initial commit: Preparado para Vercel"

# Sube al repositorio
git branch -M main
git push -u origin main
```

### 2. Conectar el repositorio con Vercel

1. Ve a [Vercel](https://vercel.com) e inicia sesión
2. Haz clic en "Add New..." → "Project"
3. Importa el repositorio `gabomarinc/chatbot-v2`
4. Vercel detectará automáticamente que es un proyecto Next.js

### 3. Configurar Variables de Entorno en Vercel

En la página de configuración del proyecto en Vercel, agrega las siguientes variables de entorno:

#### Variables Requeridas:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# NextAuth
NEXTAUTH_URL=https://tu-app.vercel.app
NEXTAUTH_SECRET=tu-secret-key-aqui

# OpenAI
OPENAI_API_KEY=sk-...

# (Opcional) Meta/WhatsApp
META_APP_ID=tu-meta-app-id
META_APP_SECRET=tu-meta-app-secret

# (Opcional) Google OAuth
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret

# (Opcional) AWS S3 para almacenamiento
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_REGION=tu-region
AWS_S3_BUCKET_NAME=tu-bucket-name
AWS_S3_ENDPOINT=tu-endpoint-si-usas-cloudflare-r2

# (Opcional) Para desarrollo/producción
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

**Nota:** Después de desplegar, actualiza `NEXTAUTH_URL` y `NEXT_PUBLIC_APP_URL` con la URL real que Vercel te asigne.

### 4. Configurar Build Settings

Vercel debería detectar automáticamente:
- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (automático)
- **Output Directory:** `.next` (automático)
- **Install Command:** `npm install` (automático)

Si necesitas configurarlo manualmente, usa estos valores.

### 5. Ejecutar Migraciones de Base de Datos

**Opción A: Usar Vercel Postgres (Recomendado)**

1. En el dashboard de Vercel, ve a "Storage"
2. Crea una base de datos Postgres
3. Copia la `DATABASE_URL` que te proporciona
4. Agrégala a las variables de entorno

Luego, en "Settings" → "Build & Development Settings", agrega un "Build Command" personalizado:

```bash
npx prisma migrate deploy && npm run build
```

**Opción B: Usar Neon o PostgreSQL externo**

1. Crea tu base de datos en [Neon](https://neon.tech) o tu proveedor
2. Ejecuta las migraciones localmente o en el primer deploy:
   ```bash
   npx prisma migrate deploy
   ```
3. Agrega la `DATABASE_URL` a las variables de entorno en Vercel

### 6. Configurar Post-build Script (Opcional)

Si necesitas ejecutar algo después del build, puedes agregar un script en `package.json`:

```json
"scripts": {
  "postbuild": "prisma generate"
}
```

### 7. Desplegar

1. Haz clic en "Deploy"
2. Vercel comenzará a construir y desplegar tu aplicación
3. Una vez completado, obtendrás una URL como: `https://tu-app.vercel.app`

### 8. Actualizar Configuraciones después del Deploy

Después de obtener tu URL de Vercel:

1. **Actualizar variables de entorno en Vercel:**
   - `NEXTAUTH_URL=https://tu-app.vercel.app`
   - `NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app`

2. **Actualizar Meta/Facebook (si usas WhatsApp):**
   - Ve a tu app en Meta Developers
   - En "URI de redireccionamiento de OAuth válidos", agrega:
     ```
     https://tu-app.vercel.app/channels/setup/whatsapp
     ```

3. **Actualizar Google OAuth (si lo usas):**
   - Ve a Google Cloud Console
   - En "Authorized redirect URIs", agrega:
     ```
     https://tu-app.vercel.app/api/auth/callback/google
     ```

4. **Hacer un nuevo deploy** para que los cambios de variables de entorno surtan efecto

### 9. Configurar Dominio Personalizado (Opcional)

1. En el dashboard de Vercel, ve a "Settings" → "Domains"
2. Agrega tu dominio personalizado
3. Configura los DNS según las instrucciones de Vercel

## 🔍 Verificación Post-Deploy

1. Visita `https://tu-app.vercel.app`
2. Verifica que la aplicación carga correctamente
3. Prueba el login/registro
4. Verifica que las funciones principales funcionan

## 🐛 Troubleshooting

### Error: "Prisma Client is not generated"
**Solución:** Agrega `prisma generate` al build command:
```bash
prisma generate && npm run build
```

### Error: "Database connection failed"
**Solución:** 
- Verifica que `DATABASE_URL` está correctamente configurada en Vercel
- Asegúrate de que la base de datos permite conexiones desde las IPs de Vercel
- Para Neon, verifica que tu proyecto permite conexiones externas

### Error: "NEXTAUTH_URL is not set"
**Solución:** Asegúrate de configurar `NEXTAUTH_URL` con tu URL de Vercel

### Build falla
**Solución:** 
- Revisa los logs de build en Vercel
- Asegúrate de que todas las dependencias están en `package.json`
- Verifica que no hay errores de TypeScript

## 📝 Notas Importantes

- Vercel ejecuta automáticamente `npm install` y `npm run build`
- Las variables de entorno están disponibles tanto en build time como en runtime
- Los cambios en variables de entorno requieren un nuevo deploy
- Vercel usa Node.js 18.x por defecto (compatible con tu proyecto)

## 🔄 Actualizaciones Futuras

Cada vez que hagas `git push` a la rama `main`, Vercel desplegará automáticamente una nueva versión (si tienes auto-deploy habilitado).

Para deploy manual:
1. Ve al dashboard de Vercel
2. Selecciona tu proyecto
3. Haz clic en "Deployments"
4. Haz clic en "Redeploy" en el deployment que quieras


