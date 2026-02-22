import { prisma } from '@/lib/prisma';
import { getUserWorkspace } from '@/lib/actions/workspace';
import { PaymentSettingsClient } from '@/components/settings/PaymentSettingsClient';
import { redirect } from 'next/navigation';

export default async function PaymentSettingsPage() {
    const workspace = await getUserWorkspace();
    if (!workspace) redirect('/dashboard');

    const configs = await prisma.paymentGatewayConfig.findMany({
        where: { workspaceId: workspace.id }
    });

    return (
        <div className="p-2 md:p-6">
            <PaymentSettingsClient existingConfigs={configs} />
        </div>
    );
}
