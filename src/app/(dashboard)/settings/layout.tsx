import { redirect } from 'next/navigation';
import { canViewSettings } from '@/lib/actions/team';

export default async function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Check permissions (only OWNER can view settings)
    const canView = await canViewSettings();
    if (!canView) {
        redirect('/dashboard');
    }

    return <>{children}</>;
}

