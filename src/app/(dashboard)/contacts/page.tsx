import { getProspects, getUserWorkspace } from '@/lib/actions/dashboard';
import { ProspectsTableClient } from '@/components/prospects/ProspectsTableClient';
import { prisma } from '@/lib/prisma';

export default async function ProspectsPage() {
    const workspace = await getUserWorkspace();
    if (!workspace) return null;

    const prospects = await getProspects();

    // Fetch workspace custom fields for export logic
    const customFields = await prisma.customFieldDefinition.findMany({
        where: { agent: { workspaceId: workspace.id } }
    });

    // Serialize dates for client component
    const serializedProspects = prospects.map(p => ({
        ...p,
        lastContact: p.lastContact instanceof Date ? p.lastContact.toISOString() : p.lastContact,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt
    }));

    return (
        <div className="max-w-[1600px] mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <h1 className="text-gray-900 text-3xl font-extrabold tracking-tight mb-2">Contactos</h1>
                    <p className="text-gray-500 font-medium">Directorio global de todos los usuarios captados.</p>
                </div>
            </div>

            {/* Client Component */}
            <ProspectsTableClient
                initialProspects={serializedProspects}
                workspaceId={workspace.id}
                customFields={customFields}
            />
        </div>
    );
}
