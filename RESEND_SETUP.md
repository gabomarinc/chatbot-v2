# Configuración de Resend para Invitaciones de Equipo

## Pasos para configurar Resend

### 1. Crear cuenta en Resend
1. Ve a [https://resend.com](https://resend.com)
2. Crea una cuenta (es gratis)
3. Verifica tu email

### 2. Obtener API Key
1. Una vez dentro del dashboard de Resend, ve a **"API Keys"** en el menú lateral
2. Haz clic en **"Create API Key"**
3. Dale un nombre (ej: "Chatbot Production" o "Chatbot Development")
4. Selecciona el permiso **"Sending access"**
5. Haz clic en **"Add"**
6. **IMPORTANTE**: Copia la API key inmediatamente (empieza con `re_...`) porque solo se muestra una vez

### 3. Configurar Dominio (Opcional para producción)
Para producción, deberías verificar tu dominio:
1. Ve a **"Domains"** en el menú lateral
2. Haz clic en **"Add Domain"**
3. Ingresa tu dominio (ej: `tu-app.com`)
4. Sigue las instrucciones para agregar los registros DNS que Resend te proporciona
5. Una vez verificado, podrás usar emails como `noreply@tu-app.com`

### 4. Agregar Variables de Entorno

Agrega estas variables en tu `.env.local` (local) y en Vercel (producción):

```env
# Resend Configuration
RESEND_API_KEY=re_tu_api_key_aqui
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Para desarrollo/testing:**
- `RESEND_FROM_EMAIL=onboarding@resend.dev` (ya está configurado, no requiere verificación)

**Para producción:**
- `RESEND_FROM_EMAIL=noreply@tu-dominio-verificado.com` (usar tu dominio verificado)

**También necesitas:**
- `NEXTAUTH_URL=https://tu-dominio.com` (o `http://localhost:3000` para desarrollo)

### 5. Límites del Plan Gratis
- **100 emails por día**
- Perfecto para empezar y probar
- Para producción con más volumen, considera el plan Pro

## Notas Importantes

1. **No compartas tu API Key**: Mantén la API key segura y no la subas a GitHub
2. **Email de prueba**: Puedes usar `onboarding@resend.dev` para desarrollo sin verificar dominio
3. **Diseño de emails**: Los emails de invitación están diseñados con HTML responsive
4. **Links de activación**: Los nuevos usuarios recibirán un link para establecer su contraseña

## Estructura del Email de Invitación

Cuando un administrador invita a un colaborador:
- **Usuario nuevo**: Recibe email con link para establecer contraseña
- **Usuario existente**: Recibe email informando que fue agregado al workspace

El email incluye:
- Nombre del workspace
- Nombre del administrador que invitó
- Rol asignado (Propietario, Administrador, Agente)
- Botón para iniciar sesión o establecer contraseña


