import { prisma } from '@/lib/prisma';
import { getUserWorkspace } from '@/lib/actions/workspace';
import { PaymentSettingsClient } from '@/components/settings/PaymentSettingsClient';
import { getPaymentDashboardStats } from '@/lib/actions/payments';
import { redirect } from 'next/navigation';

export default async function PaymentSettingsPage() {
    const workspace = await getUserWorkspace();
    if (!workspace) redirect('/dashboard');

    const [configs, dashboardResult] = await Promise.all([
        prisma.paymentGatewayConfig.findMany({
            where: { workspaceId: workspace.id }
        }),
        getPaymentDashboardStats()
    ]);

    const dashboardStats = dashboardResult.success ? dashboardResult.stats : null;

    return (
        <div className="p-2 md:p-6">
            <PaymentSettingsClient existingConfigs={configs} dashboardStats={dashboardStats ?? null} />
        </div>
    );
}
