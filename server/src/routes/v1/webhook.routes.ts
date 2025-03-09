import { Router } from "express";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/backend";
import { ClerkWebhookService } from "../../services/clerk/webhook.service";
import { createLogger } from "../../utils/logger";

const router = Router();
const logger = createLogger("webhook-routes");
const webhookService = new ClerkWebhookService();

// Clerk webhook endpoint
router.post("/clerk", async (req, res) => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new Error("Missing CLERK_WEBHOOK_SECRET");
    }

    // Get the headers
    const svix_id = req.headers["svix-id"] as string;
    const svix_timestamp = req.headers["svix-timestamp"] as string;
    const svix_signature = req.headers["svix-signature"] as string;

    // If there are missing headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({
        error: "Missing required Svix headers",
      });
    }

    // Create a new Svix instance with your secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: WebhookEvent;

    try {
      evt = wh.verify(JSON.stringify(req.body), {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      logger.error({
        message: "Error verifying webhook",
        error: err instanceof Error ? err.message : "Unknown error",
      });
      return res.status(400).json({
        error: "Invalid webhook signature",
      });
    }

    await webhookService.handleWebhook(evt);

    res.json({ success: true });
  } catch (error) {
    logger.error({
      message: "Error handling webhook",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
