import express from "express";
import {
  listCampaigns,
  getCampaignById,
  getCampaignResults,
  measureCampaignResults,
} from "../services/campaignService.js";
import { executeCampaign } from "../services/razorpayService.js";
import { sendSimulatedNotifications } from "../services/notificationService.js";
import { resolveMerchantId } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

// GET /api/campaigns?merchantId=1&status=running
router.get("/", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const status = req.query.status || undefined;
    const campaigns = await listCampaigns(merchantId, status);
    res.json({ merchantId, count: campaigns.length, campaigns });
  } catch (error) {
    console.error("Error listing campaigns:", error);
    res.status(500).json({ error: "Failed to list campaigns" });
  }
});

// GET /api/campaigns/:id
router.get("/:id", async (req, res) => {
  try {
    const campaign = await getCampaignById(req.params.id);
    if (!campaign) return res.status(404).json({ error: "not_found" });
    if (req.user?.merchantId && campaign.merchantId !== req.user.merchantId) {
      return res.status(403).json({ error: "forbidden" });
    }
    res.json(campaign);
  } catch (error) {
    console.error("Error fetching campaign:", error);
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

// GET /api/campaigns/:id/results
router.get("/:id/results", async (req, res) => {
  try {
    const payload = await getCampaignResults(req.params.id);
    if (payload.error) return res.status(404).json(payload);
    res.json(payload);
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ error: "Failed to fetch campaign results" });
  }
});

// POST /api/campaigns/:id/measure — simulate actual outcomes
router.post("/:id/measure", async (req, res) => {
  try {
    const payload = await measureCampaignResults(req.params.id);
    if (payload.error) return res.status(400).json(payload);
    res.json(payload);
  } catch (error) {
    console.error("Error measuring results:", error);
    res.status(500).json({ error: "Failed to measure campaign results" });
  }
});

// POST /api/campaigns/:id/execute
router.post("/:id/execute", async (req, res) => {
  const result = await executeCampaign(req.params.id);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// POST /api/campaigns/:id/notify
router.post("/:id/notify", async (req, res) => {
  const channel = req.body?.channel || "email";
  const result = await sendSimulatedNotifications({
    campaignId: req.params.id,
    channel,
  });
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
