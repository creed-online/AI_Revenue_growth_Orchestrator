// src/services/notificationService.js
import crypto from "crypto";
import { callModel, PROVIDER } from "../config/aiClient.js";
import { prisma } from "../lib/prisma.js";
import { sendRealEmail } from "./emailService.js";
import { renderMarketingEmail } from "./emailTemplateEngine.js";

/**
 * Generates a collision-resistant tracking token for email open & click attribution.
 */
function generateTrackingToken(campaignId, customerId) {
  const salt = crypto.randomBytes(4).toString("hex");
  return `trk_${campaignId}_${customerId}_${Date.now().toString(36)}_${salt}`;
}

/**
 * Generates personalized notification copy via AI, embeds tracking tags & pixels,
 * and dispatches emails to the target audience.
 */
export async function sendSimulatedNotifications({ campaignId, channel = "email" }) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: Number(campaignId) },
    include: { merchant: true },
  });

  if (!campaign) return { error: "not_found" };
  console.log(`[Notify] Campaign ${campaignId} (${campaign.name}) status: ${campaign.status}`);

  if (campaign.status !== "running" && campaign.status !== "completed") {
    return {
      error: "not_executed",
      status: campaign.status,
      message: "Campaign must be running (executed) before notifications can be dispatched.",
    };
  }

  const customerIds = campaign.customerIds || [];
  let customers = [];

  if (Array.isArray(customerIds) && customerIds.length > 0) {
    customers = await prisma.customer.findMany({
      where: { id: { in: customerIds.map(Number) } },
    });
  }

  // Fallback: If no stored customerIds, select top audience for the merchant
  if (customers.length === 0) {
    customers = await prisma.customer.findMany({
      where: { merchantId: campaign.merchantId },
      take: Math.max(campaign.audienceSize || 10, 1),
    });
  }

  if (customers.length === 0) {
    return { error: "no_audience", message: "No target customers found for this campaign" };
  }

  console.log(`[Notify] Processing ${customers.length} recipients for Campaign ${campaign.id}...`);

  const merchantName = campaign.merchant?.name || "RakshFit Nutrition";
  const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  // 1. Generate high-converting AI marketing copy once for the campaign
  const system = `You write short, persuasive marketing notification copy for an e-commerce campaign. Do NOT invent numbers — use exactly the discount provided. Keep it concise: one engaging subject line, one 2-sentence body, and one short call-to-action phrase.`;
  const user = `Write a personalized ${channel} message for campaign "${campaign.name}". Offer: ${campaign.offerValue || 10}% OFF. Respond ONLY as valid JSON: {"subject": "...", "body": "...", "cta": "..."}`;

  let copy = {
    subject: `Exclusive ${campaign.offerValue || 10}% OFF — ${campaign.name}`,
    body: `We have unlocked a special ${campaign.offerValue || 10}% discount on your next order. Don't miss out on your member benefits.`,
    cta: `Claim ${campaign.offerValue || 10}% OFF Now`,
  };

  try {
    const resp = await callModel({
      system,
      messages: [{ role: "user", content: user }],
      tools: [],
    });

    if (resp?.text) {
      const cleaned = resp.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.body) {
        copy = {
          subject: parsed.subject || copy.subject,
          body: parsed.body,
          cta: parsed.cta || copy.cta,
        };
      }
    }
  } catch {
    // Keep default copy on AI parse error
  }

  // 2. Dispatch to recipients in parallel chunks of 5 for maximum throughput & reliability
  const sends = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < customers.length; i += BATCH_SIZE) {
    const batch = customers.slice(i, i + BATCH_SIZE);
    const batchPromises = batch.map(async (customer) => {
      const trackingToken = generateTrackingToken(campaign.id, customer.id);

      const { html, text, promoCode, clickTrackingUrl, openTrackingUrl } = renderMarketingEmail({
        customerName: customer.name || "Valued Customer",
        subject: copy.subject,
        body: copy.body,
        ctaText: copy.cta,
        discountPercent: campaign.offerValue || 10,
        trackingToken,
        merchantName,
        targetUrl: `${frontendUrl}?campaign=${campaign.id}&token=${trackingToken}`,
        baseUrl,
      });

      let emailSent = false;
      let emailError = null;
      let previewUrl = null;

      if (channel === "email" && customer.email) {
        const emailResult = await sendRealEmail({
          to: customer.email,
          subject: copy.subject,
          text,
          html,
          trackingToken,
        });

        emailSent = emailResult.success;
        emailError = emailResult.error || null;
        previewUrl = emailResult.previewUrl || null;
      } else {
        emailSent = true;
      }

      // Persist to NotificationSend
      const sendRecord = await prisma.notificationSend.create({
        data: {
          campaignId: campaign.id,
          customerId: customer.id,
          channel,
          subject: copy.subject,
          body: copy.body,
          cta: copy.cta,
          emailSent,
          emailError,
          trackingToken,
          sentAt: new Date(),
        },
      });

      return {
        ...sendRecord,
        customerEmail: customer.email,
        customerName: customer.name,
        promoCode,
        clickTrackingUrl,
        openTrackingUrl,
        previewUrl,
      };
    });

    const batchResults = await Promise.all(batchPromises);
    sends.push(...batchResults);
  }

  // Record AuditLog
  await prisma.auditLog.create({
    data: {
      merchantId: campaign.merchantId,
      actor: "system",
      action: "notifications_dispatched",
      entityType: "Campaign",
      entityId: campaign.id,
      inputSummary: `Dispatched ${sends.length} ${channel} notifications with tracking tokens.`,
      executionResult: JSON.stringify({ sentCount: sends.length, channel }),
    },
  });

  return {
    provider: PROVIDER,
    campaignId: campaign.id,
    sentCount: sends.length,
    channel,
    notifications: sends,
  };
}

/**
 * List all sent notifications and tracking tokens for a campaign.
 */
export async function getCampaignNotifications(campaignId) {
  const notifications = await prisma.notificationSend.findMany({
    where: { campaignId: Number(campaignId) },
    include: { customer: true },
    orderBy: { sentAt: "asc" },
  });

  const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  return notifications.map((n) => ({
    id: n.id,
    campaignId: n.campaignId,
    customerId: n.customerId,
    customerName: n.customer?.name || "Customer",
    customerEmail: n.customer?.email || "",
    channel: n.channel,
    subject: n.subject,
    body: n.body,
    cta: n.cta,
    trackingToken: n.trackingToken,
    emailSent: n.emailSent,
    openedAt: n.openedAt,
    clickedAt: n.clickedAt,
    openCount: n.openCount,
    clickCount: n.clickCount,
    sentAt: n.sentAt,
    openUrl: n.trackingToken ? `${baseUrl}/api/track/open/${n.trackingToken}` : null,
    clickUrl: n.trackingToken
      ? `${baseUrl}/api/track/click/${n.trackingToken}?target=${encodeURIComponent(frontendUrl)}`
      : null,
  }));
}

export default { sendSimulatedNotifications, getCampaignNotifications };