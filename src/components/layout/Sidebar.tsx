"use client"

import { LayoutDashboard, Bot, Users, Radio, MessageSquare, UserCircle, Clock, CreditCard, Settings, Gift, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { getUserWorkspaceRole } from '@/lib/actions/workspace';

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [userRole, setUserRole] = useState<'OWNER' | 'MANAGER' | 'AGENT' | null>(null);

    useEffect(() => {
        getUserWorkspaceRole().then(setUserRole);
    }, []);

    const menuSections = [
        {
            title: 'VISIÓN GENERAL',
            items: [
                { id: 'dashboard', href: '/dashboard', label: 'Paneles', icon: LayoutDashboard, color: 'blue' },
            ]
        },
        {
            title: 'INSCRIPCIONES',
            items: [
                { id: 'agents', href: '/agents', label: 'Agentes', icon: Bot, color: 'purple' },
                { id: 'team', href: '/team', label: 'Equipo', icon: Users, color: 'green' },
                { id: 'channels', href: '/channels', label: 'Canales', icon: Radio, color: 'orange' },
            ]
        },
              {
                  title: 'COMUNICACIÓN',
                  items: [
                      { id: 'chat', href: '/chat', label: 'Chats', icon: MessageSquare, color: 'indigo' },
                      { id: 'prospects', href: '/prospects', label: 'Prospectos', icon: UserCircle, color: 'pink' },
                      { id: 'attentions', href: '/attentions', label: 'Atenciones', icon: Clock, color: 'cyan' },
                  ]
              }
    ];

    const getColorClasses = (color: string, isActive: boolean) => {
        const colors: { [key: string]: string } = {
            blue: isActive ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500',
            purple: isActive ? 'bg-purple-500 text-white' : 'bg-purple-50 text-purple-500',
            green: isActive ? 'bg-green-500 text-white' : 'bg-green-50 text-green-500',
            orange: isActive ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-500',
            indigo: isActive ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-500',
            pink: isActive ? 'bg-pink-500 text-white' : 'bg-pink-50 text-pink-500',
            cyan: isActive ? 'bg-cyan-500 text-white' : 'bg-cyan-50 text-cyan-500',
            emerald: isActive ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-500',
            gray: isActive ? 'bg-gray-500 text-white' : 'bg-gray-50 text-gray-500',
        };
        return colors[color] || 'bg-gray-50 text-gray-500';
    };

    // Filter menu sections based on user role
    const filteredMenuSections = userRole === 'AGENT' 
        ? [
            {
                title: 'VISIÓN GENERAL',
                items: [
                    { id: 'dashboard', href: '/dashboard', label: 'Mi Panel', icon: LayoutDashboard, color: 'blue' },
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
        <div className="w-72 bg-white border-r border-gray-100 flex flex-col h-full shadow-[20px_0_30px_rgba(0,0,0,0.01)] transition-all duration-500">
            {/* Logo */}
            <div className="p-8">
                <div className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#21AC96] to-[#1a8a78] rounded-2xl flex items-center justify-center shadow-lg shadow-[#21AC96]/20 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <Sparkles className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <div className="text-gray-900 font-bold text-xl tracking-tight group-hover:text-[#21AC96] transition-colors">Kônsul</div>
                        <div className="text-[10px] text-[#21AC96] font-bold uppercase tracking-widest bg-[#21AC96]/5 px-1.5 rounded-full inline-block animate-pulse">Pro AI</div>
                    </div>
                </div>
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
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 bg-[#21AC96] text-white shadow-lg shadow-[#21AC96]/20">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className={cn(
                                                "text-sm font-semibold tracking-tight transition-colors",
                                                isActive ? 'text-gray-900' : 'text-gray-500 group-hover:text-gray-900'
                                            )}>
                                                {item.label}
                                            </span>
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

            {/* Referral Card - Only for OWNER and MANAGER */}
            {userRole !== 'AGENT' && (
                <div className="p-6">
                    <div className="bg-gradient-to-br from-white to-[#F8FAFB] rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/20 relative overflow-hidden group hover:shadow-2xl hover:shadow-[#21AC96]/10 transition-all duration-500 cursor-pointer active:scale-[0.98]">
                        <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#21AC96]/10 rounded-full blur-2xl group-hover:bg-[#21AC96]/20 transition-all duration-500"></div>

                        <div className="relative">
                            <div className="w-10 h-10 bg-white shadow-md rounded-xl flex items-center justify-center mb-4 transform group-hover:-rotate-12 transition-all duration-300">
                                <Gift className="w-5 h-5 text-[#21AC96]" />
                            </div>

                            <div className="space-y-1 mb-4">
                                <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#21AC96] transition-colors">Programa VIP</h3>
                                <p className="text-xs text-gray-500 leading-relaxed">Invita a tus amigos y gana créditos ilimitados.</p>
                            </div>

                            <button className="w-full bg-[#21AC96] text-white rounded-2xl py-3 text-xs font-bold hover:bg-[#1a8a78] transition-all duration-300 shadow-lg shadow-[#21AC96]/20 group-hover:shadow-[#21AC96]/40 cursor-pointer">
                                Invitar ahora
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
