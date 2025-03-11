import { prisma } from "../../lib/prisma";
import { createLogger } from "../../utils/logger";
import { WebhookEvent } from "@clerk/backend";
import { createClerkClient } from "@clerk/backend";

const logger = createLogger("clerk-webhook-service");
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export class ClerkWebhookService {
  async handleWebhook(evt: WebhookEvent) {
    const eventType = evt.type;

    logger.info({
      message: "Received webhook event",
      eventType,
      data: evt.data,
    });

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
        case "session.created":
          await this.handleSessionCreated(evt.data);
          break;
        case "session.ended":
          await this.handleSessionEnded(evt.data);
          break;
        case "email.created":
          await this.handleEmailCreated(evt.data);
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
        data: evt.data,
      });
      throw error;
    }
  }

  private async handleUserCreated(data: any) {
    const { id, email_addresses, created_at } = data;

    logger.info({
      message: "Processing user creation",
      userId: id,
      emailAddresses: email_addresses,
      primaryEmailId: data.primary_email_address_id,
    });

    const primaryEmail = email_addresses.find((email: any) => email.id === data.primary_email_address_id);

    if (!primaryEmail?.email_address) {
      logger.error({
        message: "No primary email found",
        userId: id,
        emailAddresses: email_addresses,
        primaryEmailId: data.primary_email_address_id,
      });
      throw new Error("No primary email address found");
    }

    try {
      logger.info({
        message: "Attempting to create user in database",
        userId: id,
        email: primaryEmail.email_address,
        created_at: created_at,
      });

      const user = await prisma.user.create({
        data: {
          id,
          email: primaryEmail.email_address,
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
        email: primaryEmail.email_address,
        dbUser: user,
      });
    } catch (error) {
      logger.error({
        message: "Error creating user in database",
        error: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined,
        userId: id,
        email: primaryEmail.email_address,
      });
      throw error;
    }
  }

  private async handleUserUpdated(data: any) {
    const { id, email_addresses, updated_at } = data;

    try {
      // Get the primary email if it exists
      const primaryEmail = email_addresses?.find((email: any) => email.id === data.primary_email_address_id);

      await prisma.user.update({
        where: { id },
        data: {
          ...(primaryEmail?.email_address && { email: primaryEmail.email_address }),
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

  private async handleSessionCreated(data: any) {
    const { user_id } = data;

    try {
      // First check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id: user_id },
      });

      if (!existingUser) {
        // User doesn't exist, fetch user data from Clerk and create them
        const clerkUser = await clerk.users.getUser(user_id);
        const primaryEmail = clerkUser.emailAddresses.find((email: { id: string }) => email.id === clerkUser.primaryEmailAddressId);

        if (!primaryEmail?.emailAddress) {
          throw new Error("No primary email found for user");
        }

        // Create the user
        await prisma.user.create({
          data: {
            id: user_id,
            email: primaryEmail.emailAddress,
            subscription_plan: "Free",
            credits: 10, // Starting credits for new users
            onboarding_step: 1,
            onboarding_completed: false,
            is_active: true,
            created_at: new Date(clerkUser.createdAt),
            updated_at: new Date(),
            last_login: new Date(),
          },
        });

        logger.info({
          message: "Created new user on session creation",
          userId: user_id,
          email: primaryEmail.emailAddress,
        });
      } else {
        // User exists, just update last_login
        await prisma.user.update({
          where: { id: user_id },
          data: {
            last_login: new Date(),
            updated_at: new Date(),
          },
        });

        logger.info({
          message: "User last login updated",
          userId: user_id,
        });
      }
    } catch (error) {
      logger.error({
        message: "Error handling session creation",
        error: error instanceof Error ? error.message : "Unknown error",
        userId: user_id,
      });
      throw error;
    }
  }

  private async handleSessionEnded(data: any) {
    // We don't need to do anything when a session ends
    logger.info({
      message: "Session ended - no action needed",
      sessionId: data.id,
      userId: data.user_id,
    });
  }

  private async handleEmailCreated(data: any) {
    const { user_id, email_address } = data;

    try {
      // Only update the user's email if they don't have one yet
      const user = await prisma.user.findUnique({
        where: { id: user_id },
        select: { email: true },
      });

      if (!user?.email) {
        await prisma.user.update({
          where: { id: user_id },
          data: {
            email: email_address,
            updated_at: new Date(),
          },
        });

        logger.info({
          message: "User email updated",
          userId: user_id,
          email: email_address,
        });
      }
    } catch (error) {
      logger.error({
        message: "Error updating user email",
        error: error instanceof Error ? error.message : "Unknown error",
        userId: user_id,
      });
      throw error;
    }
  }
}
