// src/routes/razorpay-execution-route.js
import express from "express";
import { executeCampaign } from "../services/razorpayService.js";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

// POST /api/campaigns/:id/execute
// Separate human action from approval — only works if status === "approved"
router.post("/:id/execute", async (req, res) => {
  const result = await executeCampaign(req.params.id);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// GET /api/campaigns/:id/audit-trail
router.get("/:id/audit-trail", async (req, res) => {
  const campaignId = Number(req.params.id);
  const logs = await prisma.auditLog.findMany({
    where: { entityType: "Campaign", entityId: campaignId },
    orderBy: { timestamp: "asc" },
  });
  res.json(logs);
});

export default router;