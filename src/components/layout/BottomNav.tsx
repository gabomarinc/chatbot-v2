"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, Bot, Settings, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        {
            label: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard
        },
        {
            label: 'Chats',
            href: '/chat',
            icon: MessageSquare
        },
        {
            label: 'Agentes',
            href: '/agents',
            icon: Bot
        },
        {
            label: 'Prospectos',
            href: '/prospects',
            icon: Users
        },
        {
            label: 'Ajustes',
            href: '/admin/settings',
            icon: Settings
        }
    ];

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-2 pb-safe-offset-1">
            <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300",
                                isActive ? "text-[#21AC96]" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            <div className={cn(
                                "p-1 rounded-xl transition-all duration-300",
                                isActive ? "bg-[#21AC96]/10 scale-110" : ""
                            )}>
                                <Icon className={cn(
                                    "w-5 h-5 transition-transform",
                                    isActive ? "stroke-[2.5px]" : "stroke-[2px]"
                                )} />
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold tracking-tight transition-all",
                                isActive ? "opacity-100" : "opacity-70"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
