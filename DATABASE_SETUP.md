# 📊 Configuración de Base de Datos

Esta guía te ayudará a obtener tu `DATABASE_URL` para conectar tu aplicación a PostgreSQL.

## 🆓 Opción 1: Neon (Recomendado - Gratis)

Neon es una plataforma de PostgreSQL serverless que ofrece un tier gratuito generoso.

### Pasos:

1. **Crear cuenta:**
   - Ve a https://neon.tech
   - Haz clic en "Sign Up" y crea una cuenta (puedes usar GitHub, Google, etc.)

2. **Crear un proyecto:**
   - Una vez dentro, haz clic en "Create Project"
   - Elige un nombre para tu proyecto (ej: "konsul-chatbot")
   - Selecciona la región más cercana a ti
   - Haz clic en "Create Project"

3. **Obtener la connection string:**
   - En el dashboard de tu proyecto, verás una sección "Connection Details"
   - Busca el campo que dice "Connection string" o "Postgres connection string"
   - Copia la URL completa, debería verse así:
     ```
     postgresql://usuario:password@host.neon.tech/database?sslmode=require
     ```
   - ⚠️ **Importante:** Asegúrate de que incluya `?sslmode=require` al final

4. **Usar la connection string:**
   - Esta es tu `DATABASE_URL`
   - Cópiala y úsala en Vercel como variable de entorno

### Ventajas de Neon:
- ✅ Tier gratuito generoso (0.5 GB de almacenamiento)
- ✅ No requiere configuración de servidor
- ✅ Automático backups
- ✅ Escala automáticamente
- ✅ Compatible con Vercel

---

## 💰 Opción 2: Supabase (Gratis)

Supabase es otra plataforma popular que ofrece PostgreSQL gratis.

### Pasos:

1. **Crear cuenta:**
   - Ve a https://supabase.com
   - Haz clic en "Start your project"
   - Crea una cuenta

2. **Crear un proyecto:**
   - Haz clic en "New Project"
   - Elige un nombre y contraseña para la base de datos
   - Selecciona una región
   - Espera a que se cree (tarda unos minutos)

3. **Obtener la connection string:**
   - Ve a "Settings" → "Database"
   - Busca "Connection string" o "Connection pooling"
   - Copia la URI, debería verse así:
     ```
     postgresql://postgres:[TU-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
     ```
   - Reemplaza `[TU-PASSWORD]` con la contraseña que elegiste al crear el proyecto
   - Añade `?sslmode=require` si no está incluido

---

## 🐘 Opción 3: Vercel Postgres (Integrado con Vercel)

Si desplegas en Vercel, puedes usar su base de datos integrada.

### Pasos:

1. **En Vercel:**
   - Ve a tu proyecto en Vercel
   - Click en "Storage" en el menú lateral
   - Haz clic en "Create Database"
   - Selecciona "Postgres"
   - Elige un nombre para tu base de datos

2. **Obtener la connection string:**
   - Una vez creada, Vercel te mostrará automáticamente la `DATABASE_URL`
   - Se agregará automáticamente como variable de entorno
   - No necesitas copiarla manualmente, Vercel la configura por ti

### Ventajas de Vercel Postgres:
- ✅ Integración perfecta con Vercel
- ✅ No necesitas configurar nada manualmente
- ✅ Variables de entorno se configuran automáticamente

---

## 🖥️ Opción 4: PostgreSQL Local (Solo para desarrollo)

Solo recomendado si ya tienes PostgreSQL instalado localmente.

### Connection string:
```
postgresql://usuario:password@localhost:5432/nombre_base_datos
```

**Nota:** Esto NO funcionará en Vercel porque Vercel no tiene acceso a tu computadora local.

---

## 📝 Formato de DATABASE_URL

Todas las connection strings deben tener este formato:

```
postgresql://[usuario]:[password]@[host]:[puerto]/[database]?sslmode=require
```

Ejemplo real:
```
postgresql://user:abc123xyz@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Partes importantes:
- `postgresql://` - Protocolo
- `usuario:password` - Credenciales
- `@host:puerto` - Servidor de base de datos
- `/database` - Nombre de la base de datos
- `?sslmode=require` - Requiere conexión SSL (importante para seguridad)

---

## ⚠️ Importante para Vercel

Cuando uses una base de datos externa (Neon, Supabase, etc.) en Vercel:

1. **Asegúrate de que la base de datos permita conexiones externas** (Neon y Supabase lo hacen por defecto)

2. **No incluyas la contraseña directamente en el código** - Siempre usa variables de entorno

3. **Usa connection pooling si es posible** - Algunas plataformas ofrecen esto para mejor rendimiento

---

## 🔍 Verificar que funciona

Una vez que tengas tu `DATABASE_URL`, puedes verificar la conexión:

```bash
# En tu proyecto local, crea un archivo .env.local con tu DATABASE_URL
# Luego ejecuta:
npx prisma db pull

# Si funciona, verás información de tu base de datos
```

---

## 💡 Recomendación

Para producción en Vercel, recomiendo:

1. **Desarrollo local:** Neon (gratis, fácil de usar)
2. **Producción en Vercel:** Vercel Postgres (si quieres todo integrado) o Neon (si ya lo estás usando)

¿Necesitas ayuda con alguna opción específica?

