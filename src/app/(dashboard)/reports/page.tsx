import { ReportsClient } from '@/components/reports/ReportsClient';
import { getWorkspaceInfo } from '@/lib/actions/workspace';
import {
    getCustomFieldsAnalytics,
    getConversionFunnel,
    getHeatmapData,
    getAgentPerformance,
    getChannelDistribution,
    getRetentionRate,
    getNPSAnalytics
} from '@/lib/actions/reports';

export default async function ReportsPage() {
    const workspaceInfo = await getWorkspaceInfo();

    if (!workspaceInfo) return null;

    // Parallel fetch of report data
    const [
        customFieldsData,
        funnelData,
        heatmapData,
        agentPerformance,
        channelDistribution,
        retentionRate,
        npsData
    ] = await Promise.all([
        getCustomFieldsAnalytics(),
        getConversionFunnel(),
        getHeatmapData(),
        getAgentPerformance(),
        getChannelDistribution(),
        getRetentionRate(),
        getNPSAnalytics()
    ]);

    return (
        <ReportsClient
            workspaceInfo={workspaceInfo}
            customFieldsData={customFieldsData}
            funnelData={funnelData}
            heatmapData={heatmapData}
            agentPerformance={agentPerformance}
            channelDistribution={channelDistribution}
            retentionRate={retentionRate}
            npsData={npsData}
        />
    );
}
