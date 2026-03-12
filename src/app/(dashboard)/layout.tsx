import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Providers } from "@/components/providers/SessionProvider";
import { SidebarProvider } from "@/components/providers/SidebarProvider";
import { PushNotificationManager } from "@/components/notifications/PushNotificationManager";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SubscriptionGuard } from "@/components/billing/SubscriptionGuard";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");

    // Fetch workspace and subscription
    const workspace = await prisma.workspace.findFirst({
        where: { 
            OR: [
                { ownerId: session.user.id },
                { members: { some: { userId: session.user.id } } }
            ]
        },
        include: { subscription: true }
    });

    // Whitelist for internal/test accounts
    const whitelist = [
        'altaplaza@konsul.cloud',
        'omar@konsul.digital',
        'omar@konsul.cloud',
        'demos@konsul.cloud',
        'somos@konsul.digital'
    ];

    const userEmail = session.user.email?.toLowerCase();
    const isWhitelisted = userEmail && whitelist.includes(userEmail);
    const isSuperAdmin = session.user.role === 'SUPER_ADMIN';

    // Allow active, trialing and past_due (grace period)
    const allowedStatuses = ['active', 'trialing', 'past_due'];
    const isInactive = !isWhitelisted && !isSuperAdmin && (!workspace?.subscription || !allowedStatuses.includes(workspace.subscription.status));

    return (
        <Providers>
            <SidebarProvider>
                <div className="flex h-[100dvh] overflow-hidden relative">
                    <Sidebar />
                    <div className="flex-1 flex flex-col overflow-hidden w-full relative">
                        <Topbar />
                        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50 pb-24 md:pb-6 touch-pan-y">
                            {/* Guard to handle redirection based on pathname */}
                            {isInactive && <SubscriptionGuard />}
                            {children}
                        </main>
                        <BottomNav />
                        <PushNotificationManager />
                    </div>
                </div>
            </SidebarProvider>
        </Providers>
    );
}
