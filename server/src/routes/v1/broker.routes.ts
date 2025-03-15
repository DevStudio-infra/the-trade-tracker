import { Router } from "express";
import { validateAuth, AuthenticatedRequest } from "../../middleware/auth.middleware";
import { BrokerService } from "../../services/broker/broker.service";
import { createLogger } from "../../utils/logger";

const router = Router();
const logger = createLogger("broker-routes");
const brokerService = new BrokerService();

// Get all broker connections
router.get("/connections", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const connections = await brokerService.getConnections(userId);
    res.json(connections);
  } catch (error) {
    logger.error({
      message: "Error fetching broker connections",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to fetch broker connections" });
  }
});

// Add new broker connection
router.post("/connect", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { broker_name, credentials, description } = req.body;

    if (!credentials?.apiKey || !credentials?.identifier || !credentials?.password) {
      return res.status(400).json({ error: "Missing required credentials" });
    }

    const connection = await brokerService.addConnection(
      userId,
      broker_name,
      {
        apiKey: credentials.apiKey,
        identifier: credentials.identifier,
        password: credentials.password,
      },
      description
    );

    res.json(connection);
  } catch (error) {
    logger.error({
      message: "Error adding broker connection",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to add broker connection" });
  }
});

// Update broker connection
router.patch("/connections/:connectionId", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { connectionId } = req.params;
    const { is_active, credentials } = req.body;

    const connection = await brokerService.updateConnection(userId, connectionId, {
      is_active,
      credentials,
    });

    res.json(connection);
  } catch (error) {
    logger.error({
      message: "Error updating broker connection",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to update broker connection" });
  }
});

// Delete broker connection
router.delete("/connections/:connectionId", validateAuth, async (req, res) => {
  try {
    const { userId } = (req as AuthenticatedRequest).auth;
    const { connectionId } = req.params;

    await brokerService.deleteConnection(userId, connectionId);
    res.json({ success: true });
  } catch (error) {
    logger.error({
      message: "Error deleting broker connection",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to delete broker connection" });
  }
});

// Validate broker connection
router.post("/connections/:connectionId/validate", validateAuth, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const isValid = await brokerService.validateConnection(connectionId);

    res.json({ isValid });
  } catch (error) {
    logger.error({
      message: "Error validating broker connection",
      error: error instanceof Error ? error.message : "Unknown error",
    });
    res.status(500).json({ error: "Failed to validate broker connection" });
  }
});

export default router;
