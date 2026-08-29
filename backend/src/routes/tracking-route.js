import express from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import {
  createCustomerCheckoutOrder,
  verifyAndProcessPayment,
} from "../services/razorpayService.js";

const router = express.Router();

// 1x1 Transparent GIF base64 binary buffer (43 bytes)
const TRANSPARENT_1X1_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

/**
 * GET /api/track/open/:token
 * Email open tracking pixel. Disables browser caching, marks openedAt,
 * increments openCount, records client metadata, and serves 1x1 transparent GIF.
 */
router.get("/open/:token", async (req, res) => {
  const { token } = req.params;

  try {
    if (token) {
      const notification = await prisma.notificationSend.findUnique({
        where: { trackingToken: token },
        include: { campaign: true, customer: true },
      });

      if (notification) {
        const ipAddress = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "").toString();
        const userAgent = req.headers["user-agent"] || null;
        const isFirstOpen = !notification.openedAt;

        await prisma.notificationSend.update({
          where: { id: notification.id },
          data: {
            openedAt: notification.openedAt || new Date(),
            openCount: { increment: 1 },
            ipAddress: ipAddress.slice(0, 100) || notification.ipAddress,
            userAgent: userAgent ? userAgent.slice(0, 255) : notification.userAgent,
          },
        });

        if (isFirstOpen) {
          await prisma.auditLog.create({
            data: {
              merchantId: notification.campaign?.merchantId || 1,
              actor: "customer",
              action: "email_opened",
              entityType: "Campaign",
              entityId: notification.campaignId,
              inputSummary: `Email opened by Customer #${notification.customerId} (${notification.customer?.email || "unknown"})`,
              executionResult: JSON.stringify({
                trackingToken: token,
                customerId: notification.customerId,
                ipAddress,
                userAgent,
                timestamp: new Date().toISOString(),
              }),
            },
          });
        }

        console.log(`[Track:Open] Email opened: Campaign #${notification.campaignId}, Customer #${notification.customerId} (${notification.customer?.email}) ${isFirstOpen ? "[FIRST OPEN]" : ""}`);
      }
    }
  } catch (error) {
    console.error("[Track:Open] Error logging email open:", error.message);
  }

  // Always return the 1x1 transparent GIF with anti-cache headers
  res.writeHead(200, {
    "Content-Type": "image/gif",
    "Content-Length": TRANSPARENT_1X1_GIF.length,
    "Cache-Control": "no-store, no-cache, must-revalidate, private, max-age=0, post-check=0, pre-check=0",
    Pragma: "no-cache",
    Expires: "0",
    "Access-Control-Allow-Origin": "*",
  });

  return res.end(TRANSPARENT_1X1_GIF);
});

/**
 * GET /api/track/click/:token
 * Link click tracking endpoint.
 * Marks clickedAt, sets 14-day attribution cookie, appends campaign UTM params,
 * and redirects recipient to storefront destination.
 */
router.get("/click/:token", async (req, res) => {
  const { token } = req.params;
  const redirectUrlParam = req.query.redirect;
  const isJson = req.query.json === "true";

  try {
    let targetUrl = redirectUrlParam || process.env.STOREFRONT_URL || "http://localhost:5173";
    let campaignId = null;
    let customerId = null;

    if (token) {
      const notification = await prisma.notificationSend.findUnique({
        where: { trackingToken: token },
        include: { campaign: true, customer: true },
      });

      if (notification) {
        campaignId = notification.campaignId;
        customerId = notification.customerId;
        const ipAddress = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "").toString();
        const userAgent = req.headers["user-agent"] || null;
        const isFirstClick = !notification.clickedAt;

        await prisma.notificationSend.update({
          where: { id: notification.id },
          data: {
            clickedAt: notification.clickedAt || new Date(),
            openedAt: notification.openedAt || new Date(),
            clickCount: { increment: 1 },
            ipAddress: ipAddress.slice(0, 100) || notification.ipAddress,
            userAgent: userAgent ? userAgent.slice(0, 255) : notification.userAgent,
          },
        });

        if (isFirstClick) {
          await prisma.auditLog.create({
            data: {
              merchantId: notification.campaign?.merchantId || 1,
              actor: "customer",
              action: "email_clicked",
              entityType: "Campaign",
              entityId: notification.campaignId,
              inputSummary: `CTA clicked by Customer #${notification.customerId} (${notification.customer?.email || "unknown"})`,
              executionResult: JSON.stringify({
                trackingToken: token,
                campaignId: notification.campaignId,
                customerId: notification.customerId,
                ipAddress,
                userAgent,
                timestamp: new Date().toISOString(),
              }),
            },
          });
        }

        console.log(`[Track:Click] CTA Clicked: Campaign #${notification.campaignId}, Customer #${notification.customerId} (${notification.customer?.email}) ${isFirstClick ? "[FIRST CLICK]" : ""}`);
      }
    }

    // Set 14-day attribution cookie (argo_campaign_ref)
    const attributionPayload = JSON.stringify({
      token,
      campaignId,
      customerId,
      timestamp: Date.now(),
    });

    res.cookie("argo_campaign_ref", attributionPayload, {
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      httpOnly: false, // Accessible to frontend checkout script
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    // Append campaign metadata to target URL
    const destination = new URL(targetUrl, "http://localhost:5173");
    destination.searchParams.set("utm_source", "email");
    destination.searchParams.set("utm_medium", "growth_orchestrator");
    if (campaignId) destination.searchParams.set("utm_campaign", String(campaignId));
    if (token) destination.searchParams.set("argo_token", token);
    if (customerId) destination.searchParams.set("customer_id", String(customerId));

    if (isJson) {
      return res.json({
        success: true,
        destinationUrl: destination.toString(),
        campaignId,
        customerId,
        token,
      });
    }

    return res.redirect(302, destination.toString());
  } catch (error) {
    console.error("[Track:Click] Error processing link click:", error);
    const fallbackUrl = process.env.STOREFRONT_URL || "http://localhost:5173";
    if (isJson) {
      return res.status(500).json({ error: "click_tracking_failed", message: error.message });
    }
    return res.redirect(302, fallbackUrl);
  }
});

/**
 * POST /api/track/checkout/create-order
 * Creates a Razorpay test order with campaign discount applied.
 */
router.post("/checkout/create-order", async (req, res) => {
  try {
    const { campaignId, customerId, trackingToken, items, discountPercent } = req.body;

    const result = await createCustomerCheckoutOrder({
      campaignId,
      customerId,
      trackingToken,
      items,
      discountPercent,
    });

    res.json(result);
  } catch (error) {
    console.error("[Checkout:CreateOrder] Error creating checkout order:", error);
    res.status(500).json({ error: "checkout_order_failed", message: error.message });
  }
});

/**
 * POST /api/track/checkout/verify-payment
 * Verifies Razorpay test/live payment, persists Order to PostgreSQL,
 * and attributes conversion to the campaign.
 */
router.post("/checkout/verify-payment", async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      campaignId,
      customerId,
      trackingToken,
      items,
      totalAmount,
      discountAmount,
      isTestMode = true,
    } = req.body;

    const result = await verifyAndProcessPayment({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      campaignId,
      customerId,
      trackingToken,
      items,
      totalAmount,
      discountAmount,
      isTestMode,
    });

    res.json(result);
  } catch (error) {
    console.error("[Checkout:VerifyPayment] Error verifying payment:", error);
    res.status(500).json({ error: "payment_verification_failed", message: error.message });
  }
});

/**
 * POST /api/track/razorpay-webhook
 * Webhook listener for Razorpay payment events (payment.captured, order.paid).
 * Resolves notes.campaignId / notes.trackingToken and automatically creates
 * an attributed Order in PostgreSQL.
 */
router.post("/razorpay-webhook", async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    // Optional webhook HMAC signature validation if secret configured
    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (expectedSignature !== signature) {
        console.warn("[Razorpay:Webhook] Invalid signature received");
        return res.status(400).json({ error: "invalid_signature" });
      }
    }

    const { event, payload } = req.body;
    console.log(`[Razorpay:Webhook] Received event: ${event}`);

    if (event === "payment.captured" || event === "order.paid") {
      const payment = payload?.payment?.entity || payload?.order?.entity;
      if (!payment) {
        return res.status(200).json({ status: "ignored", reason: "no_payment_entity" });
      }

      const notes = payment.notes || {};
      const campaignId = notes.campaignId ? Number(notes.campaignId) : null;
      const customerId = notes.customerId ? Number(notes.customerId) : null;
      const trackingToken = notes.trackingToken || null;
      const discountAmount = Number(notes.discountAmount) || 0;
      const totalAmount = (Number(payment.amount) || 0) / 100; // paise to INR
      const isTestMode = !payment.id || payment.id.startsWith("pay_test_") || process.env.NODE_ENV !== "production";

      const result = await verifyAndProcessPayment({
        razorpayOrderId: payment.order_id || null,
        razorpayPaymentId: payment.id,
        campaignId,
        customerId,
        trackingToken,
        totalAmount,
        discountAmount,
        isTestMode,
      });

      console.log(`[Razorpay:Webhook] Successfully processed payment ${payment.id} → Created Order #${result.orderId}`);
      return res.status(200).json({ status: "processed", orderId: result.orderId, attributionType: result.attributionType });
    }

    return res.status(200).json({ status: "ignored", event });
  } catch (error) {
    console.error("[Razorpay:Webhook] Error processing webhook:", error);
    return res.status(500).json({ error: "webhook_processing_failed", message: error.message });
  }
});

/**
 * POST /api/track/simulate-purchase
 * 1-Click purchase simulation endpoint for Postman and Frontend Test Lab.
 * Automatically marks open/click timestamps, applies campaign discount,
 * and creates a real attributed Order in PostgreSQL tagged as "simulated_purchase".
 */
router.post("/simulate-purchase", async (req, res) => {
  try {
    let {
      campaignId,
      customerId,
      trackingToken,
      productId,
      quantity = 1,
      unitPrice,
    } = req.body;

    let notification = null;
    if (trackingToken) {
      notification = await prisma.notificationSend.findUnique({
        where: { trackingToken },
        include: { campaign: true, customer: true },
      });
    }

    if (!notification && campaignId) {
      notification = await prisma.notificationSend.findFirst({
        where: { campaignId: Number(campaignId) },
        include: { campaign: true, customer: true },
        orderBy: { sentAt: "desc" },
      });
    }

    const resolvedCampaignId = notification?.campaignId || (campaignId ? Number(campaignId) : null);
    const resolvedCustomerId = notification?.customerId || (customerId ? Number(customerId) : 1);
    const discountPercent = notification?.campaign?.offerValue || 10;

    // Ensure Product exists
    let product = null;
    if (productId) {
      product = await prisma.product.findUnique({ where: { id: Number(productId) } });
    }
    if (!product) {
      product = await prisma.product.findFirst({ where: { merchantId: 1 } });
    }

    const itemPrice = Number(unitPrice) || product?.price || 1499.0;
    const grossTotal = itemPrice * Number(quantity || 1);
    const discountAmount = Math.round(grossTotal * (discountPercent / 100) * 100) / 100;
    const netTotal = Math.max(grossTotal - discountAmount, 1.0);

    const result = await verifyAndProcessPayment({
      razorpayOrderId: `ord_sim_${Date.now()}`,
      razorpayPaymentId: `pay_sim_${Date.now()}`,
      campaignId: resolvedCampaignId,
      customerId: resolvedCustomerId,
      trackingToken: notification?.trackingToken || trackingToken || null,
      totalAmount: netTotal,
      discountAmount,
      items: [
        {
          productId: product?.id || 1,
          quantity: Number(quantity || 1),
          price: itemPrice,
        },
      ],
      isTestMode: true,
    });

    const customer = await prisma.customer.findUnique({ where: { id: resolvedCustomerId } });

    res.json({
      success: true,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      customerName: customer?.name || "Customer",
      customerEmail: customer?.email || "",
      totalPrice: result.totalPrice,
      discountAmount: result.discountAmount,
      campaignId: result.campaignId,
      attributionType: result.attributionType,
      isTestMode: result.isTestMode,
    });
  } catch (error) {
    console.error("[SimulatePurchase] Error simulating purchase:", error);
    res.status(500).json({ error: "simulation_failed", message: error.message });
  }
});

export default router;
