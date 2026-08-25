// src/services/notificationService.js
import { callModel, PROVIDER } from "../config/aiClient.js";
import { prisma } from "../lib/prisma.js";

/**
 * Generates personalized notification copy via AI for each customer in an
 * approved+executed campaign, then stores the simulated send.
 *
 * IMPORTANT: the model only writes the CONTENT (subject/body/cta wording).
 * The discount %, audience, and budget are already locked by the policy
 * engine at this point — the model never decides those numbers, it just
 * writes persuasive copy around fixed facts we hand it.
 *
 * Campaign.customerIds (added in Day 11 migration) is read back automatically —
 * no need to pass customerIds manually.
 */
export async function sendSimulatedNotifications({ campaignId, channel = "email" }) {
  const campaign = await prisma.campaign.findUnique({ where: { id: Number(campaignId) } });
  if (!campaign) return { error: "not_found" };
  if (campaign.status !== "running") {
    return { error: "not_executed", status: campaign.status, message: "Campaign must be executed before sending notifications" };
  }

  const customerIds = campaign.customerIds || [];
  if (customerIds.length === 0) {
    return { error: "no_audience", message: "Campaign has no stored customerIds" };
  }

  const customers = await prisma.customer.findMany({ where: { id: { in: customerIds } } });

  const sends = [];
  for (const customer of customers) {
    const system = `You write short, warm marketing notification copy for an e-commerce replenishment campaign. Do NOT invent or change the discount percentage, product, or any numbers — use exactly what is given. Keep it concise: one subject line, one short body (2-3 sentences), one call-to-action phrase.`;

    const user = `Write a ${channel} notification for customer "${customer.name}" about replenishing their order. Discount offered: ${campaign.offerValue}%. Product context: campaign "${campaign.name}". Respond ONLY as JSON: {"subject": "...", "body": "...", "cta": "..."} (omit "subject" key entirely for sms/whatsapp).`;

    const resp = await callModel({
      system,
      messages: [{ role: "user", content: user }],
      tools: [], // no tools needed here — plain text generation
    });

    let copy;
    try {
      // strip potential markdown fences before parsing
      const cleaned = resp.text.replace(/```json|```/g, "").trim();
      copy = JSON.parse(cleaned);
    } catch {
      copy = { body: resp.text || "Time to restock! Check out your personalized offer." };
    }

    const send = await prisma.notificationSend.create({
      data: {
        campaignId: campaign.id,
        customerId: customer.id,
        channel,
        subject: copy.subject ?? null,
        body: copy.body,
        cta: copy.cta ?? null,
      },
    });

    sends.push(send);
  }

  return { provider: PROVIDER, campaignId: campaign.id, sentCount: sends.length, sends };
}