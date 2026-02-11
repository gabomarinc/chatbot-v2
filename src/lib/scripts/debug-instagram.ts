
import { PrismaClient } from '@prisma/client';
import { sendInstagramMessage } from '../instagram'; // Ensure this path is correct relative to script location

const prisma = new PrismaClient();

async function main() {
    console.log('--- Deborah Debugger: Instagram Connection ---');

    // 1. Fetch Latest Instagram Channel
    const channel = await prisma.channel.findFirst({
        where: { type: 'INSTAGRAM', isActive: true },
        orderBy: { id: 'desc' }
    });

    if (!channel) {
        console.error('No active Instagram channel found!');
        return;
    }

    console.log(`Found Channel: ${channel.displayName} (ID: ${channel.id})`);
    const config = channel.configJson as any;

    console.log('Configuration Dump:');
    console.log('Instagram Account ID (DB):', config.instagramAccountId, typeof config.instagramAccountId);
    console.log('Page ID (DB):', config.pageId);
    console.log('Verify Token:', config.verifyToken);
    console.log('Access Token Length:', config.pageAccessToken?.length);
    console.log('Access Token Preview:', config.pageAccessToken?.substring(0, 15) + '...');

    // 2. Test Token Validity (User Profile)
    try {
        console.log('\n--- Testing Token Validity ---');
        const meUrl = `https://graph.instagram.com/me?fields=id,username&access_token=${config.pageAccessToken}`;
        const meRes = await fetch(meUrl);
        const meData = await meRes.json();

        if (!meRes.ok) {
            console.error('Token Validation FAILED:', JSON.stringify(meData, null, 2));
        } else {
            console.log('Token Validation SUCCESS:', JSON.stringify(meData, null, 2));

            // Check ID match
            if (String(meData.id) !== String(config.instagramAccountId)) {
                console.warn(`WARNING: Token User ID (${meData.id}) does not match Stored Account ID (${config.instagramAccountId})`);
            } else {
                console.log('ID Match Confirmed.');
            }
        }
    } catch (e) {
        console.error('Token connection error:', e);
    }

    // 3. Check & Fix Webhook Subscription Status
    try {
        console.log('\n--- Checking Webhook Subscription ---');
        const appId = process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID;
        console.log(`Expected App ID: ${appId}`);

        const subUrl = `https://graph.instagram.com/me/subscribed_apps?access_token=${config.pageAccessToken}`;
        const subRes = await fetch(subUrl);
        const subData = await subRes.json();

        console.log('Current Subscriptions:', JSON.stringify(subData, null, 2));

        // Always try to subscribe to ensure it is active
        console.log('Attempting to FORCE Subscribe...');
        const forceSubUrl = `https://graph.instagram.com/me/subscribed_apps?subscribed_fields=messages,messaging_postbacks&access_token=${config.pageAccessToken}`;
        const forceRes = await fetch(forceSubUrl, { method: 'POST' });
        const forceData = await forceRes.json();

        console.log('Subscribe Result:', JSON.stringify(forceData, null, 2));

        if (!forceRes.ok) {
            console.error('FAILED to Subscribe:', forceData.error?.message);
        } else {
            console.log('SUCCESS: App subscribed to messages & messaging_postbacks');
        }

    } catch (e) {
        console.error('Subscription check error:', e);
    }

    // 4. Test Sending Message
    try {
        console.log('\n--- Checking Conversations & Sending Test Message ---');
        // Get list of conversations
        const convUrl = `https://graph.instagram.com/me/conversations?access_token=${config.pageAccessToken}`;
        const convRes = await fetch(convUrl);
        const convData = await convRes.json();

        if (convData.data && convData.data.length > 0) {
            const firstConvId = convData.data[0].id;
            console.log(`Analyzing Conversation ID: ${firstConvId}`);

            // Get participants
            // The participants edge on a conversation returns a list of User objects
            const participantsUrl = `https://graph.instagram.com/${firstConvId}?fields=participants&access_token=${config.pageAccessToken}`;
            const partRes = await fetch(participantsUrl);
            const partData = await partRes.json();

            const participants = partData.participants?.data || [];
            console.log('Participants:', JSON.stringify(participants, null, 2));

            // Find the OTHER user (not the page itself)
            // We filter out any participant with username 'konsul.ia' OR matching our ID
            // Note: The ID in participants list (IGSID) might differ from our Global ID.
            // But we know our username is 'konsul.ia' from token validation.
            const recipient = participants.find((p: any) => p.username !== 'konsul.ia');

            if (recipient) {
                console.log(`Found Recipient: ${recipient.username} (ID: ${recipient.id})`);
                console.log('Attempting to send test message...');

                try {
                    const result = await sendInstagramMessage(
                        config.pageAccessToken,
                        recipient.id,
                        "🤖 Hola! Esta es una prueba de conexión técnica desde el servidor de Konsul."
                    );

                    console.log('✅ Message Sent Successfully:', JSON.stringify(result, null, 2));
                } catch (sendErr: any) {
                    console.error('❌ Failed to send message:', sendErr.message);
                    console.error('Full Error:', JSON.stringify(sendErr, null, 2));
                }
            } else {
                console.log('Could not identify a valid recipient in the conversation.');
            }

        } else {
            console.log('No existing conversations found. Cannot test outbound messaging without a recipient.');
        }

    } catch (e) {
        console.error('Conversation/Message test error:', e);
    }

    console.log('\n--- End of Debug ---');
}

main()
    .catch(e => {
        throw e
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
