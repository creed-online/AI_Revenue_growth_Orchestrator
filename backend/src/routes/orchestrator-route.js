import express from "express";
import orchestrator from "../services/orchestrator.js";
import { requireMerchantAccess } from "../middleware/auth.js";

const router = express.Router();

/**
 * POST /api/orchestrator/run
 * body: { opportunityIndex? }
 */
router.post("/orchestrator/run", requireMerchantAccess, async (req, res) => {
  try {
    const opportunityIndex = parseInt(req.body.opportunityIndex, 10) || 0;

    const result = await orchestrator.orchestrateCampaign({ merchantId: req.merchantId, opportunityIndex });
    res.json(result);
  } catch (err) {
    console.error("Orchestrator error:", err);
    res.status(500).json({ error: "orchestrator_failed", message: err.message });
  }
});

export default router;
