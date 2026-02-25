import { getAgentsWithEmail } from "@/lib/actions/integrations";
import { InboxDashboardClient } from "@/components/inbox/InboxDashboardClient";
import { redirect } from "next/navigation";

export default async function InboxPage() {
    const agents = await getAgentsWithEmail();

    return (
        <div className="min-h-screen">
            <InboxDashboardClient initialAgents={agents as any} />
        </div>
    );
}
