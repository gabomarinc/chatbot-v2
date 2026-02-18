# Kônsul Agentes de IA - Plataforma SaaS

Plataforma completa para crear, gestionar y desplegar agentes de IA conversacionales con integración a múltiples canales de comunicación.

## 🚀 Características

- **Gestión de Agentes**: Crea y configura agentes de IA con personalidad, estilo de comunicación y contexto de trabajo
- **Múltiples Canales**: Integración con WhatsApp, Instagram, Telegram y Webchat
- **Base de Conocimiento**: Entrenamiento con texto, sitios web, videos y documentos
- **Chat/Inbox**: Interfaz de 3 columnas para gestionar conversaciones con handoff a humanos
- **Billing y Créditos**: Sistema de suscripciones y gestión de créditos
- **Equipo**: Gestión de miembros del workspace con roles

## 🛠️ Stack Tecnológico

- **Framework**: Next.js 15 (App Router) con TypeScript
- **UI**: TailwindCSS + Shadcn UI
- **Base de Datos**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Autenticación**: NextAuth.js (Auth.js)
- **LLM**: OpenAI (Chat Completions API)
- **Deployment**: Vercel

## 📋 Prerrequisitos

- Node.js 18+ 
- PostgreSQL (recomendado Neon)
- Cuenta de OpenAI con API key
- (Opcional) Cuenta de WhatsApp Business API para integración de WhatsApp

## 🔧 Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd chatbot-v2-interno
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="tu-secret-key-aqui" # Genera uno con: openssl rand -base64 32

# OpenAI
OPENAI_API_KEY="sk-..."

# WhatsApp (opcional)
WHATSAPP_VERIFY_TOKEN="tu-verify-token"
WHATSAPP_ACCESS_TOKEN="tu-access-token"
WHATSAPP_PHONE_NUMBER_ID="tu-phone-number-id"
WHATSAPP_BUSINESS_ACCOUNT_ID="tu-business-account-id"
```

5. **Ejecutar en desarrollo**

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── webhooks/      # Webhooks (WhatsApp, etc.)
│   │   └── widget/        # Widget API para webchat
│   ├── agents/            # Páginas de agentes
│   ├── dashboard/         # Dashboard principal
│   ├── chat/              # Inbox de conversaciones
│   ├── billing/           # Facturación y créditos
│   └── ...
├── lib/                   # Utilidades y lógica de negocio
│   ├── llm.ts            # Generación de respuestas con OpenAI
│   ├── retrieval.ts      # Búsqueda en base de conocimiento
│   ├── channels/         # Helpers para canales
│   └── prisma.ts         # Cliente de Prisma
├── prisma/               # Schema y migraciones de Prisma
│   └── schema.prisma
└── src/                  # Componentes y páginas
    ├── components/       # Componentes React
    └── app/              # Páginas de la aplicación
```

## 🔐 Autenticación

La aplicación usa NextAuth.js con autenticación por email/password. Para crear un usuario inicial, puedes:

1. Usar Prisma Studio para crear un usuario manualmente
2. Crear un script de seed (ver `prisma/seed.ts` si existe)
3. Implementar un endpoint de registro

**Nota**: Asegúrate de hashear las contraseñas con bcrypt antes de guardarlas en la base de datos.

## 📱 Canales de Comunicación

### WhatsApp

1. Configura un canal en la interfaz con:
   - Phone Number ID
   - Business Account ID
   - Access Token
   - Verify Token

2. Configura el webhook en Meta:
   - URL: `https://tu-dominio.com/api/webhooks/whatsapp`
   - Verify Token: El mismo que configuraste en el canal

### Webchat

El widget está disponible en `/widget/[agentId]`. Para integrarlo en tu sitio:

```html
<iframe 
  src="https://tu-dominio.com/widget/[AGENT_ID]" 
  width="400" 
  height="600"
  frameborder="0"
></iframe>
```

## 🧠 LLM y Retrieval

- **LLM**: Usa OpenAI Chat Completions API para generar respuestas
- **Retrieval**: Búsqueda semántica en la base de conocimiento del agente
- **Embeddings**: Actualmente usa un stub. En producción, implementa con OpenAI Embeddings API

## 💳 Billing y Créditos

- Los créditos se deducen automáticamente al generar respuestas
- 1 crédito = 100 tokens (configurable)
- Los planes incluyen créditos mensuales
- Se pueden comprar créditos adicionales

## 🚢 Deployment

### Vercel

1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Vercel detectará automáticamente Next.js y desplegará

### Variables de entorno en producción

Asegúrate de configurar todas las variables de entorno en tu plataforma de deployment.

## 📝 Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build de producción
npm run start        # Iniciar servidor de producción
npm run lint         # Linter
```

## 🐛 Troubleshooting

### Error de conexión a la base de datos

- Verifica que `DATABASE_URL` esté correctamente configurado
- Asegúrate de que la base de datos esté accesible desde tu red

### Error de autenticación

- Verifica `NEXTAUTH_SECRET` y `NEXTAUTH_URL`
- Asegúrate de que las migraciones de Prisma se hayan ejecutado

### Error de OpenAI

- Verifica que `OPENAI_API_KEY` sea válida
- Revisa los límites de tu cuenta de OpenAI

## 📄 Licencia

Este proyecto es privado y propietario.

## 🤝 Soporte

Para soporte, contacta al equipo de desarrollo.
