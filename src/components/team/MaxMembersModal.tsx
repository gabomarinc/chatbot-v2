'use client'

import { X, Users, CreditCard, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface MaxMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlanName: string;
    currentMaxMembers: number;
}

export function MaxMembersModal({ isOpen, onClose, currentPlanName, currentMaxMembers }: MaxMembersModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Límite de miembros alcanzado</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                        <p className="text-sm text-amber-800 font-medium">
                            Ya has alcanzado el número máximo de miembros de equipo que están incluidos en tu plan actual.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#21AC96]/10 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5 text-[#21AC96]" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-600">Plan Actual</p>
                                    <p className="text-lg font-bold text-gray-900">{currentPlanName}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-600">Máximo</p>
                                <p className="text-lg font-bold text-[#21AC96]">{currentMaxMembers} miembros</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <p className="text-sm text-gray-600 mb-4">
                            Para invitar más miembros a tu equipo, necesitas actualizar tu plan de suscripción.
                        </p>
                        <Link
                            href="/billing"
                            onClick={onClose}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#21AC96] hover:bg-[#1a8a78] text-white rounded-2xl font-bold shadow-lg shadow-[#21AC96]/20 transition-all duration-300 active:scale-95"
                        >
                            <CreditCard className="w-5 h-5" />
                            Ver Planes y Suscripciones
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

