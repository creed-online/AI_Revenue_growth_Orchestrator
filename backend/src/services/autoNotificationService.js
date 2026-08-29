import { prisma } from "../lib/prisma.js";
import { callModel, PROVIDER } from "../config/aiClient.js";
import { sendRealEmail, isRealEmail } from "./emailService.js";

/**
 * Determines if a customer should be notified based on their preferences and history
 */
export function shouldNotify(customer, prefs) {
  const frequency = prefs.frequency || "weekly";
  const lastNotified = customer.lastNotifiedAt ? new Date(customer.lastNotifiedAt) : null;
  const notificationCount = customer.notificationCount || 0;

  if (!lastNotified) return true;

  const now = new Date();
  const daysSinceLastNotification = (now - lastNotified) / (1000 * 60 * 60 * 24);

  switch (frequency) {
    case "daily":
      return daysSinceLastNotification >= 1;
    case "weekly":
      return daysSinceLastNotification >= 7;
    case "monthly":
      return daysSinceLastNotification >= 30;
    default:
      return daysSinceLastNotification >= 7;
  }
}

/**
 * Checks if current time falls within quiet hours
 */
export function isInQuietHours(prefs) {
  const quietHoursStart = prefs.quietHoursStart ?? 22;
  const quietHoursEnd = prefs.quietHoursEnd ?? 8;
  const now = new Date();
  const currentHour = now.getHours();

  if (quietHoursStart < quietHoursEnd) {
    return currentHour >= quietHoursStart && currentHour < quietHoursEnd;
  } else {
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd;
  }
}

/**
 * Sends an automated replenishment email to a customer
 */
export async function sendAutomatedReplenishmentEmail({
  customerId,
  customerName,
  customerEmail,
  productName,
  productPrice,
  discountPercent,
  merchantId,
}) {
  const system = `You write short, warm marketing notification copy for an e-commerce replenishment campaign. Do NOT invent or change the discount percentage, product, or any numbers — use exactly what is given. Keep it concise: one subject line, one short body (2-3 sentences), one call-to-action phrase.`;

  const user = `Write an email notification for customer "${customerName}" about replenishing their ${productName}. Discount offered: ${discountPercent}%. Product price: ₹${productPrice}. Respond ONLY as JSON: {"subject": "...", "body": "...", "cta": "..."}`;

  const resp = await callModel({
    system,
    messages: [{ role: "user", content: user }],
    tools: [],
  });

  let copy;
  try {
    const cleaned = resp.text.replace(/```json|```/g, "").trim();
    copy = JSON.parse(cleaned);
  } catch {
    copy = {
      subject: `Time to restock ${productName}!`,
      body: `Hi ${customerName}, it looks like you're running low on ${productName}. We're offering ${discountPercent}% off to help you restock.`,
      cta: "Claim Offer",
    };
  }

  const send = await prisma.notificationSend.create({
    data: {
      campaignId: 0,
      customerId,
      channel: "email",
      subject: copy.subject ?? null,
      body: copy.body,
      cta: copy.cta ?? null,
    },
  });

  if (customerEmail && isRealEmail(customerEmail)) {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2dd4a8;">${copy.subject || "Your Replenishment Offer"}</h2>
        <p>${copy.body}</p>
        <p><a href="#" style="background: #2dd4a8; color: #070b12; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">${copy.cta || "Claim Offer"}</a></p>
        <hr style="margin: 20px 0; border-color: #1c2a3d;" />
        <p style="font-size: 12px; color: #8b9bb4;">AI Revenue Growth Orchestrator</p>
      </div>
    `;
    const textBody = `${copy.subject || "Your Replenishment Offer"}\n\n${copy.body}\n\n${copy.cta || "Claim Offer"}`;

    const emailResult = await sendRealEmail({
      to: customerEmail,
      subject: copy.subject || `Your ${discountPercent}% Replenishment Offer`,
      text: textBody,
      html: htmlBody,
    });

    send.emailSent = emailResult.success;
    send.emailError = emailResult.error || null;
  } else {
    send.emailSent = false;
    send.emailError = customerEmail ? "demo_email" : "no_email";
  }

  return send;
}

export default { shouldNotify, isInQuietHours, sendAutomatedReplenishmentEmail };