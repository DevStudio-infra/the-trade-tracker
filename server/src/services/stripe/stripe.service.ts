import { stripe, STRIPE_IDS, SUBSCRIPTION_PLANS, CREDIT_PACKAGES } from "../../config/stripe.config";
import { prisma } from "../../lib/prisma";
import { createLogger } from "../../utils/logger";

const logger = createLogger("stripe-service");

export class StripeService {
  // Create a checkout session for subscription
  async createSubscriptionCheckout(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscription_plan: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.subscription_plan === "Pro") {
        throw new Error("User already has a Pro subscription");
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: STRIPE_IDS.PRICES.PRO_SUBSCRIPTION_MONTHLY,
            quantity: 1,
          },
        ],
        success_url: `${process.env.CLIENT_URL}/settings/subscription?success=true`,
        cancel_url: `${process.env.CLIENT_URL}/settings/subscription?canceled=true`,
        metadata: {
          userId,
          type: "subscription",
        },
      });

      return { url: session.url };
    } catch (error) {
      logger.error({
        message: "Error creating subscription checkout",
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });
      throw error;
    }
  }

  // Create a checkout session for credit purchase
  async createCreditPurchaseCheckout(userId: string, packageType: keyof typeof CREDIT_PACKAGES) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { subscription_plan: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const isPro = user.subscription_plan === "Pro";
      const key = packageType as keyof typeof CREDIT_PACKAGES;
      let priceId = (isPro ? "PRO_CREDIT_SMALL" : "CREDIT_SMALL") as keyof typeof STRIPE_IDS.PRICES;

      if (key === "MEDIUM") {
        priceId = (isPro ? "PRO_CREDIT_MEDIUM" : "CREDIT_MEDIUM") as keyof typeof STRIPE_IDS.PRICES;
      } else if (key === "LARGE") {
        priceId = (isPro ? "PRO_CREDIT_LARGE" : "CREDIT_LARGE") as keyof typeof STRIPE_IDS.PRICES;
      }

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price: STRIPE_IDS.PRICES[priceId],
            quantity: 1,
          },
        ],
        success_url: `${process.env.CLIENT_URL}/settings/credits?success=true`,
        cancel_url: `${process.env.CLIENT_URL}/settings/credits?canceled=true`,
        metadata: {
          userId,
          type: "credit_purchase",
          packageType,
          credits: CREDIT_PACKAGES[packageType].credits.toString(),
        },
      });

      return { url: session.url };
    } catch (error) {
      logger.error({
        message: "Error creating credit purchase checkout",
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
        packageType,
      });
      throw error;
    }
  }

  // Handle successful subscription payment
  async handleSubscriptionPaid(session: any) {
    const { userId } = session.metadata;

    try {
      // Update user subscription and credits
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscription_plan: "Pro",
          credits: {
            increment: SUBSCRIPTION_PLANS.PRO.credits,
          },
        },
      });

      // Log the credit transaction
      await prisma.creditTransaction.create({
        data: {
          userId,
          creditsUsed: -SUBSCRIPTION_PLANS.PRO.credits, // Negative for credit addition
          action: "subscription_renewal",
          balanceBefore: 0, // Will be calculated in the transaction
          balanceAfter: SUBSCRIPTION_PLANS.PRO.credits,
          metadata: {
            source: "subscription",
            plan: "Pro",
          },
        },
      });

      logger.info({
        message: "Subscription payment processed successfully",
        userId,
      });
    } catch (error) {
      logger.error({
        message: "Error processing subscription payment",
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });
      throw error;
    }
  }

  // Handle successful credit purchase
  async handleCreditPurchase(session: any) {
    const { userId, packageType, credits } = session.metadata;
    const creditsToAdd = parseInt(credits, 10);

    try {
      // Get current user credits
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Update user credits
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          credits: {
            increment: creditsToAdd,
          },
        },
      });

      // Log the credit transaction
      await prisma.creditTransaction.create({
        data: {
          userId,
          creditsUsed: -creditsToAdd, // Negative for credit addition
          action: "credit_purchase",
          balanceBefore: user.credits,
          balanceAfter: updatedUser.credits,
          metadata: {
            packageType,
            amount: CREDIT_PACKAGES[packageType as keyof typeof CREDIT_PACKAGES].price,
          },
        },
      });

      // Create credit purchase record
      await prisma.creditPurchase.create({
        data: {
          userId,
          amount: creditsToAdd,
          cost: CREDIT_PACKAGES[packageType as keyof typeof CREDIT_PACKAGES].price,
          paymentId: session.payment_intent,
          status: "completed",
        },
      });

      logger.info({
        message: "Credit purchase processed successfully",
        userId,
        credits: creditsToAdd,
      });
    } catch (error) {
      logger.error({
        message: "Error processing credit purchase",
        error: error instanceof Error ? error.message : "Unknown error",
        userId,
      });
      throw error;
    }
  }

  // Handle webhook events from Stripe
  async handleWebhookEvent(event: any) {
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object;
          if (session.metadata.type === "subscription") {
            await this.handleSubscriptionPaid(session);
          } else if (session.metadata.type === "credit_purchase") {
            await this.handleCreditPurchase(session);
          }
          break;
        }
        // Add more event handlers as needed
      }
    } catch (error) {
      logger.error({
        message: "Error handling webhook event",
        error: error instanceof Error ? error.message : "Unknown error",
        eventType: event.type,
      });
      throw error;
    }
  }
}
