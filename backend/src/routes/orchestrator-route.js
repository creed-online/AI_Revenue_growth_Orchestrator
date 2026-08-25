import express from "express";
import orchestrator from "../services/orchestrator.js";

const router = express.Router();

/**
 * POST /api/orchestrator/run
 * body: { merchantId?, opportunityIndex? }
 */
router.post("/orchestrator/run", async (req, res) => {
  try {
    const merchantId = parseInt(req.body.merchantId, 10) || 1;
    const opportunityIndex = parseInt(req.body.opportunityIndex, 10) || 0;

    const result = await orchestrator.orchestrateCampaign({ merchantId, opportunityIndex });
    res.json(result);
  } catch (err) {
    console.error("Orchestrator error:", err);
    res.status(500).json({ error: "orchestrator_failed", message: err.message });
  }
});

export default router;
