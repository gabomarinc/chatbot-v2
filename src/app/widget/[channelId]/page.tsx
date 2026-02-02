import { prisma } from '@/lib/prisma';
import { WidgetInterface } from '@/components/public/WidgetInterface';
import { notFound } from 'next/navigation';

interface WidgetPageProps {
    params: Promise<{
        channelId: string;
    }>;
}

export default async function WidgetPage({ params }: WidgetPageProps) {
    const { channelId } = await params;
    const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        include: {
            agent: {
                select: {
                    name: true,
                    avatarUrl: true
                }
            }
        }
    });

    if (!channel || channel.type !== 'WEBCHAT') {
        return notFound();
    }

    return <WidgetInterface channel={channel} />;
}
