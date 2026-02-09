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



