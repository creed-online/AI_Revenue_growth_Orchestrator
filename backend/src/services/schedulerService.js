import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { findDueReplenishmentOpportunities } from "./replenishment-intervalService.js";
import { sendAutomatedReplenishmentEmail, shouldNotify, isInQuietHours } from "./autoNotificationService.js";

let schedulerStarted = false;

/**
 * Initialize the automated replenishment notification scheduler
 * Runs every 6 hours to check for due replenishments and send notifications
 */
export function initializeScheduler() {
  if (schedulerStarted) {
    console.log("[Scheduler] Already running");
    return;
  }

  // Run every 6 hours (at minute 0 of hours 0, 6, 12, 18)
  cron.schedule("0 */6 * * *", async () => {
    console.log("[Scheduler] Running replenishment check...");
    await processReplenishmentNotifications();
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata",
  });

  schedulerStarted = true;
  console.log("[Scheduler] Initialized - runs every 6 hours (0, 6, 12, 18) IST");
}

/**
 * Process replenishment notifications for all merchants
 */
async function processReplenishmentNotifications() {
  try {
    const merchants = await prisma.merchant.findMany({
      select: { id: true, businessName: true },
    });

    for (const merchant of merchants) {
      try {
        await processMerchantReplenishments(merchant.id);
      } catch (error) {
        console.error(`[Scheduler] Error processing merchant ${merchant.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Scheduler] Fatal error:", error);
  }
}

/**
 * Process replenishment notifications for a single merchant
 */
async function processMerchantReplenishments(merchantId) {
  // Find all due replenishment opportunities
  const dueOpportunities = await findDueReplenishmentOpportunities(merchantId);

  if (dueOpportunities.length === 0) {
    console.log(`[Scheduler] No due replenishments for merchant ${merchantId}`);
    return;
  }

  // Group by product to send one notification per product per customer
  const byProduct = new Map();

  for (const opp of dueOpportunities) {
    const productId = opp.productId;
    if (!byProduct.has(productId)) {
      byProduct.set(productId, []);
    }
    byProduct.get(productId).push(opp);
  }

  for (const [productId, opportunities] of byProduct) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, price: true, isReplenishable: true, avgCycleDays: true },
    });

    if (!product || !product.isReplenishable) continue;

    // Process each customer for this product
    for (const opp of opportunities) {
      const customerId = opp.customerId;

      // Check if customer wants notifications
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        select: {
          id: true,
          email: true,
          name: true,
          notificationPrefs: true,
          lastNotifiedAt: true,
          notificationCount: true,
        },
      });

      if (!customer) continue;

      // Check notification preferences
      const prefs = customer.notificationPrefs || {
        email: true,
        sms: false,
        whatsapp: false,
        frequency: "weekly",
        quietHoursStart: 22,
        quietHoursEnd: 8,
      };

      if (!prefs.email) continue;

      // Check frequency capping
      if (!shouldNotify(customer, prefs)) continue;

      // Check quiet hours
      if (isInQuietHours(prefs)) continue;

      // Send notification
      try {
        await sendAutomatedReplenishmentEmail({
          customerId,
          customerName: customer.name,
          customerEmail: customer.email,
          productName: product.name,
          productPrice: product.price,
          discountPercent: 10, // Default 10% offer
          merchantId,
        });

        // Update customer notification tracking
        await prisma.customer.update({
          where: { id: customerId },
          data: {
            lastNotifiedAt: new Date(),
            notificationCount: { increment: 1 },
          },
        });

        console.log(`[AutoNotify] Sent replenishment email to ${customer.email} for ${product.name}`);
      } catch (error) {
        console.error(`[AutoNotify] Failed to send to customer ${customerId}:`, error);
      }
    }
  }
}

export { processReplenishmentNotifications, processMerchantReplenishments };
export { shouldNotify, isInQuietHours } from "./autoNotificationService.js";