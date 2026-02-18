"use client";

import { Search, Bell, ChevronDown, Coins, LogOut, User, Settings, CreditCard, Sparkles, Menu } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getDashboardStats, getCreditsDetails, getNotifications, getNotificationCount } from '@/lib/actions/dashboard';
import { CreditsDetailsModal } from '@/components/dashboard/CreditsDetailsModal';
import { NotificationsDropdown } from './NotificationsDropdown';
import { SearchDropdown } from './SearchDropdown';
import { WorkspaceDropdown } from './WorkspaceDropdown';
import { globalSearch } from '@/lib/actions/search';
import { getWorkspaceInfo, getUserWorkspaceRole } from '@/lib/actions/workspace';
import { useSidebar } from '@/components/providers/SidebarProvider';

export function Topbar() {
    const { data: session } = useSession();
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [credits, setCredits] = useState<number | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { setIsOpen } = useSidebar();

    // Credits modal state
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
    const [creditsData, setCreditsData] = useState<any>(null);
    const [isLoadingCredits, setIsLoadingCredits] = useState(false);

    // Notifications state
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationCount, setNotificationCount] = useState(0);
    const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
    const notificationsRef = useRef<HTMLDivElement>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{
        agents: any[];
        conversations: any[];
        prospects: any[];
        team: any[];
    }>({ agents: [], conversations: [], prospects: [], team: [] });
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Workspace dropdown state
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [workspaceInfo, setWorkspaceInfo] = useState<any>(null);
    const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false);
    const workspaceRef = useRef<HTMLDivElement>(null);

    // User role state
    const [userRole, setUserRole] = useState<'OWNER' | 'MANAGER' | 'AGENT' | null>(null);

    // Always show "Mi Cuenta" instead of waiting for user name
    const displayText = 'Mi Cuenta';
    const currentDate = format(new Date(), 'dd MMM yyyy', { locale: es });

    useEffect(() => {
        const fetchCredits = async () => {
            const stats = await getDashboardStats();
            setCredits(stats.creditos);
        };
        fetchCredits();
        getUserWorkspaceRole().then(setUserRole);
    }, []);

    useEffect(() => {
        const fetchNotificationCount = async () => {
            try {
                const count = await getNotificationCount();
                setNotificationCount(count);
            } catch (error) {
                console.error('Error loading notification count:', error);
            }
        };
        fetchNotificationCount();
        const interval = setInterval(fetchNotificationCount, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (isNotificationsOpen) {
                setIsLoadingNotifications(true);
                try {
                    const notifs = await getNotifications();
                    setNotifications(notifs);
                    setNotificationCount(notifs.length);
                } catch (error) {
                    console.error('Error loading notifications:', error);
                    setNotifications([]);
                } finally {
                    setIsLoadingNotifications(false);
                }
            }
        };
        fetchNotifications();
    }, [isNotificationsOpen]);

    // Search functionality with debounce
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim().length >= 2) {
            setIsSearching(true);
            setIsSearchOpen(true);

            searchTimeoutRef.current = setTimeout(async () => {
                try {
                    const results = await globalSearch(searchQuery);
                    setSearchResults(results);
                } catch (error) {
                    console.error('Error searching:', error);
                    setSearchResults({ agents: [], conversations: [], prospects: [], team: [] });
                } finally {
                    setIsSearching(false);
                }
            }, 300);
        } else {
            setIsSearchOpen(false);
            setSearchResults({ agents: [], conversations: [], prospects: [], team: [] });
            setIsSearching(false);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsSearchOpen(false);
            }
            if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
                setIsWorkspaceOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchWorkspaceInfo = async () => {
            if (isWorkspaceOpen) {
                setIsLoadingWorkspace(true);
                try {
                    const info = await getWorkspaceInfo();
                    setWorkspaceInfo(info);
                } catch (error) {
                    console.error('Error loading workspace info:', error);
                    setWorkspaceInfo(null);
                } finally {
                    setIsLoadingWorkspace(false);
                }
            }
        };
        fetchWorkspaceInfo();
    }, [isWorkspaceOpen]);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <>
            <div className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 transition-all duration-300">
                {/* Left side */}
                <div className="flex items-center gap-2 md:gap-6">
                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsOpen(true)}
                        className="lg:hidden p-2 text-gray-500 hover:text-[#21AC96] hover:bg-gray-50 rounded-xl transition-all active:scale-90"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="relative hidden md:block" ref={workspaceRef}>
                        <button
                            onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
                            className="flex items-center gap-2.5 px-4 py-2 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md hover:border-gray-200 transition-all duration-300 cursor-pointer group active:scale-95"
                        >
                            <span className="text-sm text-gray-700 font-bold tracking-tight group-hover:text-[#21AC96] transition-colors">Mi Workspace</span>
                            <ChevronDown className={cn(
                                "w-4 h-4 text-gray-400 group-hover:text-[#21AC96] transition-all duration-300",
                                isWorkspaceOpen && "rotate-180 text-[#21AC96]"
                            )} />
                        </button>
                        <WorkspaceDropdown
                            isOpen={isWorkspaceOpen}
                            workspaceInfo={workspaceInfo}
                            isLoading={isLoadingWorkspace}
                            onClose={() => setIsWorkspaceOpen(false)}
                            userRole={userRole}
                        />
                    </div>

                    <div className="relative group max-w-[200px] md:max-w-none" ref={searchRef}>
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#21AC96] group-focus-within:scale-110 transition-all duration-300" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => {
                                if (searchQuery.trim().length >= 2) {
                                    setIsSearchOpen(true);
                                }
                            }}
                            className="w-full md:w-96 pl-10 md:pl-12 pr-4 py-2 bg-gray-50/50 border border-transparent border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] focus:bg-white transition-all duration-300 placeholder:text-gray-400"
                        />
                        <SearchDropdown
                            isOpen={isSearchOpen}
                            query={searchQuery}
                            results={searchResults}
                            isLoading={isSearching}
                            onClose={() => setIsSearchOpen(false)}
                        />
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 md:gap-6">
                    {/* Credits */}
                    <div
                        onClick={async () => {
                            setIsCreditsModalOpen(true);
                            setIsLoadingCredits(true);
                            try {
                                const data = await getCreditsDetails();
                                setCreditsData(data);
                            } catch (error) {
                                console.error('Error loading credits details:', error);
                            } finally {
                                setIsLoadingCredits(false);
                            }
                        }}
                        className="flex items-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 bg-[#21AC96]/5 rounded-2xl border border-[#21AC96]/10 hover:bg-[#21AC96]/10 transition-all duration-300 cursor-pointer group active:scale-95 hover:shadow-sm"
                    >
                        <div className="w-7 h-7 md:w-8 md:h-8 bg-white shadow-sm rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Coins className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#21AC96] group-hover:rotate-12 transition-transform duration-300" />
                        </div>
                        <div className="flex flex-col">
                            <span className="hidden md:inline text-[10px] text-gray-400 font-bold uppercase tracking-wider">Créditos</span>
                            <span className="text-[12px] md:text-sm text-[#21AC96] font-bold">
                                {credits !== null ? `${credits.toLocaleString()}` : '...'}
                                <span className="hidden md:inline"> unidades</span>
                            </span>
                        </div>
                    </div>

                    {/* Notifications indicator on mobile, full on desktop */}
                    <div className="relative" ref={notificationsRef}>
                        <button
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className="relative p-2 md:p-3 bg-gray-50/50 hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 rounded-2xl transition-all duration-300 cursor-pointer group active:scale-90"
                        >
                            <Bell className="w-5 h-5 text-gray-500 group-hover:text-[#21AC96] group-hover:scale-110 transition-all duration-300" />
                            {notificationCount > 0 && (
                                <span className="absolute top-2 right-2 md:top-3 md:right-3 w-2 h-2 bg-[#21AC96] rounded-full ring-2 ring-white animate-pulse"></span>
                            )}
                        </button>
                        <NotificationsDropdown
                            isOpen={isNotificationsOpen}
                            onClose={() => setIsNotificationsOpen(false)}
                            notifications={notifications}
                            isLoading={isLoadingNotifications}
                        />
                    </div>

                    <div className="hidden md:block h-8 w-[1px] bg-gray-100"></div>

                    {/* User Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            className={cn(
                                "flex items-center gap-3 pl-1 md:pr-3 py-1.5 rounded-2xl transition-all duration-300 cursor-pointer group active:scale-95",
                                isUserMenuOpen ? "bg-gray-50" : "hover:bg-gray-50/50"
                            )}
                        >
                            <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-[#21AC96] to-[#1a8a78] rounded-2xl flex items-center justify-center text-white font-bold shadow-lg shadow-[#21AC96]/20 transform group-hover:rotate-6 group-hover:scale-105 transition-all duration-300 overflow-hidden relative">
                                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <Sparkles className="w-5 h-5 md:w-5 md:h-5" />
                            </div>
                            <div className="hidden md:flex flex-col items-start translate-x-0 group-hover:translate-x-1 transition-transform duration-300">
                                <span className="text-sm text-gray-900 font-bold tracking-tight">{displayText}</span>
                                <span className="text-[10px] text-gray-400 font-medium">{currentDate}</span>
                            </div>
                            <ChevronDown className={cn(
                                "hidden md:block w-4 h-4 text-gray-400 transition-all duration-300 ml-1",
                                isUserMenuOpen ? "rotate-180 text-[#21AC96]" : "group-hover:text-[#21AC96]"
                            )} />
                        </button>

                        {/* User Dropdown Content */}
                        {isUserMenuOpen && (
                            <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-50 p-2 animate-in fade-in zoom-in-95 duration-200 isolate">
                                <div className="space-y-1">
                                    <Link href="/profile" onClick={() => setIsUserMenuOpen(false)}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 group">
                                        <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-semibold">Perfil</span>
                                    </Link>
                                    {userRole === 'OWNER' && (
                                        <>
                                            <Link href="/billing" onClick={() => setIsUserMenuOpen(false)}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 group">
                                                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                                                    <CreditCard className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-semibold">Suscripción</span>
                                            </Link>
                                            <Link href="/settings" onClick={() => setIsUserMenuOpen(false)}
                                                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200 group">
                                                <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:scale-110 transition-transform">
                                                    <Settings className="w-4 h-4" />
                                                </div>
                                                <span className="text-sm font-semibold">Ajustes</span>
                                            </Link>
                                        </>
                                    )}
                                    <div className="h-[1px] bg-gray-50 mx-4 my-2"></div>
                                    <button onClick={() => signOut({ callbackUrl: '/login' })}
                                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all duration-200 group">
                                        <div className="w-8 h-8 rounded-xl bg-red-100/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <LogOut className="w-4 h-4" />
                                        </div>
                                        <span className="text-sm font-bold">Cerrar sesión</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Credits Details Modal */}
            {mounted && createPortal(
                <CreditsDetailsModal
                    isOpen={isCreditsModalOpen}
                    onClose={() => setIsCreditsModalOpen(false)}
                    creditsData={creditsData}
                    isLoading={isLoadingCredits}
                />,
                document.body
            )}
        </>
    );
}

