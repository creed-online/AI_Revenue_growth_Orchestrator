import express from "express";
import { simulateCampaign } from "../services/campaignSimulator.js";
import { requireMerchantAccess } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/simulate-campaign
 * Evaluates expected business impact for 0%, 5%, and 10% campaign offers.
 */
router.post("/simulate-campaign", requireMerchantAccess, async (req, res) => {
  try {
    const { opportunity, audience } = req.body || {};

    if (!opportunity) {
      return res.status(400).json({
        error: "Missing opportunity payload",
        message: "Provide an opportunity object with a product and customer context.",
      });
    }

    const result = simulateCampaign({ opportunity, audience });
    return res.json(result);
  } catch (error) {
    console.error("Error simulating campaign:", error);
    return res.status(500).json({ error: "Failed to simulate campaign" });
  }
});

export default router;
