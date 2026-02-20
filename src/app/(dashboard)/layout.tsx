import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { Providers } from "@/components/providers/SessionProvider";
import { SidebarProvider } from "@/components/providers/SidebarProvider";
import { PushNotificationManager } from "@/components/notifications/PushNotificationManager";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Providers>
            <SidebarProvider>
                <div className="flex h-[100dvh] overflow-hidden relative">
                    <Sidebar />
                    <div className="flex-1 flex flex-col overflow-hidden w-full relative">
                        <Topbar />
                        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50 pb-24 md:pb-6 touch-pan-y">
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
