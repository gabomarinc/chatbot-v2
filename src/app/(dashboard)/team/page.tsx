import { getTeamMembers } from '@/lib/actions/dashboard';
import { getWorkspaceInfo } from '@/lib/actions/workspace';
import { TeamPageClient } from '@/components/team/TeamPageClient';

export default async function TeamPage() {
    const [members, workspaceInfo] = await Promise.all([
        getTeamMembers(),
        getWorkspaceInfo()
    ]);

    const maxMembers = workspaceInfo?.plan?.maxMembers || 1;

    return (
        <TeamPageClient 
            initialMembers={members} 
            currentMemberCount={members.length}
            maxMembers={maxMembers}
        />
    );
}
