'use client'

import { useRouter } from 'next/navigation'
import { Users, Megaphone } from 'lucide-react'

const GREEN = '#21AC96'

interface ProspectsViewToggleProps {
    currentView: 'prospects' | 'campaigns'
}

export function ProspectsViewToggle({ currentView }: ProspectsViewToggleProps) {
    const router = useRouter()

    return (
        <div className="flex items-center gap-4 bg-white border border-gray-100 shadow-md shadow-gray-100/60 rounded-[2rem] px-2 py-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-3 select-none">
                Vista
            </span>
            <div className="flex gap-1">
                <button
                    onClick={() => router.push('/prospects?view=prospects')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[1.5rem] text-sm font-black transition-all duration-200 select-none"
                    style={
                        currentView === 'prospects'
                            ? { background: GREEN, color: '#fff', boxShadow: `0 4px 14px ${GREEN}40` }
                            : { color: '#9ca3af' }
                    }
                >
                    <Users className="w-4 h-4" />
                    Prospectos
                </button>
                <button
                    onClick={() => router.push('/prospects?view=campaigns')}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[1.5rem] text-sm font-black transition-all duration-200 select-none"
                    style={
                        currentView === 'campaigns'
                            ? { background: GREEN, color: '#fff', boxShadow: `0 4px 14px ${GREEN}40` }
                            : { color: '#9ca3af' }
                    }
                >
                    <Megaphone className="w-4 h-4" />
                    Campañas
                </button>
            </div>
        </div>
    )
}
