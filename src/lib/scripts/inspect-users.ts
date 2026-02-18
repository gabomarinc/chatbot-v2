
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: { memberships: { include: { workspace: true } } }
    });
    console.log('Users:', JSON.stringify(users.map(u => ({ email: u.email, workspaces: u.memberships.map(m => m.workspace.name) })), null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
