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
        <div className="flex items-center bg-white border border-gray-100 rounded-2xl shadow-sm p-1 gap-1">
            <button
                onClick={() => router.push('/prospects?view=prospects')}
                className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all',
                    currentView === 'prospects'
                        ? 'bg-[#21AC96] text-white shadow-md shadow-[#21AC96]/20'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                )}
            >
                <Users className="w-4 h-4" />
                Prospectos
            </button>
            <button
                onClick={() => router.push('/prospects?view=campaigns')}
                className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all',
                    currentView === 'campaigns'
                        ? 'bg-[#21AC96] text-white shadow-md shadow-[#21AC96]/20'
                        : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                )}
            >
                <Megaphone className="w-4 h-4" />
                Campañas
            </button>
        </div>
    )
}
