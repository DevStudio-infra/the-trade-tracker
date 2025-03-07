import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.get("/protected", requireAuth, (req, res) => {
  res.json({
    message: "This is a protected route",
    // @ts-ignore
    userId: req.userId,
  });
});

export default router;
