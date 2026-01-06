
import { PrismaClient } from '@prisma/client';
import { updateContact } from './src/lib/actions/contacts';

const prisma = new PrismaClient();

async function main() {
    // I need a valid contact ID and workspace ID.
    // From screenshot: Contact ID "cmk2t8rfx0003ld04mfio0..." (Visitante n6ww)
    // Wait, let's find a contact first.
    const contact = await prisma.contact.findFirst({
        where: { name: { contains: 'Visitante' } }
    });

    if (!contact) {
        console.log("No contact found to test.");
        return;
    }

    console.log("Testing update on contact:", contact.id, contact.name);

    const updates = {
        name: "Test Name Updated",
        email: "test@example.com",
        "salary": 5000 // assuming 'salary' is a valid custom field key in this workspace
    };

    console.log("Applying updates:", updates);

    const result = await updateContact(contact.id, updates, contact.workspaceId);
    console.log("Update result:", result);

    const updated = await prisma.contact.findUnique({ where: { id: contact.id } });
    console.log("Updated Contact:", updated);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
