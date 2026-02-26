import { getWorkspaceIntegration } from "@/lib/actions/integrations";
import { InboxDashboardClient } from "@/components/inbox/InboxDashboardClient";

export default async function InboxPage() {
    const integration = await getWorkspaceIntegration('EMAIL_IMAP');

    return (
        <div className="min-h-screen">
            <InboxDashboardClient initialIntegration={integration} />
        </div>
    );
}
