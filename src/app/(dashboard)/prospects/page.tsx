import { SegmentBuilder } from '@/components/contacts/SegmentBuilder';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function ProspectsBuilderPage() {
    // Determine the active workspace.
    // In a real app, this would come from the user's session or selected workspace context.
    // For this implementation, we will fetch the first available workspace to ensure functionality.
    const workspace = await prisma.workspace.findFirst({
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
                    <h2 className="text-xl font-bold text-gray-900">No se encontró un espacio de trabajo</h2>
                    <p className="text-gray-500">Por favor, crea un espacio de trabajo primero.</p>
                </div>
            </div>
        );
    }

    // Aggregate custom fields from all agents in the workspace
    // This allows filtering contacts by any field defined by any agent in the workspace.
    const allCustomFields = workspace.agents.flatMap(a => a.customFieldDefinitions);

    // Debug logging
    console.log(`[ProspectsPage] Found workspace ${workspace.id} with ${workspace.agents.length} agents. Total fields: ${allCustomFields.length}`);

    // Deduplicate fields by key to avoid duplicates in the filter dropdown
    const uniqueFieldsMap = new Map();
    allCustomFields.forEach(field => {
        if (!uniqueFieldsMap.has(field.key)) {
            uniqueFieldsMap.set(field.key, field);
        }
    });
    const uniqueFields = Array.from(uniqueFieldsMap.values());
    console.log(`[ProspectsPage] Unique fields passing to builder:`, uniqueFields.map(f => f.key));

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Segmentación Avanzada</h1>
                    <p className="text-gray-500 font-medium">Crea audiencias personalizadas y filtra prospectos usando los datos recolectados por tus agentes.</p>
                </div>
            </div>

            <SegmentBuilder workspaceId={workspace.id} customFields={uniqueFields} />
        </div>
    );
}
