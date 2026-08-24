import express from "express";
import { scanReplenishmentOpportunities } from "../services/opportunityEngine.js";

const router = express.Router();

/**
 * GET /api/opportunities?merchantId=1
 * Returns a ranked list of replenishment opportunities for the merchant —
 * one entry per product, grouped from all currently-due customers.
 */
router.get("/", async (req, res) => {
  try {
    const merchantId = parseInt(req.query.merchantId, 10) || 1;
    const opportunities = await scanReplenishmentOpportunities(merchantId);
    res.json({ merchantId, count: opportunities.length, opportunities });
  } catch (error) {
    console.error("Error scanning opportunities:", error);
    res.status(500).json({ error: "Failed to scan opportunities" });
  }
});

export default router;