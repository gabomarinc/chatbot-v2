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

