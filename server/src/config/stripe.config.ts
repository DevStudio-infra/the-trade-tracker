import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

// Subscription Plans Configuration
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Free",
    credits: 6,
    price: 0,
    features: ["6 AI credits per month", "Basic trading signals", "Single broker connection", "Standard support"],
  },
  PRO: {
    name: "Pro",
    credits: 100,
    price: 19.99,
    features: ["100 AI credits per month", "Advanced trading signals", "Multiple broker connections", "Priority support", "Advanced analytics", "Strategy customization"],
  },
} as const;

// Credit Purchase Options
export const CREDIT_PACKAGES = {
  SMALL: {
    credits: 20,
    price: 4.4, // €0.22 per credit
  },
  MEDIUM: {
    credits: 50,
    price: 11.0, // €0.22 per credit
  },
  LARGE: {
    credits: 100,
    price: 22.0, // €0.22 per credit
  },
  PRO_SMALL: {
    credits: 20,
    price: 2.2, // €0.11 per credit (Pro user price)
  },
  PRO_MEDIUM: {
    credits: 50,
    price: 5.5, // €0.11 per credit (Pro user price)
  },
  PRO_LARGE: {
    credits: 100,
    price: 11.0, // €0.11 per credit (Pro user price)
  },
} as const;

// Stripe Product and Price IDs (to be created in Stripe dashboard)
export const STRIPE_IDS = {
  PRODUCTS: {
    PRO_SUBSCRIPTION: "prod_pro_subscription",
    CREDIT_PACKAGE: "prod_credit_package",
  },
  PRICES: {
    PRO_SUBSCRIPTION_MONTHLY: "price_pro_subscription_monthly",
    CREDIT_SMALL: "price_credit_small",
    CREDIT_MEDIUM: "price_credit_medium",
    CREDIT_LARGE: "price_credit_large",
    PRO_CREDIT_SMALL: "price_pro_credit_small",
    PRO_CREDIT_MEDIUM: "price_pro_credit_medium",
    PRO_CREDIT_LARGE: "price_pro_credit_large",
  },
} as const;
