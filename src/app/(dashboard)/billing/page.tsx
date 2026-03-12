import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import BillingClient from './BillingClient';
import { canViewBilling } from '@/lib/actions/team';
import { stripe } from '@/lib/stripe';
import Stripe from 'stripe';

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
    const isOverdue = status === 'past_due' || (subscription?.currentPeriodEnd && subscription.currentPeriodEnd < new Date());

    // Fetch card details from Stripe if customer exists
    let cardDetails = null;
    if (subscription?.stripeCustomerId) {
        try {
            const customer = await stripe.customers.retrieve(subscription.stripeCustomerId, {
                expand: ['invoice_settings.default_payment_method']
            }) as Stripe.Customer;

            const paymentMethod = customer.invoice_settings?.default_payment_method as Stripe.PaymentMethod;
            
            if (paymentMethod?.card) {
                cardDetails = {
                    last4: paymentMethod.card.last4,
                    brand: paymentMethod.card.brand,
                    expMonth: paymentMethod.card.exp_month,
                    expYear: paymentMethod.card.exp_year,
                };
            }
        } catch (error) {
            console.error('Error fetching Stripe card details:', error);
        }
    }

    return (
        <BillingClient
            planName={plan?.name || 'Sin Plan'}
            planPrice={plan?.monthlyPrice || 0}
            maxAgents={plan?.maxAgents || 0}
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
    );
}
