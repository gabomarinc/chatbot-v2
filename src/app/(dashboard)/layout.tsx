import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Providers } from "@/components/providers/SessionProvider";
import { SidebarProvider } from "@/components/providers/SidebarProvider";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Providers>
            <SidebarProvider>
                <div className="flex h-screen overflow-hidden relative">
                    <Sidebar />
                    <div className="flex-1 flex flex-col overflow-hidden w-full">
                        <Topbar />
                        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/50">
                            {children}
                        </main>
                    </div>
                </div>
            </SidebarProvider>
        </Providers>
    );
}
