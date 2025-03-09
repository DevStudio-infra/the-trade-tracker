import { prisma } from "../../lib/prisma";
import { createLogger } from "../../utils/logger";
import { WebhookEvent } from "@clerk/backend";

const logger = createLogger("clerk-webhook-service");

export class ClerkWebhookService {
  async handleWebhook(evt: WebhookEvent) {
    const eventType = evt.type;

    try {
      switch (eventType) {
        case "user.created":
          await this.handleUserCreated(evt.data);
          break;
        case "user.updated":
          await this.handleUserUpdated(evt.data);
          break;
        case "user.deleted":
          await this.handleUserDeleted(evt.data);
          break;
        default:
          logger.info({
            message: "Unhandled webhook event",
            eventType,
          });
      }
    } catch (error) {
      logger.error({
        message: "Error handling webhook event",
        error: error instanceof Error ? error.message : "Unknown error",
        eventType,
      });
      throw error;
    }
  }

  private async handleUserCreated(data: any) {
    const { id, email_addresses, created_at } = data;
    const primaryEmail = email_addresses.find((email: any) => email.id === data.primary_email_address_id);

    try {
      await prisma.user.create({
        data: {
          id,
          subscription_plan: "Free",
          credits: 10, // Starting credits for new users
          onboarding_step: 1,
          onboarding_completed: false,
          is_active: true,
          created_at: new Date(created_at),
          updated_at: new Date(),
        },
      });

      logger.info({
        message: "User created in database",
        userId: id,
        email: primaryEmail?.email_address,
      });
    } catch (error) {
      logger.error({
        message: "Error creating user in database",
        error: error instanceof Error ? error.message : "Unknown error",
        userId: id,
      });
      throw error;
    }
  }

  private async handleUserUpdated(data: any) {
    const { id, updated_at } = data;

    try {
      await prisma.user.update({
        where: { id },
        data: {
          updated_at: new Date(updated_at),
        },
      });

      logger.info({
        message: "User updated in database",
        userId: id,
      });
    } catch (error) {
      logger.error({
        message: "Error updating user in database",
        error: error instanceof Error ? error.message : "Unknown error",
        userId: id,
      });
      throw error;
    }
  }

  private async handleUserDeleted(data: any) {
    const { id } = data;

    try {
      // Instead of hard deleting, we mark the user as inactive
      await prisma.user.update({
        where: { id },
        data: {
          is_active: false,
          updated_at: new Date(),
        },
      });

      logger.info({
        message: "User marked as inactive in database",
        userId: id,
      });
    } catch (error) {
      logger.error({
        message: "Error marking user as inactive in database",
        error: error instanceof Error ? error.message : "Unknown error",
        userId: id,
      });
      throw error;
    }
  }
}
