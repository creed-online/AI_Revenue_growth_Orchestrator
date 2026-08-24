import express from "express";
import { validateCampaignPolicy } from "../services/policyEngine.js";

const router = express.Router();

/**
 * POST /api/policy-check
 * Validates a campaign proposal against merchant policy guardrails.
 */
router.post("/policy-check", async (req, res) => {
  try {
    const body = req.body || {};
    const proposal = body.proposal || body;

    if (!proposal) {
      return res.status(400).json({
        error: "Missing campaign proposal",
        message: "Send a proposal payload with merchantId, discountPercent, audienceSize and budget.",
      });
    }

    const result = await validateCampaignPolicy(proposal);
    return res.json(result);
  } catch (error) {
    console.error("Error validating campaign policy:", error);
    return res.status(500).json({ error: "Failed to validate campaign policy" });
  }
});

export default router;
