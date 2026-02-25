'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { getUserWorkspace } from './workspace';
import { encryptFields, decryptFields } from '@/lib/crypto';

const SENSITIVE_PAYMENT_FIELDS = ['cclw', 'apiKey', 'apiSecret', 'merchantId', 'secretKey'];

export async function getPaymentDashboardStats() {
    try {
        const workspace = await getUserWorkspace();
        if (!workspace) return { success: false, error: 'Workspace no encontrado' };

        const workspaceId = workspace.id;

        // All transactions for this workspace
        const transactions = await prisma.transaction.findMany({
            where: { workspaceId },
            orderBy: { createdAt: 'desc' },
            take: 200, // cap for performance
            select: {
                id: true,
                amount: true,
                status: true,
                gateway: true,
                paymentUrl: true,
                description: true,
                createdAt: true,
                contact: { select: { name: true, phone: true } }
            }
        });

        const totalLinks = transactions.length;
        const pending = transactions.filter(t => t.status === 'PENDING').length;
        const successful = transactions.filter(t => t.status === 'SUCCESS').length;
        const failed = transactions.filter(t => t.status === 'FAILED').length;
        const totalAmountGenerated = transactions.reduce((sum, t) => sum + t.amount, 0);
        const totalAmountCollected = transactions
            .filter(t => t.status === 'SUCCESS')
            .reduce((sum, t) => sum + t.amount, 0);

        // Gateway breakdown
        const pagueloFacilCount = transactions.filter(t => t.gateway === 'PAGUELOFACIL').length;
        const yappyCount = transactions.filter(t => t.gateway === 'YAPPY').length;

        // Last 7 days activity
        const last7Days: { date: string; count: number; amount: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayTx = transactions.filter(t => t.createdAt.toISOString().split('T')[0] === dateStr);
            last7Days.push({
                date: dateStr,
                count: dayTx.length,
                amount: dayTx.reduce((s, t) => s + t.amount, 0)
            });
        }

        // Recent transactions (last 10)
        const recentTransactions = transactions.slice(0, 10).map(t => ({
            id: t.id,
            amount: t.amount,
            status: t.status,
            gateway: t.gateway,
            description: t.description,
            contactName: t.contact?.name || t.contact?.phone || 'Sin nombre',
            createdAt: t.createdAt.toISOString(),
            paymentUrl: t.paymentUrl
        }));

        return {
            success: true,
            stats: {
                totalLinks,
                pending,
                successful,
                failed,
                totalAmountGenerated,
                totalAmountCollected,
                pagueloFacilCount,
                yappyCount,
                last7Days,
                recentTransactions
            }
        };
    } catch (error: any) {
        console.error('Error fetching payment dashboard stats:', error);
        return { success: false, error: error.message };
    }
}

export async function getPaymentConfigs() {
    try {
        const workspace = await getUserWorkspace();
        if (!workspace) return { success: false, error: 'Workspace no encontrado' };

        const configs = await prisma.paymentGatewayConfig.findMany({
            where: { workspaceId: workspace.id, isActive: true }
        });

        // Decrypt sensitive fields for the UI/Internal use
        const decryptedConfigs = configs.map(cfg => ({
            ...cfg,
            config: decryptFields(cfg.config as any, SENSITIVE_PAYMENT_FIELDS)
        }));

        return { success: true, configs: decryptedConfigs };
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
    gateway: 'PAGUELOFACIL' | 'YAPPY';
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
    gateway: 'PAGUELOFACIL' | 'YAPPY';
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

        // Decrypt config for use
        const config = decryptFields(configEntry.config as any, SENSITIVE_PAYMENT_FIELDS);
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
        } else if (gateway === 'YAPPY') {
            // Infrastructure ready for Yappy Comercial
            throw new Error('Yappy Comercial integration is ready for configuration. Please provide Merchant ID and Secret Key in Settings.');
        } else {
            throw new Error('Pasarela no soportada');
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

export async function savePaymentConfig(gateway: 'PAGUELOFACIL' | 'YAPPY', config: any) {
    try {
        const session = await auth();
        if (!session?.user?.id) throw new Error('No autorizado');

        const workspace = await getUserWorkspace();
        if (!workspace) throw new Error('Workspace no encontrado');

        // Encrypt sensitive fields before saving
        const encryptedConfig = encryptFields(config, SENSITIVE_PAYMENT_FIELDS);

        const updatedConfig = await prisma.paymentGatewayConfig.upsert({
            where: {
                workspaceId_gateway: {
                    workspaceId: workspace.id,
                    gateway
                }
            },
            update: {
                config: encryptedConfig,
                isActive: true,
                updatedAt: new Date()
            },
            create: {
                workspaceId: workspace.id,
                gateway,
                config: encryptedConfig,
                isActive: true
            }
        });

        revalidatePath('/settings');
        return { success: true, config: updatedConfig };
    } catch (error: any) {
        console.error('Error saving payment config:', error);
        return { success: false, error: error.message };
    }
}
