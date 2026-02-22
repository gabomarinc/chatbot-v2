'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getUserWorkspace } from './workspace';

export async function getPaymentConfigs() {
    try {
        const workspace = await getUserWorkspace();
        if (!workspace) return { success: false, error: 'Workspace no encontrado' };

        const configs = await prisma.paymentGatewayConfig.findMany({
            where: { workspaceId: workspace.id, isActive: true }
        });

        return { success: true, configs };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Encodes a string to Hexadecimal (needed for PagueloFacil)
 */
function toHex(str: string): string {
    let result = '';
    for (let i = 0; i < str.length; i++) {
        result += str.charCodeAt(i).toString(16).toUpperCase();
    }
    return result;
}

export async function createPaymentLink(data: {
    contactId: string;
    amount: number;
    description: string;
    gateway: 'PAGUELOFACIL' | 'CUANTO' | 'STRIPE';
}) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error('No autorizado');

        const workspace = await getUserWorkspace();
        if (!workspace) throw new Error('Workspace no encontrado');

        return await createPaymentLinkInternal({ ...data, workspaceId: workspace.id });
    } catch (error: any) {
        console.error('Error in createPaymentLink:', error);
        return { success: false, error: error.message };
    }
}

export async function createPaymentLinkInternal({
    contactId,
    workspaceId,
    amount,
    description,
    gateway
}: {
    contactId: string;
    workspaceId: string;
    amount: number;
    description: string;
    gateway: 'PAGUELOFACIL' | 'CUANTO' | 'STRIPE';
}) {
    try {
        // 1. Get gateway config
        const configEntry = await prisma.paymentGatewayConfig.findUnique({
            where: {
                workspaceId_gateway: {
                    workspaceId,
                    gateway
                }
            }
        });

        if (!configEntry || !configEntry.isActive) {
            throw new Error(`La pasarela ${gateway} no está configurada o activa.`);
        }

        const config = configEntry.config as any;
        let paymentUrl = '';
        let gatewayReference = '';

        if (gateway === 'PAGUELOFACIL') {
            const isSandbox = config.isSandbox || false;
            const endpoint = isSandbox
                ? 'https://sandbox.paguelofacil.com/LinkDeamon.cfm'
                : 'https://secure.paguelofacil.com/LinkDeamon.cfm';

            const params = new URLSearchParams();
            params.append('CCLW', config.cclw);
            params.append('CMTN', amount.toFixed(2));
            params.append('CDSC', description);

            // Optional: Add metadata
            const metadata = JSON.stringify({ contactId, workspaceId });
            params.append('PF_CF', toHex(metadata));

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString()
            });

            const result = await response.json();

            if (result.success && result.data?.url) {
                paymentUrl = result.data.url;
                gatewayReference = result.data.code;
            } else {
                throw new Error(result.headerStatus?.description || 'Error al generar link en PagueloFacil');
            }
        } else if (gateway === 'CUANTO') {
            throw new Error('Cuanto integration coming soon');
        } else {
            throw new Error('Stripe integration coming soon');
        }

        // 2. Save transaction
        const transaction = await prisma.transaction.create({
            data: {
                contactId,
                workspaceId,
                amount,
                description,
                gateway,
                gatewayReference,
                paymentUrl,
                status: 'PENDING'
            }
        });

        // 3. Log in Contact Activity Timeline
        await prisma.contactActivity.create({
            data: {
                contactId,
                type: 'SYSTEM',
                content: `Link de pago generado (${gateway}). Monto: $${amount}. Ref: ${gatewayReference || 'N/A'}`,
                metadata: { transactionId: transaction.id, paymentUrl } as any
            }
        });

        revalidatePath('/contacts');
        return { success: true, transaction };
    } catch (error: any) {
        console.error('Error in createPaymentLinkInternal:', error);
        return { success: false, error: error.message };
    }
}
