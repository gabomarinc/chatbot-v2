import { SegmentBuilder } from '@/components/contacts/SegmentBuilder';
import { prisma } from '@/lib/prisma';
import { getUserWorkspace } from '@/lib/actions/dashboard';
import { redirect } from 'next/navigation';

export default async function ProspectsBuilderPage() {
    // Get the current user's active workspace
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

    // Now fetch the full workspace data including agents and their custom fields
    // We use findUnique because we have the ID from getUserWorkspace
    const workspace = await prisma.workspace.findUnique({
        where: {
            id: userWorkspace.id
        },
        include: {
            agents: {
                include: {
                    customFieldDefinitions: true
                }
            }
        }
    });

    if (!workspace) {
        return (
            <div className="flex h-full items-center justify-center p-10">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">Error al cargar datos</h2>
                    <p className="text-gray-500">No se pudo recuperar la información del espacio de trabajo.</p>
                </div>
            </div>
        );
    }

    // Aggregate custom fields from all agents in the workspace
    // This allows filtering contacts by any field defined by any agent in the workspace.
    const allCustomFields = workspace.agents.flatMap(a => a.customFieldDefinitions);

    // Debug logging
    console.log(`[ProspectsPage] Found workspace ${workspace.id} with ${workspace.agents.length} agents. Total fields: ${allCustomFields.length}`);

    // Pass all custom fields to the builder, so it can filter them by agentId on the client side.
    // We do NOT deduplicate here anymore, because we need to know which agent owns which field.
    const uniqueFields = allCustomFields;
    console.log(`[ProspectsPage] Passing ${uniqueFields.length} fields to builder`);

    // Fetch agents for the filter dropdown
    const agents = workspace.agents.map(a => ({
        id: a.id,
        name: a.name,
        avatarUrl: a.avatarUrl
    }));

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Segmentación Avanzada</h1>
                    <p className="text-gray-500 font-medium">Crea audiencias personalizadas y filtra prospectos usando los datos recolectados por tus agentes.</p>
                </div>
            </div>

            <SegmentBuilder workspaceId={workspace.id} customFields={uniqueFields} agents={agents} />
        </div>
    );
}
