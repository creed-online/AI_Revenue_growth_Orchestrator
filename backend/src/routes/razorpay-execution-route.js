// src/routes/razorpay-execution-route.js
import express from "express";
import { executeCampaign } from "../services/razorpayService.js";
import { sendSimulatedNotifications } from "../services/notificationService.js";
import { prisma } from "../lib/prisma.js";
import { requireMerchantAccess } from "../middleware/auth.js";

const router = express.Router();

// POST /api/campaigns/:id/execute
// Separate human action from approval — only works if status === "approved"
router.post("/:id/execute", requireMerchantAccess, async (req, res) => {
  const result = await executeCampaign(req.params.id);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// POST /api/campaigns/:id/notify
// Generates AI notification copy per customer and stores simulated sends.
// Only works if status === "running" (i.e. already executed).
// Optional body: { channel: "email" | "sms" | "whatsapp" } — defaults to "email".
router.post("/:id/notify", requireMerchantAccess, async (req, res) => {
  const channel = req.body?.channel || "email";
  const result = await sendSimulatedNotifications({ campaignId: req.params.id, channel });
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// GET /api/campaigns/:id/audit-trail
router.get("/:id/audit-trail", requireMerchantAccess, async (req, res) => {
  const campaignId = Number(req.params.id);
  const logs = await prisma.auditLog.findMany({
    where: { entityType: "Campaign", entityId: campaignId, merchantId: req.merchantId },
    orderBy: { timestamp: "asc" },
  });
  res.json(logs);
});

export default router;