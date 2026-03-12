'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { redirect } from 'next/navigation';
import { getUserWorkspace } from './workspace';

// Verify SUPER_ADMIN access
async function verifySuperAdmin() {
    const session = await auth();
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
        redirect('/dashboard');
    }
    return session;
}

// Get billing statistics
export async function getBillingStats() {
    await verifySuperAdmin();

    const [subscriptions, workspaces] = await Promise.all([
        prisma.subscription.findMany({
            include: {
                plan: true,
                workspace: true,
            },
        }),
        prisma.workspace.findMany({
            include: {
                subscription: {
                    include: {
                        plan: true,
                    },
                },
                creditBalance: true,
            },
        }),
    ]);

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = subscriptions
        .filter(sub => sub.status === 'active')
        .reduce((acc, sub) => acc + sub.plan.monthlyPrice, 0);

    // Calculate total revenue (for now, just MRR * number of active months)
    // TODO: Replace with actual payment tracking once Stripe is integrated
    const totalRevenue = mrr;

    // Calculate costs (estimated based on credits used)
    // Use queryRaw to bypass PrismaClientValidationError
    const usageLogs: any[] = await prisma.$queryRaw`
        SELECT "tokensUsed", "model", "creditsUsed" FROM "UsageLog"
    `;

    // Use the billing utility for more accurate cost estimation
    const estimatedCosts = usageLogs.reduce((acc, log) => {
        const modelKey = log.model.toLowerCase().includes('gemini') ? 'gemini-1.5-flash' :
            log.model.toLowerCase().includes('gpt-4o-mini') ? 'gpt-4o-mini' : 'default';

        // Prices per million tokens
        const prices: Record<string, number> = {
            'gpt-4o-mini': 0.15, // Costo real aproximado entrada/salida
            'gemini-1.5-flash': 0.075,
            'default': 0.10
        };

        const cost = (log.tokensUsed / 1000000) * (prices[modelKey] || 0.10);
        return acc + cost;
    }, 0);

    const totalCreditsUsed = usageLogs.reduce((acc, log) => acc + log.creditsUsed, 0);

    // Calculate profit
    const profit = totalRevenue - estimatedCosts;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return {
        mrr,
        totalRevenue,
        estimatedCosts,
        profit,
        profitMargin,
        totalCreditsUsed,
        activeSubscriptions: subscriptions.filter(sub => sub.status === 'active').length,
        totalSubscriptions: subscriptions.length,
    };
}

// Get revenue breakdown by plan
export async function getRevenueByPlan() {
    await verifySuperAdmin();

    const subscriptions = await prisma.subscription.findMany({
        where: {
            status: 'active',
        },
        include: {
            plan: true,
        },
    });

    const revenueByPlan = subscriptions.reduce((acc: Record<string, { count: number; revenue: number }>, sub) => {
        const planName = sub.plan.name;
        if (!acc[planName]) {
            acc[planName] = { count: 0, revenue: 0 };
        }
        acc[planName].count += 1;
        acc[planName].revenue += sub.plan.monthlyPrice;
        return acc;
    }, {});

    return Object.entries(revenueByPlan).map(([name, data]) => ({
        name,
        count: data.count,
        revenue: data.revenue,
    }));
}

// Get recent payments
export async function getRecentPayments(limit = 10) {
    await verifySuperAdmin();

    // TODO: Implement once Stripe integration is complete
    // For now, return empty array
    return [];
}

export async function getCostsByModel() {
    await verifySuperAdmin();

    const usageLogs: any[] = await prisma.$queryRaw`
        SELECT "model", "creditsUsed", "tokensUsed" FROM "UsageLog"
    `;

    const costsByModel = usageLogs.reduce((acc: Record<string, { credits: number; cost: number }>, log) => {
        if (!acc[log.model]) {
            acc[log.model] = { credits: 0, cost: 0 };
        }
        acc[log.model].credits += log.creditsUsed;

        // Estimated costs per model based on tokens
        const modelKey = log.model.toLowerCase().includes('gemini') ? 'gemini-1.5-flash' :
            log.model.toLowerCase().includes('gpt-4o-mini') ? 'gpt-4o-mini' : 'default';

        const prices: Record<string, number> = {
            'gpt-4o-mini': 0.15,
            'gemini-1.5-flash': 0.075,
            'default': 0.10
        };

        const cost = (log.tokensUsed / 1000000) * (prices[modelKey] || 0.10);
        acc[log.model].cost += cost;
        return acc;
    }, {});

    return Object.entries(costsByModel).map(([model, data]) => ({
        model,
        credits: data.credits,
        cost: data.cost,
    }));
}

export async function getCostsByChannel() {
    await verifySuperAdmin();

    // Use queryRaw to bypass PrismaClientValidationError while client syncs
    const usageLogs: any[] = await prisma.$queryRaw`
        SELECT "tokensUsed", "model", "channelId" 
        FROM "UsageLog" 
        WHERE "channelId" IS NOT NULL
    `;

    // We need to fetch channel types to group them
    const channels = await prisma.channel.findMany({
        select: { id: true, type: true }
    });

    const channelMap = new Map(channels.map(c => [c.id, c.type]));

    const costsByChannelType = usageLogs.reduce((acc: Record<string, { cost: number; messages: number }>, log) => {
        const channelType = channelMap.get((log as any).channelId!) || 'UNKNOWN';

        if (!acc[channelType]) {
            acc[channelType] = { cost: 0, messages: 0 };
        }

        const modelKey = log.model.toLowerCase().includes('gemini') ? 'gemini-1.5-flash' :
            log.model.toLowerCase().includes('gpt-4o-mini') ? 'gpt-4o-mini' : 'default';

        const prices: Record<string, number> = {
            'gpt-4o-mini': 0.15,
            'gemini-1.5-flash': 0.075,
            'default': 0.10
        };

        const cost = (log.tokensUsed / 1000000) * (prices[modelKey] || 0.10);
        acc[channelType].cost += cost;
        acc[channelType].messages += 1;

        return acc;
    }, {});

    return Object.entries(costsByChannelType).map(([type, data]) => ({
        type,
        cost: data.cost,
        messages: data.messages
    }));
}

// Get all subscription plans
export async function getSubscriptionPlans() {
    await verifySuperAdmin();

    const plans = await prisma.subscriptionPlan.findMany({
        orderBy: {
            monthlyPrice: 'asc',
        },
    });

    return plans;
}

// Update subscription plan
export async function updateSubscriptionPlan(
    planId: string,
    data: {
        name?: string;
        monthlyPrice?: number;
        creditsPerMonth?: number;
        maxAgents?: number;
        isActive?: boolean;
    }
) {
    await verifySuperAdmin();

    const plan = await prisma.subscriptionPlan.update({
        where: { id: planId },
        data,
    });

    return { success: true, plan };
}

// Create Stripe Customer Portal session
export async function createCustomerPortal() {
    const session = await auth();
    if (!session?.user?.id) throw new Error('No autorizado');

    const workspace = await getUserWorkspace();
    if (!workspace) throw new Error('Workspace no encontrado');

    const subscription = await prisma.subscription.findUnique({
        where: { workspaceId: workspace.id }
    });

    if (!subscription?.stripeCustomerId) {
        throw new Error('No se encontró configuración de Stripe para este workspace');
    }

    const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${process.env.NEXTAUTH_URL}/billing`,
    });

    return { url: portalSession.url };
}
