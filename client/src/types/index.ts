export interface UserSubscriptionPlan {
  isPaid: boolean;
  isCanceled?: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: string;
}
