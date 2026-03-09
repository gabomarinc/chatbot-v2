'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { updateSubscriptionPlan } from '@/lib/actions/billing';
import { toast } from '@/components/ui/sonner';
import { Check, X, Edit2, DollarSign, Zap, Users } from 'lucide-react';

type Plan = {
    id: string;
    name: string;
    type: string;
    monthlyPrice: number;
    creditsPerMonth: number;
    maxAgents: number;
    isActive: boolean;
};

export default function PlansManagementClient({ initialPlans }: { initialPlans: Plan[] }) {
    const [plans, setPlans] = useState(initialPlans);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Plan>>({});
    const [saving, setSaving] = useState(false);

    const handleEdit = (plan: Plan) => {
        setEditingId(plan.id);
        setEditForm({
            name: plan.name,
            monthlyPrice: plan.monthlyPrice,
            creditsPerMonth: plan.creditsPerMonth,
            maxAgents: plan.maxAgents,
            isActive: plan.isActive,
        });
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSave = async (planId: string) => {
        setSaving(true);
        try {
            const result = await updateSubscriptionPlan(planId, {
                name: editForm.name,
                monthlyPrice: editForm.monthlyPrice,
                creditsPerMonth: editForm.creditsPerMonth,
                maxAgents: editForm.maxAgents,
                isActive: editForm.isActive,
            });

            if (result.success) {
                setPlans(plans.map(p => p.id === planId ? { ...p, ...editForm } as Plan : p));
                toast.success('Plan actualizado correctamente');
                setEditingId(null);
                setEditForm({});
            }
        } catch (error) {
            toast.error('Error al actualizar el plan');
        } finally {
            setSaving(false);
        }
    };

    const getPlanColor = (type: string) => {
        switch (type) {
            case 'STARTER':
                return 'from-green-500 to-emerald-500';
            case 'BUSINESS':
                return 'from-[#21AC96] to-[#1a8a78]';
            case 'ENTERPRISE':
                return 'from-amber-500 to-orange-500';
            default:
                return 'from-slate-500 to-gray-500';
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-[#21AC96] to-[#1a8a78] bg-clip-text text-transparent">
                    Gestión de Planes
                </h1>
                <p className="text-slate-500 mt-2 text-lg">Administra los planes de suscripción de tu plataforma</p>
            </div>

            {/* Plans Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => {
                    const isEditing = editingId === plan.id;

                    return (
                        <Card
                            key={plan.id}
                            className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${!plan.isActive ? 'opacity-60' : ''
                                }`}
                        >
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getPlanColor(plan.type)} flex items-center justify-center shadow-lg`}>
                                        <DollarSign className="w-6 h-6 text-white" />
                                    </div>
                                    <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                                        {plan.isActive ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                                {isEditing ? (
                                    <div className="space-y-2">
                                        <Label className="text-xs">Nombre del Plan</Label>
                                        <Input
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="text-lg font-bold"
                                        />
                                    </div>
                                ) : (
                                    <CardTitle className="text-2xl font-bold text-slate-800">{plan.name}</CardTitle>
                                )}
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* Price */}
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-500">Precio Mensual</Label>
                                    {isEditing ? (
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                            <Input
                                                type="number"
                                                value={editForm.monthlyPrice}
                                                onChange={(e) => setEditForm({ ...editForm, monthlyPrice: parseFloat(e.target.value) })}
                                                className="pl-7"
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-3xl font-bold bg-gradient-to-r from-[#21AC96] to-[#1a8a78] bg-clip-text text-transparent">
                                            ${plan.monthlyPrice}
                                            <span className="text-sm text-slate-400 font-normal">/mes</span>
                                        </div>
                                    )}
                                </div>

                                {/* Credits */}
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-slate-500">Créditos/Mes</div>
                                        {isEditing ? (
                                            <Input
                                                type="number"
                                                value={editForm.creditsPerMonth}
                                                onChange={(e) => setEditForm({ ...editForm, creditsPerMonth: parseInt(e.target.value) })}
                                                className="mt-1 h-8"
                                            />
                                        ) : (
                                            <div className="font-semibold text-slate-700">{plan.creditsPerMonth.toLocaleString()}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Max Agents */}
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                        <Users className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs text-slate-500">Máx. Agentes</div>
                                        {isEditing ? (
                                            <Input
                                                type="number"
                                                value={editForm.maxAgents}
                                                onChange={(e) => setEditForm({ ...editForm, maxAgents: parseInt(e.target.value) })}
                                                className="mt-1 h-8"
                                            />
                                        ) : (
                                            <div className="font-semibold text-slate-700">{plan.maxAgents}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="pt-4 border-t">
                                    {isEditing ? (
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => handleSave(plan.id)}
                                                disabled={saving}
                                                className="flex-1 bg-gradient-to-r from-[#21AC96] to-[#1a8a78] hover:opacity-90"
                                            >
                                                <Check className="w-4 h-4 mr-2" />
                                                Guardar
                                            </Button>
                                            <Button
                                                onClick={handleCancel}
                                                variant="outline"
                                                disabled={saving}
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => handleEdit(plan)}
                                            variant="outline"
                                            className="w-full hover:bg-[#21AC96]/5 hover:border-[#21AC96]"
                                        >
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            Editar Plan
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
