import { Router } from "express";
import { validateAuth, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { StripeService } from "../../services/stripe/stripe.service";
import { createLogger } from "../../utils/logger";

const router = Router();
const logger = createLogger("subscription-routes");
const stripeService = new StripeService();

// Create subscription checkout session
router.post("/checkout", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { url } = await stripeService.createSubscriptionCheckout(userId);
    res.json({ url });
  } catch (error) {
    logger.error({
      message: "Error creating subscription checkout",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Create credit purchase checkout session
router.post("/credits/checkout", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { packageType } = req.body;
    const { url } = await stripeService.createCreditPurchaseCheckout(userId, packageType);
    res.json({ url });
  } catch (error) {
    logger.error({
      message: "Error creating credit purchase checkout",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Handle Stripe webhooks
router.post("/webhook", async (req, res) => {
  try {
    await stripeService.handleWebhookEvent(req.body);
    res.json({ received: true });
  } catch (error) {
    logger.error({
      message: "Error handling webhook",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(400).json({ error: "Webhook error" });
  }
});

export default router;
