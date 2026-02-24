'use client'

import { useRouter } from 'next/navigation'
import { Users, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProspectsViewToggleProps {
    currentView: 'prospects' | 'campaigns'
}

export function ProspectsViewToggle({ currentView }: ProspectsViewToggleProps) {
    const router = useRouter()

    return (
        <div className="flex items-center gap-3 bg-gray-100/80 px-3 py-3 rounded-[2rem] shadow-inner">
            {/* Label */}
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 pl-2 select-none">
                VISTA
            </span>

            {/* Prospectos */}
            <button
                onClick={() => router.push('/prospects?view=prospects')}
                className={cn(
                    'flex items-center gap-2.5 px-7 py-3 rounded-[1.4rem] text-[14px] font-black transition-all duration-200 select-none',
                    currentView === 'prospects'
                        ? 'bg-[#21AC96] text-white shadow-lg shadow-[#21AC96]/25 scale-[1.02]'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-white/60'
                )}
            >
                <Users className="w-4 h-4" />
                Prospectos
            </button>

            {/* Campañas */}
            <button
                onClick={() => router.push('/prospects?view=campaigns')}
                className={cn(
                    'flex items-center gap-2.5 px-7 py-3 rounded-[1.4rem] text-[14px] font-black transition-all duration-200 select-none',
                    currentView === 'campaigns'
                        ? 'bg-[#21AC96] text-white shadow-lg shadow-[#21AC96]/25 scale-[1.02]'
                        : 'text-gray-400 hover:text-gray-700 hover:bg-white/60'
                )}
            >
                <Megaphone className="w-4 h-4" />
                Campañas
            </button>
        </div>
    )
}
