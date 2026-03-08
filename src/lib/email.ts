import { Resend } from 'resend';

// Initialize Resend client (lazy initialization to avoid build-time errors)
let resendClient: Resend | null = null;

function getResendClient() {
    if (!resendClient) {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error('RESEND_API_KEY is not configured');
        }
        resendClient = new Resend(apiKey);
    }
    return resendClient;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export async function sendTeamInvitationEmail(
    email: string,
    workspaceName: string,
    inviterName: string,
    role: string,
    isNewUser: boolean
) {
    try {
        const resend = getResendClient();

        const roleLabel = role === 'OWNER' ? 'Propietario' :
            role === 'MANAGER' ? 'Administrador' : 'Agente';

        const subject = isNewUser
            ? `Has sido invitado a ${workspaceName}`
            : `Te han agregado a ${workspaceName}`;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #21AC96 0%, #1a8a78 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">¡Bienvenido al equipo!</h1>
                </div>
                
                <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        Hola,
                    </p>
                    
                    <p style="font-size: 16px; margin-bottom: 20px;">
                        <strong>${inviterName}</strong> te ha ${isNewUser ? 'invitado' : 'agregado'} a formar parte del workspace <strong>${workspaceName}</strong> con el rol de <strong>${roleLabel}</strong>.
                    </p>
                    
                    ${isNewUser ? `
                    <p style="font-size: 16px; margin-bottom: 30px;">
                        Para comenzar, necesitas crear una contraseña para tu cuenta. Haz click en el botón de abajo:
                    </p>
                    ` : `
                    <p style="font-size: 16px; margin-bottom: 30px;">
                        Ya puedes iniciar sesión con tu cuenta existente para acceder al workspace.
                    </p>
                    `}
                    
                    ${isNewUser ? `
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/login?email=${encodeURIComponent(email)}&action=set-password" 
                           style="display: inline-block; background: #21AC96; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                            Establecer Contraseña
                        </a>
                    </div>
                    ` : `
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${APP_URL}/login" 
                           style="display: inline-block; background: #21AC96; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                            Iniciar Sesión
                        </a>
                    </div>
                    `}
                    
                    <p style="font-size: 14px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                        Si tienes alguna pregunta, no dudes en contactar al administrador del workspace.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
                    <p>Este es un email automático, por favor no respondas a este mensaje.</p>
                </div>
            </body>
            </html>
        `;

        const textContent = `
¡Bienvenido al equipo!

${inviterName} te ha ${isNewUser ? 'invitado' : 'agregado'} a formar parte del workspace ${workspaceName} con el rol de ${roleLabel}.

${isNewUser ? `Para comenzar, necesitas crear una contraseña. Visita: ${APP_URL}/login?email=${encodeURIComponent(email)}&action=set-password` : `Ya puedes iniciar sesión en: ${APP_URL}/login`}
        `;

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject,
            html: htmlContent,
            text: textContent,
        });

        if (error) {
            console.error('Resend error:', error);
            throw error;
        }

        return { success: true, messageId: data?.id };
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

export async function sendHandoffEmail(
    adminEmail: string,
    agentName: string,
    workspaceName: string,
    conversationLink: string,
    visitorDetails: {
        name?: string;
        email?: string;
        phone?: string;
    },
    conversationSummary: string
) {
    try {
        const resend = getResendClient();

        const subject = `[${agentName}] Solicitud de Agente Humano`;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">Solicitud de Intervención</h1>
                    <p style="color: rgba(255,255,255,0.9); margin-top: 5px; font-size: 14px;">${workspaceName} • ${agentName}</p>
                </div>
                
                <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="font-size: 16px; margin-bottom: 25px;">
                        Hola,
                    </p>
                    
                    <p style="font-size: 16px; margin-bottom: 25px;">
                        El agente <strong>${agentName}</strong> ha escalado una conversación porque el usuario ha solicitado hablar con un humano.
                    </p>

                    <div style="background-color: #f9fafb; border-left: 4px solid #21AC96; padding: 20px; border-radius: 4px; margin-bottom: 30px;">
                        <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Detalles del Visitante</h3>
                        <ul style="margin: 0; padding: 0; list-style: none;">
                            <li style="margin-bottom: 8px;"><strong>Nombre:</strong> ${visitorDetails.name || 'No especificado'}</li>
                            <li style="margin-bottom: 8px;"><strong>Email:</strong> ${visitorDetails.email || 'No especificado'}</li>
                            <li style="margin-bottom: 8px;"><strong>Teléfono:</strong> ${visitorDetails.phone || 'No especificado'}</li>
                        </ul>
                        
                        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                            <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Resumen / Contexto</h3>
                            <p style="margin: 0; color: #4b5563; font-style: italic;">"${conversationSummary}"</p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${conversationLink}" 
                           style="display: inline-block; background: #21AC96; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(33, 172, 150, 0.3);">
                            Ir a la Conversación
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #6b7280; text-align: center;">
                        El bot ha sido pausado en esta conversación hasta que intervengas.
                    </p>
                </div>
            </body>
            </html>
        `;

        const textContent = `
Solicitud de Intervención - ${agentName}

El agente ha escalado una conversación.

Detalles del Visitante:
- Nombre: ${visitorDetails.name || 'No especificado'}
- Email: ${visitorDetails.email || 'No especificado'}
- Teléfono: ${visitorDetails.phone || 'No especificado'}

Contexto:
"${conversationSummary}"

Ir a la conversación: ${conversationLink}
        `;

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: adminEmail,
            subject,
            html: htmlContent,
            text: textContent,
        });

        if (error) {
            console.error('Resend error:', error);
            throw error;
        }

        return { success: true, messageId: data?.id };
    } catch (error) {
        console.error('Error sending handoff email:', error);
        // Don't throw, just return failure so chat doesn't crash
        return { success: false, error };
    }
}

export async function sendAssignmentEmail(
    email: string,
    agentName: string,
    workspaceName: string,
    userName: string,
    conversationLink: string,
    visitorDetails: {
        name: string;
        email: string;
        phone: string;
    },
    intentSummary: string
) {
    try {
        const resend = getResendClient();

        const subject = `📌 Chat Asignado: ${visitorDetails.name || 'Visitante'}`;

        const htmlContent = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="background: linear-gradient(135deg, #21AC96 0%, #1a8a78 100%); padding: 30px; color: white; text-align: center;">
                    <h2 style="margin: 0; font-size: 24px;">Nueva Asignación</h2>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">${workspaceName}</p>
                </div>
                <div style="padding: 30px; background: white;">
                    <p style="font-size: 16px; color: #333;">Hola <b>${userName}</b>,</p>
                    <p style="font-size: 16px; color: #555;">Se te ha asignado una conversación que requiere tu atención.</p>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 4px solid #21AC96;">
                        <h4 style="margin: 0 0 10px 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Resumen de Intención (IA)</h4>
                        <p style="margin: 0; font-size: 16px; color: #1e293b; line-height: 1.5;">"${intentSummary}"</p>
                    </div>

                    <div style="margin-bottom: 30px; background: #fff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px;">
                        <h4 style="margin: 0 0 15px 0; color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">Detalles del Contacto</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 5px 0; color: #64748b; font-size: 14px; width: 80px;">Nombre:</td>
                                <td style="padding: 5px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${visitorDetails.name}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #64748b; font-size: 14px;">Email:</td>
                                <td style="padding: 5px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${visitorDetails.email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #64748b; font-size: 14px;">Teléfono:</td>
                                <td style="padding: 5px 0; color: #1e293b; font-size: 14px; font-weight: 600;">${visitorDetails.phone}</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center;">
                        <a href="${conversationLink}" style="display: inline-block; background: #21AC96; color: white; padding: 16px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(33, 172, 150, 0.2);">
                            Abrir Conversación
                        </a>
                    </div>
                </div>
                <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f0f0f0;">
                    <p style="margin: 0; font-size: 12px; color: #94a3b8;">Este es un mensaje automático de la plataforma de Chatbot (${agentName}).</p>
                </div>
            </div>
        `;

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject,
            html: htmlContent,
        });

        if (error) {
            console.error('Resend error:', error);
            throw error;
        }

        return { success: true, messageId: data?.id };
    } catch (error) {
        console.error('Error sending assignment email:', error);
        return { success: false, error };
    }
}



export async function sendWelcomeEmail(
    email: string,
    userName: string
) {
    try {
        const resend = getResendClient();

        const subject = `¡Bienvenido a Kônsul, ${userName.split(' ')[0]}! 🚀`;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                <div style="background: linear-gradient(135deg, #21AC96 0%, #1a8a78 100%); padding: 40px; text-align: center; border-radius: 24px 24px 0 0;">
                    <img src="https://konsul.digital/icono-konsul.png" alt="Kônsul Logo" style="width: 64px; height: 64px; border-radius: 16px; margin-bottom: 20px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.025em;">¡Bienvenido a la familia!</h1>
                </div>
                
                <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 24px 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <p style="font-size: 18px; color: #111827; margin-bottom: 24px; font-weight: 600;">
                        Hola ${userName},
                    </p>
                    
                    <p style="font-size: 16px; color: #4b5563; margin-bottom: 24px;">
                        Es un gusto tenerte con nosotros. Has dado el primer paso para revolucionar la forma en que tu negocio interactúa con el mundo a través de la Inteligencia Artificial.
                    </p>

                    <div style="background-color: #f0fdfa; border-radius: 16px; padding: 24px; margin-bottom: 32px; border: 1px solid #ccfbf1;">
                        <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 900;">¿Qué puedes hacer ahora?</h3>
                        <ul style="margin: 0; padding: 0; list-style: none;">
                            <li style="margin-bottom: 12px; display: flex; align-items: flex-start; color: #374151; font-size: 15px;">
                                <span style="color: #21AC96; margin-right: 8px; font-weight: bold;">•</span>
                                <span>Crea tu primer <strong>Agente IA</strong> especializado.</span>
                            </li>
                            <li style="margin-bottom: 12px; display: flex; align-items: flex-start; color: #374151; font-size: 15px;">
                                <span style="color: #21AC96; margin-right: 8px; font-weight: bold;">•</span>
                                <span>Conecta tus canales: <strong>WhatsApp, Instagram y Web</strong>.</span>
                            </li>
                            <li style="margin-bottom: 0; display: flex; align-items: flex-start; color: #374151; font-size: 15px;">
                                <span style="color: #21AC96; margin-right: 8px; font-weight: bold;">•</span>
                                <span>Entrena a tu agente con tus propios documentos y enlaces.</span>
                            </li>
                        </ul>
                    </div>
                    
                    <div style="text-align: center; margin: 40px 0;">
                        <a href="${APP_URL}/dashboard" 
                           style="display: inline-block; background: #21AC96; color: white; padding: 18px 36px; text-decoration: none; border-radius: 14px; font-weight: 900; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(33, 172, 150, 0.3); transition: all 0.3s ease;">
                            Ir a mi Panel de Control
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #9ca3af; text-align: center; margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 24px;">
                        Si necesitas ayuda, simplemente responde a este correo. Estamos aquí para impulsarte.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 32px; color: #9ca3af; font-size: 12px;">
                    <p>© 2024 Kônsul. Todos los derechos reservados.</p>
                </div>
            </body>
            </html>
        `;

        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL,
            to: email,
            subject,
            html: htmlContent,
        });

        if (error) {
            console.error('Welcome email error:', error);
            return { success: false, error };
        }

        return { success: true, messageId: data?.id };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return { success: false, error };
    }
}
