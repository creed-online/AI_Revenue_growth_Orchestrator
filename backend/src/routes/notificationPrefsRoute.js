import express from "express";
import { prisma } from "../lib/prisma.js";
import { requireMerchantAccess } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/customers/notification-prefs
 * Get notification preferences for the authenticated merchant's customers
 */
router.get("/notification-prefs", requireMerchantAccess, async (req, res) => {
  try {
    const merchantId = req.merchantId;

    // Get all customers with their notification preferences
    const customers = await prisma.customer.findMany({
      where: { merchantId },
      select: {
        id: true,
        name: true,
        email: true,
        notificationPrefs: true,
        lastNotifiedAt: true,
        notificationCount: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Return default preferences for customers who don't have them set
    const customersWithDefaults = customers.map((customer) => ({
      ...customer,
      notificationPrefs: customer.notificationPrefs || {
        email: true,
        sms: false,
        whatsapp: false,
        frequency: "weekly",
        quietHoursStart: 22,
        quietHoursEnd: 8,
      },
    }));

    res.json({ customers: customersWithDefaults });
  } catch (error) {
    console.error("[NotificationPrefs] Error fetching preferences:", error);
    res.status(500).json({ error: "Failed to fetch notification preferences" });
  }
});

/**
 * PUT /api/customers/notification-prefs
 * Update notification preferences for all customers (bulk update) or specific customer
 * Body: { customerId?: number, prefs: { email, sms, whatsapp, frequency, quietHoursStart, quietHoursEnd } }
 */
router.put("/notification-prefs", requireMerchantAccess, async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const { customerId, prefs } = req.body;

    if (!prefs || typeof prefs !== "object") {
      return res.status(400).json({ error: "Invalid preferences object" });
    }

    // Validate preferences
    const validPrefs = {
      email: Boolean(prefs.email),
      sms: Boolean(prefs.sms),
      whatsapp: Boolean(prefs.whatsapp),
      frequency: ["daily", "weekly", "biweekly", "monthly"].includes(prefs.frequency)
        ? prefs.frequency
        : "weekly",
      quietHoursStart: Number.isInteger(prefs.quietHoursStart) && prefs.quietHoursStart >= 0 && prefs.quietHoursStart <= 23
        ? prefs.quietHoursStart
        : 22,
      quietHoursEnd: Number.isInteger(prefs.quietHoursEnd) && prefs.quietHoursEnd >= 0 && prefs.quietHoursEnd <= 23
        ? prefs.quietHoursEnd
        : 8,
    };

    if (customerId) {
      // Update specific customer
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, merchantId },
      });

      if (!customer) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const updated = await prisma.customer.update({
        where: { id: customerId },
        data: { notificationPrefs: validPrefs },
        select: { id: true, name: true, email: true, notificationPrefs: true },
      });

      return res.json({ customer: updated });
    } else {
      // Bulk update all customers for this merchant
      await prisma.customer.updateMany({
        where: { merchantId },
        data: { notificationPrefs: validPrefs },
      });

      return res.json({ success: true, message: "Preferences updated for all customers", prefs: validPrefs });
    }
  } catch (error) {
    console.error("[NotificationPrefs] Error updating preferences:", error);
    res.status(500).json({ error: "Failed to update notification preferences" });
  }
});

/**
 * GET /api/customers/notification-prefs/:customerId
 * Get notification preferences for a specific customer
 */
router.get("/notification-prefs/:customerId", requireMerchantAccess, async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const customerId = parseInt(req.params.customerId, 10);

    if (isNaN(customerId)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, merchantId },
      select: {
        id: true,
        name: true,
        email: true,
        notificationPrefs: true,
        lastNotifiedAt: true,
        notificationCount: true,
      },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json({
      ...customer,
      notificationPrefs: customer.notificationPrefs || {
        email: true,
        sms: false,
        whatsapp: false,
        frequency: "weekly",
        quietHoursStart: 22,
        quietHoursEnd: 8,
      },
    });
  } catch (error) {
    console.error("[NotificationPrefs] Error fetching customer preferences:", error);
    res.status(500).json({ error: "Failed to fetch customer preferences" });
  }
});

/**
 * PUT /api/customers/notification-prefs/:customerId
 * Update notification preferences for a specific customer
 */
router.put("/notification-prefs/:customerId", requireMerchantAccess, async (req, res) => {
  try {
    const merchantId = req.merchantId;
    const customerId = parseInt(req.params.customerId, 10);
    const { prefs } = req.body;

    if (isNaN(customerId)) {
      return res.status(400).json({ error: "Invalid customer ID" });
    }

    if (!prefs || typeof prefs !== "object") {
      return res.status(400).json({ error: "Invalid preferences object" });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, merchantId },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const validPrefs = {
      email: Boolean(prefs.email),
      sms: Boolean(prefs.sms),
      whatsapp: Boolean(prefs.whatsapp),
      frequency: ["daily", "weekly", "biweekly", "monthly"].includes(prefs.frequency)
        ? prefs.frequency
        : "weekly",
      quietHoursStart: Number.isInteger(prefs.quietHoursStart) && prefs.quietHoursStart >= 0 && prefs.quietHoursStart <= 23
        ? prefs.quietHoursStart
        : 22,
      quietHoursEnd: Number.isInteger(prefs.quietHoursEnd) && prefs.quietHoursEnd >= 0 && prefs.quietHoursEnd <= 23
        ? prefs.quietHoursEnd
        : 8,
    };

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: { notificationPrefs: validPrefs },
      select: { id: true, name: true, email: true, notificationPrefs: true },
    });

    res.json({ customer: updated });
  } catch (error) {
    console.error("[NotificationPrefs] Error updating customer preferences:", error);
    res.status(500).json({ error: "Failed to update customer preferences" });
  }
});

export default router;