"use client"

import { LayoutDashboard, Bot, Users, Radio, MessageSquare, UserCircle, CreditCard, Settings, Gift, Sparkles, PieChart, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { getUserWorkspaceRole } from '@/lib/actions/workspace';
import { useSidebar } from '@/components/providers/SidebarProvider';

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [userRole, setUserRole] = useState<'OWNER' | 'MANAGER' | 'AGENT' | null>(null);
    const [showTourModal, setShowTourModal] = useState(false);
    const { isOpen, setIsOpen } = useSidebar();

    useEffect(() => {
        getUserWorkspaceRole().then(setUserRole);
    }, []);

    // Menu logic remains same
    const menuSections = [
        {
            title: 'VISIÓN GENERAL',
            items: [
                { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'blue' },
                { id: 'reports', href: '/reports', label: 'Reportes', icon: PieChart, color: 'cyan' },
            ]
        },
        {
            title: 'INSCRIPCIONES',
            items: [
                { id: 'agents', href: '/agents', label: 'Agentes', icon: Bot, color: 'purple' },
                { id: 'team', href: '/team', label: 'Equipo', icon: Users, color: 'green' },
                { id: 'channels', href: '/channels', label: 'Canales', icon: Radio, color: 'orange' },
                { id: 'payments', href: '/settings/payments', label: 'Pagos', icon: CreditCard, color: 'yellow', badge: 'Nuevo' },
            ]
        },
        {
            title: 'COMUNICACIÓN',
            items: [
                { id: 'chat', href: '/chat', label: 'Chats', icon: MessageSquare, color: 'indigo' },
                { id: 'contacts', href: '/contacts', label: 'Contactos', icon: Users, color: 'blue' },
                { id: 'prospects', href: '/prospects', label: 'Prospectos', icon: UserCircle, color: 'pink' },
            ]
        }
    ];

    const filteredMenuSections = userRole === 'AGENT'
        ? [
            {
                title: 'VISIÓN GENERAL',
                items: [
                    { id: 'dashboard', href: '/dashboard', label: 'Mi Panel', icon: LayoutDashboard, color: 'blue' },
                    { id: 'reports', href: '/reports', label: 'Mis Reportes', icon: PieChart, color: 'cyan' },
                ]
            },
            {
                title: 'COMUNICACIÓN',
                items: [
                    { id: 'chat', href: '/chat', label: 'Chats', icon: MessageSquare, color: 'indigo' },
                ]
            }
        ]
        : menuSections.map(section => ({
            ...section,
            items: section.items.map(item =>
                item.id === 'chat' ? { ...item, label: 'Chats' } : item
            )
        }));

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden transition-all duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Content */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 flex flex-col h-full shadow-[20px_0_30px_rgba(0,0,0,0.01)] lg:shadow-none transition-all duration-500 transform lg:translate-x-0 lg:static lg:inset-auto",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Logo & Close Button (Mobile) */}
                <div className="p-8 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#21AC96] to-[#1a8a78] rounded-2xl flex items-center justify-center shadow-lg shadow-[#21AC96]/20 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                            <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <div className="text-gray-900 font-bold text-xl tracking-tight group-hover:text-[#21AC96] transition-colors">Kônsul</div>
                            <div className="text-[10px] text-[#21AC96] font-bold uppercase tracking-widest bg-[#21AC96]/5 px-1.5 rounded-full inline-block animate-pulse">BETA v1.0</div>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Menu */}
                <nav className="flex-1 overflow-y-auto px-6 pb-4 scrollbar-hide">
                    {filteredMenuSections.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="mb-8">
                            <div className="text-[10px] text-gray-400 mb-4 px-2 tracking-[0.2em] font-bold uppercase opacity-60">
                                {section.title}
                            </div>
                            <div className="space-y-1">
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = pathname.startsWith(item.href);

                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            className={cn(
                                                "w-full group relative rounded-2xl transition-all duration-300 block",
                                                isActive
                                                    ? 'bg-gray-50 shadow-inner'
                                                    : 'hover:bg-gray-50/80 active:scale-95'
                                            )}
                                        >
                                            <div className="flex items-center gap-3.5 px-4 py-3">
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 bg-[#21AC96] text-white shadow-lg shadow-[#21AC96]/20 shrink-0">
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <span className={cn(
                                                    "text-sm font-semibold tracking-tight transition-colors flex-1",
                                                    isActive ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'
                                                )}>
                                                    {item.label}
                                                </span>
                                                {(item as any).badge && (
                                                    <span className={cn(
                                                        "bg-gradient-to-r from-[#21AC96] to-[#36d3bb] text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-sm tracking-tight",
                                                        isActive && "mr-5"
                                                    )}>
                                                        {(item as any).badge}
                                                    </span>
                                                )}
                                            </div>
                                            {isActive && (
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#21AC96] shadow-[0_0_10px_rgba(33,172,150,0.5)] animate-bounce"></div>
                                            )}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Super Admin Section */}
                    {session?.user?.role === 'SUPER_ADMIN' && (
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <div className="text-[10px] text-gray-400 mb-4 px-2 tracking-[0.2em] font-bold uppercase opacity-60">
                                SUPER ADMIN
                            </div>
                            <Link
                                href="/admin/dashboard"
                                className="w-full group relative rounded-2xl transition-all duration-300 block hover:bg-amber-50/80 active:scale-95"
                            >
                                <div className="flex items-center gap-3.5 px-4 py-3">
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
                                        <LayoutDashboard className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-semibold tracking-tight text-gray-500 group-hover:text-amber-600 transition-colors">
                                        Torre de Control
                                    </span>
                                </div>
                            </Link>
                        </div>
                    )}
                </nav>

                {/* Help Center Card */}
                {userRole !== 'AGENT' && (
                    <div className="px-6 pb-6 pt-2">
                        <div className="bg-gradient-to-br from-white to-[#F8FAFB] rounded-[2rem] p-4 border border-gray-100 shadow-xl shadow-gray-200/20 relative overflow-hidden group hover:shadow-2xl hover:shadow-[#21AC96]/10 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                            <div className="absolute -top-12 -right-12 w-20 h-20 bg-[#21AC96]/10 rounded-full blur-2xl group-hover:bg-[#21AC96]/20 transition-all duration-500"></div>

                            <div className="relative">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <div className="w-7 h-7 shrink-0 bg-white shadow-md rounded-lg flex items-center justify-center transform group-hover:-rotate-12 transition-all duration-300">
                                        <Sparkles className="w-3.5 h-3.5 text-[#21AC96]" />
                                    </div>
                                    <h3 className="text-[11px] font-bold text-gray-900 group-hover:text-[#21AC96] transition-colors">Centro de Ayuda</h3>
                                </div>

                                <button
                                    onClick={() => {
                                        if (pathname.includes('/agents/')) {
                                            window.dispatchEvent(new CustomEvent('trigger-agent-tour'));
                                        } else {
                                            setShowTourModal(true);
                                        }
                                        setIsOpen(false);
                                    }}
                                    className="w-full bg-[#21AC96] text-white rounded-xl py-2 text-[10px] font-bold hover:bg-[#1a8a78] transition-all duration-300 shadow-lg shadow-[#21AC96]/20 group-hover:shadow-[#21AC96]/40 cursor-pointer"
                                >
                                    Ver Tutorial
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tutorial Redirect Modal */}
                {showTourModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowTourModal(false)}></div>
                        <div className="bg-white rounded-[40px] w-full max-w-sm relative z-[101] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-[#21AC96]/10 rounded-3xl flex items-center justify-center text-[#21AC96] mx-auto mb-6">
                                    <Bot className="w-8 h-8" />
                                </div>
                                <h3 className="text-gray-900 font-black text-xl mb-3">Tutorial del Agente</h3>
                                <p className="text-gray-500 text-sm font-medium leading-relaxed mb-8">
                                    Para ver el tutorial interactivo, necesitas estar dentro del perfil de uno de tus agentes.
                                </p>
                                <div className="space-y-3">
                                    <Link
                                        href="/agents"
                                        onClick={() => setShowTourModal(false)}
                                        className="w-full bg-[#21AC96] text-white rounded-2xl py-4 font-bold hover:bg-[#1a8a78] transition-all flex items-center justify-center gap-2"
                                    >
                                        Ir a Agentes <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => setShowTourModal(false)}
                                        className="w-full bg-gray-50 text-gray-500 rounded-2xl py-4 font-bold hover:bg-gray-100 transition-all"
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
