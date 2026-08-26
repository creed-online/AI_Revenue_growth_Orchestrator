import express from "express";
import { scanReplenishmentOpportunities } from "../services/opportunityEngine.js";
import { requireMerchantAccess, resolveMerchantId } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/opportunities
 * Returns a ranked list of replenishment opportunities for the merchant.
 * Works in demo mode (x-demo-mode: true) without authentication.
 */
router.get("/", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const opportunities = await scanReplenishmentOpportunities(merchantId);
    res.json({ merchantId, count: opportunities.length, opportunities });
  } catch (error) {
    console.error("Error scanning opportunities:", error);
    res.status(500).json({ error: "Failed to scan opportunities" });
  }
});

/**
 * GET /api/opportunities/:productId — single opportunity by productId
 */
router.get("/:productId", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const productId = Number(req.params.productId);
    const opportunities = await scanReplenishmentOpportunities(merchantId);
    const index = opportunities.findIndex((o) => o.productId === productId);
    if (index < 0) return res.status(404).json({ error: "not_found" });
    res.json({ merchantId, index, opportunity: opportunities[index] });
  } catch (error) {
    console.error("Error fetching opportunity:", error);
    res.status(500).json({ error: "Failed to fetch opportunity" });
  }
});

export default router;
