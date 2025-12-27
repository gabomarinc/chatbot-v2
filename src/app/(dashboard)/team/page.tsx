import { getTeamMembers, getUserWorkspace } from '@/lib/actions/dashboard';
import { getWorkspaceInfo, getUserWorkspaceRole } from '@/lib/actions/workspace';
import { TeamPageClient } from '@/components/team/TeamPageClient';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export default async function TeamPage() {
    const session = await auth();
    const workspace = await getUserWorkspace();
    if (!workspace) {
        return <div>Error: No workspace found</div>;
    }
    
    const [members, workspaceInfo, userRole] = await Promise.all([
        getTeamMembers(),
        getWorkspaceInfo(),
        getUserWorkspaceRole()
    ]);

    const maxMembers = workspaceInfo?.plan?.maxMembers || 1;

    // Get current plan name
    const subscription = await prisma.subscription.findFirst({
        where: { workspaceId: workspace.id },
        include: { plan: { select: { name: true } } }
    });
    
    const currentPlanName = subscription?.plan?.name || 'Sin Plan';

    return (
        <TeamPageClient 
            initialMembers={members} 
            currentMemberCount={members.length}
            maxMembers={maxMembers}
            currentUserId={session?.user?.id}
            currentPlanName={currentPlanName}
            userRole={userRole}
        />
    );
}
