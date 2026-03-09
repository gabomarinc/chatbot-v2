import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is missing');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-01-27-acacia', // Latest stable API version
    typescript: true,
});

export const PLAN_PRICE_IDS = {
    STARTER: process.env.STRIPE_PRICE_ID_STARTER || 'price_placeholder_freshie',
    BUSINESS: process.env.STRIPE_PRICE_ID_BUSINESS || 'price_placeholder_money_honey',
    ENTERPRISE: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_placeholder_wolf',
};

export const getPlanFromPriceId = (priceId: string) => {
    if (priceId === PLAN_PRICE_IDS.STARTER) return 'STARTER';
    if (priceId === PLAN_PRICE_IDS.BUSINESS) return 'BUSINESS';
    if (priceId === PLAN_PRICE_IDS.ENTERPRISE) return 'ENTERPRISE';
    return 'STARTER'; // Default
};
