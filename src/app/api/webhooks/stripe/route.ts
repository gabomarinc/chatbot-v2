import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const session = event.data.object as Stripe.Checkout.Session;

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const workspaceId = session.metadata?.workspaceId;
                const type = session.metadata?.type;
                
                if (!workspaceId) {
                    console.error('No workspaceId found in session metadata');
                    return NextResponse.json({ error: 'No workspaceId' }, { status: 400 });
                }

                if (type === 'credits') {
                    const amount = parseInt(session.metadata?.amount || '0');
                    console.log(`[Stripe Webhook] Adding ${amount} credits to workspace ${workspaceId}`);
                    
                    await prisma.creditBalance.update({
                        where: { workspaceId },
                        data: {
                            balance: { increment: amount }
                        }
                    });
                    
                    return NextResponse.json({ received: true });
                }

                // Subscription logic
                const subscription = await stripe.subscriptions.retrieve(
                    session.subscription as string
                ) as Stripe.Subscription;

                const planType = session.metadata?.planType || subscription.metadata?.planType;

                // Get the plan from DB
                const plan = await prisma.subscriptionPlan.findFirst({
                    where: { type: planType as any }
                });

                if (!plan) {
                    console.error('Plan not found for type:', planType);
                    return NextResponse.json({ error: 'Plan not found' }, { status: 400 });
                }

                // Create or update subscription
                await prisma.subscription.upsert({
                    where: { workspaceId: workspaceId },
                    update: {
                        stripeSubscriptionId: subscription.id,
                        stripeCustomerId: subscription.customer as string,
                        status: subscription.status,
                        planId: plan.id,
                        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                        isTrial: subscription.status === 'trialing',
                    },
                    create: {
                        workspaceId: workspaceId,
                        stripeSubscriptionId: subscription.id,
                        stripeCustomerId: subscription.customer as string,
                        status: subscription.status,
                        planId: plan.id,
                        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                        isTrial: subscription.status === 'trialing',
                    },
                });

                // Update credit balance if it fits the plan
                await prisma.creditBalance.update({
                    where: { workspaceId: workspaceId },
                    data: {
                        balance: plan.creditsPerMonth,
                    }
                });

                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;

                // Find subscription by stripe ID
                const dbSub = await prisma.subscription.findFirst({
                    where: { stripeSubscriptionId: subscription.id }
                });

                if (dbSub) {
                    await prisma.subscription.update({
                        where: { id: dbSub.id },
                        data: {
                            status: subscription.status,
                            currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                        }
                    });
                }
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as any;
                
                // Only process recurring subscription payments
                if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
                    const subscription = await stripe.subscriptions.retrieve(
                        invoice.subscription as string
                    );

                    // Find subscription in DB
                    const dbSub = await prisma.subscription.findFirst({
                        where: { stripeSubscriptionId: subscription.id },
                        include: { plan: true }
                    });

                    if (dbSub && dbSub.plan) {
                        console.log(`[Stripe Webhook] Resetting credits for workspace ${dbSub.workspaceId} (Plan: ${dbSub.plan.name})`);
                        
                        // Reset credits to plan amount (Non-cumulative)
                        await prisma.creditBalance.update({
                            where: { workspaceId: dbSub.workspaceId },
                            data: {
                                balance: dbSub.plan.creditsPerMonth,
                                lastResetAt: new Date()
                            }
                        });
                    }
                }
                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error('Error processing webhook:', err);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
