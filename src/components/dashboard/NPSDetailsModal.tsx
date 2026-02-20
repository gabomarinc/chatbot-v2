'use client'

import { useState, useEffect } from 'react';
import { X, MessageSquare, Star, TrendingUp, AlertCircle, Bot, Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { cn } from '@/lib/utils';

interface NPSDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    npsData: any;
    isLoading?: boolean;
}

export function NPSDetailsModal({ isOpen, onClose, npsData, isLoading = false }: NPSDetailsModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    if (isLoading || !npsData) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
                <div className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-xl overflow-hidden max-h-[90vh] animate-scale-in">
                    <div className="flex items-center justify-center p-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#21AC96]"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-amber-500/5 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Star className="w-6 h-6 fill-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900">Satisfacción (NPS)</h2>
                            <p className="text-sm text-gray-400 font-medium">Análisis de la lealtad y feedback de clientes</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors group"
                    >
                        <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Main Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-bold text-gray-300">NPS Score</span>
                                <Trophy className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <p className="text-5xl font-black">{npsData.score}</p>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Puntos</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 font-medium">Basado en {npsData.total} respuestas</p>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                            <span className="text-sm font-bold text-gray-500 block mb-4">Promedio General</span>
                            <div className="flex items-baseline gap-2">
                                <p className="text-5xl font-black text-gray-900">{npsData.average}</p>
                                <span className="text-lg font-bold text-gray-400">/ 10</span>
                            </div>
                            <div className="mt-4 flex gap-1">
                                {[...Array(10)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-1.5 flex-1 rounded-full",
                                            i < Math.floor(npsData.average) ? "bg-amber-500" : "bg-gray-100"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                            <span className="text-sm font-bold text-gray-500 block mb-4">Distribución</span>
                            <div className="space-y-3">
                                {[
                                    { label: 'Promotores', val: npsData.distribution.promoters, color: 'bg-green-500' },
                                    { label: 'Pasivos', val: npsData.distribution.passives, color: 'bg-amber-400' },
                                    { label: 'Detractores', val: npsData.distribution.detractors, color: 'bg-red-500' }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <div className={cn("w-2 h-2 rounded-full", item.color)} />
                                        <span className="text-xs font-bold text-gray-600 flex-1">{item.label}</span>
                                        <span className="text-xs font-black text-gray-900">{item.val}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Weekly Evolution */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 mb-8">
                        <h3 className="text-lg font-extrabold text-gray-900 mb-6">Evolución del Promedio Semanal</h3>
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={npsData.weeklyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis
                                        dataKey="week"
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        domain={[0, 10]}
                                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-gray-900 text-white px-4 py-3 rounded-2xl shadow-xl">
                                                        <p className="text-xs font-bold text-gray-400 mb-1">{data.week}</p>
                                                        <p className="text-sm font-bold">Promedio: {data.average}</p>
                                                        <p className="text-[10px] text-gray-500 mt-1">{data.count} respuestas</p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="average" radius={[10, 10, 0, 0]}>
                                        {npsData.weeklyData.map((entry: any, index: number) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.average >= 9 ? '#22c55e' : entry.average >= 7 ? '#fbbf24' : '#ef4444'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* By Agent */}
                        <div className="bg-white border border-gray-100 rounded-3xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <Bot className="w-6 h-6 text-amber-500" />
                                <h3 className="text-lg font-extrabold text-gray-900">NPS por Agente</h3>
                            </div>
                            <div className="space-y-4">
                                {npsData.agentStats.map((agent: any, index: number) => (
                                    <div key={index} className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="font-bold text-gray-900">{agent.name}</span>
                                            <div className="flex items-center gap-1.5">
                                                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                                                <span className="font-black text-gray-900">{agent.average}</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-1000",
                                                    agent.average >= 9 ? "bg-green-500" : agent.average >= 7 ? "bg-amber-500" : "bg-red-500"
                                                )}
                                                style={{ width: `${(agent.average / 10) * 100}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-400 font-bold mt-2 uppercase tracking-widest">{agent.total} Valoraciones</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Feedback */}
                        <div className="bg-white border border-gray-100 rounded-3xl p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <MessageSquare className="w-6 h-6 text-[#21AC96]" />
                                <h3 className="text-lg font-extrabold text-gray-900">Feedback Reciente</h3>
                            </div>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {npsData.comments.map((c: any) => (
                                    <div key={c.id} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs",
                                                    c.score >= 9 ? "bg-green-100 text-green-700" : c.score >= 7 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                                )}>
                                                    {c.score}
                                                </div>
                                                <span className="text-xs font-bold text-gray-400">{c.agentName}</span>
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-400">{format(new Date(c.createdAt), 'd MMM HH:mm', { locale: es })}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 font-medium leading-relaxed italic">"{c.comment}"</p>
                                    </div>
                                ))}
                                {npsData.comments.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-30">
                                        <MessageSquare className="w-12 h-12 mb-4" />
                                        <p className="text-sm font-bold">Sin comentarios aún</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
