import { SegmentBuilder } from '@/components/contacts/SegmentBuilder';
import { CampaignEducation } from '@/components/contacts/CampaignEducation';
import { ProspectsKanbanBoard } from '@/components/prospects/ProspectsKanbanBoard';
import { ProspectsViewToggle } from '@/components/prospects/ProspectsViewToggle';
import { prisma } from '@/lib/prisma';
import { getUserWorkspace } from '@/lib/actions/dashboard';
import { getProspectPipelineData, getWorkspaceAgents, getWorkspaceCustomFields } from '@/lib/actions/prospect-pipeline';

export default async function ProspectsBuilderPage({
    searchParams
}: {
    searchParams: Promise<{ view?: string }>
}) {
    const params = await searchParams;
    const view = params.view === 'campaigns' ? 'campaigns' : 'prospects';

    const userWorkspace = await getUserWorkspace();

    if (!userWorkspace) {
        return (
            <div className="flex h-full items-center justify-center p-10">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">No se encontró un espacio de trabajo</h2>
                    <p className="text-gray-500">Por favor, crea un espacio de trabajo primero.</p>
                </div>
            </div>
        );
    }

    /* ── Shared data ─────────────────────────────────────────────── */
    const [pipelineResult, agents, customFields] = await Promise.all([
        getProspectPipelineData(),
        getWorkspaceAgents(),
        getWorkspaceCustomFields()
    ]);

    /* ── For campaigns view: existing logic ─────────────────────── */
    const workspace = await prisma.workspace.findUnique({
        where: { id: userWorkspace.id },
        include: {
            agents: { include: { customFieldDefinitions: true } }
        }
    });

    const allCustomFields = workspace?.agents.flatMap(a => a.customFieldDefinitions) ?? [];
    const agentsForFilter = workspace?.agents.map(a => ({
        id: a.id, name: a.name, avatarUrl: a.avatarUrl
    })) ?? [];

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in p-6">
            {/* ── Page header + toggle ─────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-gray-900 text-3xl font-black tracking-tight mb-1">
                        {view === 'prospects' ? 'Pipeline de Prospectos' : 'Segmentación Avanzada'}
                    </h1>
                    <p className="text-gray-500 font-medium text-[14px]">
                        {view === 'prospects'
                            ? 'Gestiona y visualiza el avance de tus prospectos en tu pipeline de ventas.'
                            : 'Crea audiencias personalizadas y filtra prospectos usando los datos recolectados por tus agentes.'}
                    </p>
                </div>

                {/* Toggle is client-side */}
                <ProspectsViewToggle currentView={view} />
            </div>

            {/* ── Content ──────────────────────────────────────── */}
            {view === 'prospects' ? (
                <ProspectsKanbanBoard
                    initialColumns={pipelineResult.success ? (pipelineResult.columns as any[]) : []}
                    initialProspects={pipelineResult.success ? (pipelineResult.prospects as any[]) : []}
                    agents={agents}
                    customFields={customFields}
                />
            ) : (
                <>
                    <CampaignEducation />
                    <SegmentBuilder
                        workspaceId={userWorkspace.id}
                        customFields={allCustomFields}
                        agents={agentsForFilter}
                    />
                </>
            )}
        </div>
    );
}
