import { FieldsManager } from '@/components/agents/FieldsManager';
import { getCustomFields } from '@/lib/actions/custom-fields';

export default async function FieldsPage({ params }: { params: Promise<{ agentId: string }> }) {
    const { agentId } = await params;
    const fields = await getCustomFields(agentId);

    return <FieldsManager agentId={agentId} initialFields={fields} />;

}
