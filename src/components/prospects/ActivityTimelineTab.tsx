'use client';

import { useState } from 'react';
import { MessageSquare, Calendar, User, Clock, Send, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { addContactNote } from '@/lib/actions/contacts';
import { toast } from 'sonner';

interface ActivityTimelineTabProps {
    contactId: string;
    activities: any[];
}

export function ActivityTimelineTab({ contactId, activities: initialActivities }: ActivityTimelineTabProps) {
    const [activities, setActivities] = useState(initialActivities || []);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const result = await addContactNote(contactId, note);
            if (result.success) {
                setActivities([result.activity, ...activities]);
                setNote('');
                toast.success('Nota guardada');
            } else {
                toast.error('Error al guardar nota: ' + result.error);
            }
        } catch (error) {
            toast.error('Error inesperado');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Note Input */}
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <MessageSquare className="w-4 h-4" />
                    </div>
                    <h4 className="text-gray-900 font-black uppercase tracking-widest text-[10px]">Agregar Comentario / Nota</h4>
                </div>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Escribe una observación interna sobre este contacto..."
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all min-h-[100px] resize-none"
                    disabled={isSubmitting}
                />
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={!note.trim() || isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Guardar Nota
                    </button>
                </div>
            </form>

            {/* Timeline */}
            <div className="space-y-6 relative ml-4">
                {/* Vertical Line */}
                <div className="absolute left-0 top-2 bottom-0 w-px bg-gray-100" />

                {activities.length > 0 ? (
                    activities.map((activity: any, i: number) => (
                        <div key={activity.id} className="relative pl-8 group">
                            {/* Dot */}
                            <div className={`absolute left-[-4px] top-2 w-2 h-2 rounded-full border-2 border-white transition-all group-hover:scale-150 ${activity.type === 'NOTE' ? 'bg-indigo-500 ring-4 ring-indigo-50' : 'bg-gray-300 ring-4 ring-gray-50'
                                }`} />

                            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm group-hover:border-gray-200 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${activity.type === 'NOTE' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-500'
                                            }`}>
                                            {activity.type === 'NOTE' ? 'Nota Interna' : 'Evento de Sistema'}
                                        </span>
                                        {activity.user && (
                                            <div className="flex items-center gap-1.5 ml-2">
                                                <div className="w-4 h-4 rounded-full bg-gray-200 border border-white overflow-hidden">
                                                    {activity.user.image ? (
                                                        <img src={activity.user.image} alt={activity.user.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-full h-full p-0.5 text-gray-400" />
                                                    )}
                                                </div>
                                                <span className="text-[11px] font-bold text-gray-600">{activity.user.name}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                                        <Clock className="w-3 h-3" />
                                        {format(new Date(activity.createdAt), "d MMM, HH:mm", { locale: es })}
                                    </div>
                                </div>
                                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                                    {activity.content}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-10">
                        <p className="text-gray-400 text-sm font-medium">No hay actividad registrada para este contacto.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
