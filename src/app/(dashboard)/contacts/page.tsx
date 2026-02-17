import { getProspects, getUserWorkspace } from '@/lib/actions/dashboard';
import { Search } from 'lucide-react';
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

                <div className="flex gap-3">
                    <div className="relative group">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#21AC96] transition-all" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o teléfono..."
                            className="pl-12 pr-4 py-2.5 bg-white border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-[#21AC96]/5 focus:border-[#21AC96] transition-all w-64 shadow-sm"
                        />
                    </div>
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
