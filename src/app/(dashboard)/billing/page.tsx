import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import BillingClient from './BillingClient';
import { canViewBilling } from '@/lib/actions/team';

export default async function BillingPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login');
    }

    // Check permissions (only OWNER can view billing)
    const canView = await canViewBilling();
    if (!canView) {
        redirect('/dashboard');
    }

    // Get user's workspace with subscription and credit balance
    const workspace = await prisma.workspace.findFirst({
        where: {
            members: {
                some: {
                    userId: session.user.id,
                },
            },
        },
        include: {
            subscription: {
                include: {
                    plan: true,
                },
            },
            creditBalance: true,
            agents: true,
        },
    });

    if (!workspace) {
        redirect('/dashboard');
    }

    const subscription = workspace.subscription;
    const plan = subscription?.plan;
    const creditBalance = workspace.creditBalance;

    // Calculate usage percentage
    const creditsUsed = creditBalance?.totalUsed || 0;
    const creditsPerMonth = plan?.creditsPerMonth || 5000;
    const usagePercentage = Math.min((creditsUsed / creditsPerMonth) * 100, 100);
    const creditsRemaining = Math.max(creditBalance?.balance || 0, 0);

    return (
        <BillingClient
            planName={plan?.name || 'Sin Plan'}
            planPrice={plan?.monthlyPrice || 0}
            maxAgents={plan?.maxAgents || 0}
            creditsPerMonth={creditsPerMonth}
            creditsRemaining={creditsRemaining}
            creditsUsed={creditsUsed}
            usagePercentage={usagePercentage}
            currentPeriodEnd={subscription?.currentPeriodEnd || new Date()}
            isActive={subscription?.status === 'active'}
        />
    );
}
