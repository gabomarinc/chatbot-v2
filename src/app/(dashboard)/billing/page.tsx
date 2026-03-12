import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import BillingClient from './BillingClient';
import { canViewBilling } from '@/lib/actions/team';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';
import { Loader2 } from 'lucide-react';

export default async function BillingPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/login');
    }

    // Check permissions (only OWNER can view billing)
    const canView = await canViewBilling();
    if (!canView) {
        redirect('/dashboard');
    }

    // Get user's workspace with subscription and credit balance
    const workspace = await prisma.workspace.findFirst({
        where: {
            members: {
                some: {
                    userId: session.user.id,
                },
            },
        },
        include: {
            subscription: {
                include: {
                    plan: true,
                },
            },
            creditBalance: true,
            agents: true,
        },
    });

    if (!workspace) {
        redirect('/dashboard');
    }

    const subscription = workspace.subscription;
    const plan = subscription?.plan;
    const creditBalance = workspace.creditBalance;

    // Calculate usage percentage
    const creditsUsed = creditBalance?.totalUsed || 0;
    const creditsPerMonth = plan?.creditsPerMonth || 5000;
    const usagePercentage = Math.min((creditsUsed / creditsPerMonth) * 100, 100);
    const creditsRemaining = Math.max(creditBalance?.balance || 0, 0);

    const status = subscription?.status || 'inactive';
    const currentPeriodEnd = subscription?.currentPeriodEnd || new Date();
    
    // Whitelisted accounts are those without a stripeSubscriptionId
    const isWhitelisted = !subscription?.stripeSubscriptionId;
    const isOverdue = !isWhitelisted && (status === 'past_due' || (subscription?.currentPeriodEnd && subscription.currentPeriodEnd < new Date()));

    // Fetch card details from Stripe if customer exists
    let cardDetails = null;
    if (subscription?.stripeCustomerId) {
        try {
            console.log(`[BILLING DEBUG] Fetching card for customer: ${subscription.stripeCustomerId}`);
            
            // 1. Try to get it from the customer default
            const customer = await stripe.customers.retrieve(subscription.stripeCustomerId, {
                expand: ['invoice_settings.default_payment_method']
            }) as Stripe.Customer;

            let paymentMethod = customer.invoice_settings?.default_payment_method as Stripe.PaymentMethod;
            
            // 2. If not on customer, try to get it from the actual subscription if we have an ID
            if (!paymentMethod && subscription.stripeSubscriptionId) {
                console.log(`[BILLING DEBUG] No customer default PM, checking subscription: ${subscription.stripeSubscriptionId}`);
                const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId, {
                    expand: ['default_payment_method']
                });
                paymentMethod = stripeSub.default_payment_method as Stripe.PaymentMethod;
            }

            // 3. If still not found, get the most recent payment method attached to the customer
            if (!paymentMethod) {
                console.log(`[BILLING DEBUG] No explicit default PM, listing payment methods`);
                const paymentMethods = await stripe.paymentMethods.list({
                    customer: subscription.stripeCustomerId,
                    type: 'card',
                    limit: 1
                });
                if (paymentMethods.data.length > 0) {
                    paymentMethod = paymentMethods.data[0];
                }
            }
            
            if (paymentMethod?.card) {
                console.log(`[BILLING DEBUG] Found card: **** ${paymentMethod.card.last4}`);
                cardDetails = {
                    last4: paymentMethod.card.last4,
                    brand: paymentMethod.card.brand.toUpperCase(),
                    expMonth: paymentMethod.card.exp_month,
                    expYear: paymentMethod.card.exp_year,
                };
            } else {
                console.log(`[BILLING DEBUG] No card found in payment method or no payment method found`);
            }
        } catch (error) {
            console.error('[BILLING ERROR] Error fetching Stripe card details:', error);
        }
    } else {
        console.log(`[BILLING DEBUG] No stripeCustomerId for this workspace`);
    }

    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#21AC96]" />
                <p className="text-gray-500 font-bold animate-pulse">Cargando facturación...</p>
            </div>
        }>
            <BillingClient
                planName={plan?.name || 'Plan Gratuito'}
                planPrice={plan?.monthlyPrice || 0}
                maxAgents={plan?.maxAgents || 1}
                creditsPerMonth={creditsPerMonth}
                creditsRemaining={creditsRemaining}
                creditsUsed={creditsUsed}
                usagePercentage={usagePercentage}
                currentPeriodEnd={currentPeriodEnd}
                isActive={status === 'active' || status === 'trialing' || status === 'past_due'}
                isOverdue={!!isOverdue}
                isTrial={subscription?.isTrial || false}
                cardDetails={cardDetails}
            />
        </Suspense>
    );
}
