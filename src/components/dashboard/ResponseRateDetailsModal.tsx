'use client'

import { useState, useEffect } from 'react';
import { X, MessageSquare, Clock, Bot, Radio, TrendingUp, AlertCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useRouter } from 'next/navigation';

interface ResponseRateDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    responseData: any;
    isLoading?: boolean;
}

export function ResponseRateDetailsModal({ isOpen, onClose, responseData, isLoading = false }: ResponseRateDetailsModalProps) {
    const router = useRouter();

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

    if (isLoading || !responseData) {
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

    const formatTime = (seconds: number) => {
        if (seconds < 60) return `${Math.round(seconds)}s`;
        if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
        return `${Math.round(seconds / 3600)}h`;
    };

    const channelNames: Record<string, string> = {
        WHATSAPP: 'WhatsApp',
        INSTAGRAM: 'Instagram',
        MESSENGER: 'Messenger',
        WEBCHAT: 'Web'
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-5xl bg-white rounded-[2rem] shadow-xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-[#21AC96]/5 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#21AC96]/10 flex items-center justify-center text-[#21AC96]">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900">Tasa de Respuesta</h2>
                            <p className="text-sm text-gray-400 font-medium">Análisis detallado de respuestas</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-[#21AC96]/10 to-[#21AC96]/5 rounded-2xl p-5 border border-[#21AC96]/20">
                            <div className="flex items-center gap-3 mb-2">
                                <MessageSquare className="w-5 h-5 text-[#21AC96]" />
                                <span className="text-sm font-bold text-gray-600">Tasa General</span>
                            </div>
                            <p className="text-3xl font-extrabold text-gray-900">{responseData.responseRate}%</p>
                            <p className="text-xs text-gray-400 mt-1">de conversaciones respondidas</p>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 rounded-2xl p-5 border border-blue-100">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                                <span className="text-sm font-bold text-gray-600">Respondidas</span>
                            </div>
                            <p className="text-3xl font-extrabold text-gray-900">{responseData.conversationsWithResponse.toLocaleString()}</p>
                            <p className="text-xs text-gray-400 mt-1">de {responseData.totalConversations.toLocaleString()} total</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-purple-50/50 rounded-2xl p-5 border border-purple-100">
                            <div className="flex items-center gap-3 mb-2">
                                <Clock className="w-5 h-5 text-purple-600" />
                                <span className="text-sm font-bold text-gray-600">Tiempo Promedio</span>
                            </div>
                            <p className="text-3xl font-extrabold text-gray-900">{formatTime(responseData.avgResponseTimeSeconds)}</p>
                            <p className="text-xs text-gray-400 mt-1">para responder</p>
                        </div>

                        <div className="bg-gradient-to-br from-red-50 to-red-50/50 rounded-2xl p-5 border border-red-100">
                            <div className="flex items-center gap-3 mb-2">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <span className="text-sm font-bold text-gray-600">Sin Respuesta</span>
                            </div>
                            <p className="text-3xl font-extrabold text-gray-900">{responseData.conversationsWithoutResponse.toLocaleString()}</p>
                            <p className="text-xs text-gray-400 mt-1">requieren atención</p>
                        </div>
                    </div>

                    {/* Weekly Chart */}
                    {responseData.weeklyData && responseData.weeklyData.length > 0 && (
                        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
                            <h3 className="text-lg font-extrabold text-gray-900 mb-4">Evolución Semanal (Últimas 4 semanas)</h3>
                            <div className="h-[200px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={responseData.weeklyData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis
                                            dataKey="week"
                                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                                        />
                                        <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    return (
                                                        <div className="bg-gray-900 text-white px-3 py-2 rounded-xl">
                                                            <p className="text-xs font-bold text-gray-300 mb-1">{data.week}</p>
                                                            <p className="text-sm font-bold mb-1">Tasa: {data.rate}%</p>
                                                            <p className="text-xs text-gray-400">{data.responded} de {data.total} respondidas</p>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Bar dataKey="rate" radius={[8, 8, 0, 0]}>
                                            {responseData.weeklyData.map((entry: any, index: number) => (
                                                <Cell key={`cell-${index}`} fill="#21AC96" />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Breakdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* By Agent */}
                        {responseData.agentStats && responseData.agentStats.length > 0 && (
                            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Bot className="w-5 h-5 text-[#21AC96]" />
                                    <h3 className="text-lg font-extrabold text-gray-900">Por Agente</h3>
                                </div>
                                <div className="space-y-3">
                                    {responseData.agentStats.map((agent: any, index: number) => (
                                        <div key={index} className="p-3 bg-gray-50 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-gray-900">{agent.name}</span>
                                                <span className="font-extrabold text-[#21AC96]">{agent.rate}%</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{agent.responded} respondidas</span>
                                                <span>•</span>
                                                <span>{agent.total} total</span>
                                            </div>
                                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-[#21AC96] h-2 rounded-full transition-all"
                                                    style={{ width: `${agent.rate}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* By Channel */}
                        {responseData.channelStats && responseData.channelStats.length > 0 && (
                            <div className="bg-white border border-gray-100 rounded-2xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Radio className="w-5 h-5 text-purple-600" />
                                    <h3 className="text-lg font-extrabold text-gray-900">Por Canal</h3>
                                </div>
                                <div className="space-y-3">
                                    {responseData.channelStats.map((channel: any, index: number) => (
                                        <div key={index} className="p-3 bg-gray-50 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-gray-900">{channelNames[channel.type] || channel.type}</span>
                                                <span className="font-extrabold text-purple-600">{channel.rate}%</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{channel.responded} respondidas</span>
                                                <span>•</span>
                                                <span>{channel.total} total</span>
                                            </div>
                                            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-purple-600 h-2 rounded-full transition-all"
                                                    style={{ width: `${channel.rate}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Conversations Without Response */}
                    {responseData.conversationsWithoutResponseList && responseData.conversationsWithoutResponseList.length > 0 && (
                        <div className="bg-white border border-gray-100 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-red-600" />
                                    <h3 className="text-lg font-extrabold text-gray-900">Conversaciones Sin Respuesta</h3>
                                </div>
                                <span className="text-sm font-bold text-gray-500">{responseData.conversationsWithoutResponseList.length} pendientes</span>
                            </div>
                            <div className="space-y-2 max-h-[250px] overflow-y-auto">
                                {responseData.conversationsWithoutResponseList.map((conv: any) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => {
                                            router.push(`/chat`);
                                            onClose();
                                        }}
                                        className="flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 cursor-pointer transition-colors group border border-red-200"
                                    >
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 font-bold">
                                                {conv.contactName.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{conv.contactName}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span>{conv.agentName}</span>
                                                    <span>•</span>
                                                    <span>{channelNames[conv.channelType] || conv.channelType}</span>
                                                    <span>•</span>
                                                    <span>{format(new Date(conv.createdAt), 'd MMM HH:mm', { locale: es })}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-red-600 transition-colors" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


