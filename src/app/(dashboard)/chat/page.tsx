import { getConversations, getTeamMembers } from '@/lib/actions/dashboard';
import { getUserWorkspaceRole } from '@/lib/actions/workspace';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { auth } from '@/auth';

export default async function ChatPage({
    searchParams,
}: {
    searchParams: Promise<{ conversationId?: string }>;
}) {
    const params = await searchParams;
    const session = await auth();

    const [conversations, teamMembers, userRole] = await Promise.all([
        getConversations(),
        getTeamMembers(),
        getUserWorkspaceRole()
    ]);

    // Map database conversations to client interface
    const initialConversations = conversations.map(c => ({
        id: c.id,
        agent: c.agent,
        lastMessageAt: c.lastMessageAt,
        messages: c.messages,
        _count: c._count,
        contactName: c.contact?.name || c.contactName,
        externalId: c.externalId,
        status: c.status,
        channel: c.channel,
        contact: c.contact,
        assignedTo: c.assignedTo,
        assignedUser: c.assignedUser,
        isPaused: c.isPaused
    }));

    return (
        <ChatInterface
            initialConversations={initialConversations as any}
            initialConversationId={params.conversationId}
            teamMembers={teamMembers}
            currentUserId={session?.user?.id}
            userRole={userRole}
        />
    );
}
