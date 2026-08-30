import express from "express";
import { prisma } from "../lib/prisma.js";
import { encrypt, decrypt, maskSecret } from "../lib/encryption.js";
import { resolveMerchantId } from "../middleware/auth.js";
import { testSmtpConnection } from "../services/emailService.js";
import { sendWhatsAppMessage, WHATSAPP_TEMPLATES, renderWhatsAppTemplate } from "../services/whatsappService.js";

const router = express.Router();

/**
 * GET /api/integrations
 * Retrieves merchant integration connection status with masked secrets.
 */
router.get("/", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);

    let integration = await prisma.merchantIntegration.findUnique({
      where: { merchantId },
    });

    // Create default record if not yet created
    if (!integration) {
      integration = await prisma.merchantIntegration.create({
        data: {
          merchantId,
          isSandboxMode: true,
          defaultTone: "conversational_d2c",
          selectedTemplate: "replenishment_v1",
        },
      });
    }

    res.json({
      merchantId: integration.merchantId,
      isSandboxMode: integration.isSandboxMode,
      defaultTone: integration.defaultTone,
      selectedTemplate: integration.selectedTemplate,

      // SMTP status & masked config
      smtp: {
        provider: integration.emailProvider || "smtp",
        host: integration.smtpHost || "",
        port: integration.smtpPort || 587,
        user: integration.smtpUser || "",
        senderEmail: integration.senderEmail || "",
        senderName: integration.senderName || "",
        isConfigured: Boolean(integration.smtpHost && integration.smtpUser),
        isVerified: integration.emailVerified,
      },

      // WhatsApp status & masked config
      whatsapp: {
        provider: integration.whatsappProvider || "meta",
        phoneNumberId: integration.whatsappPhoneNumberId || "",
        wabaId: integration.whatsappWabaId || "",
        merchantTestPhone: integration.merchantTestPhone || "",
        tokenMasked: integration.whatsappTokenEncrypted ? maskSecret(decrypt(integration.whatsappTokenEncrypted), 4) : "",
        isConfigured: Boolean(integration.whatsappPhoneNumberId && integration.whatsappTokenEncrypted),
        isVerified: integration.whatsappVerified,
      },

      // Razorpay status & masked config
      razorpay: {
        keyId: integration.razorpayKeyId || "",
        secretMasked: integration.razorpaySecretEncrypted ? maskSecret(decrypt(integration.razorpaySecretEncrypted), 4) : "",
        isConfigured: Boolean(integration.razorpayKeyId && integration.razorpaySecretEncrypted),
        isVerified: integration.razorpayVerified,
      },

      updatedAt: integration.updatedAt,
    });
  } catch (error) {
    console.error("[Integrations] Error fetching status:", error);
    res.status(500).json({ error: "Failed to fetch integration settings", message: error.message });
  }
});

/**
 * POST /api/integrations
 * Updates encrypted credentials, preferences, and sandbox status.
 */
router.post("/", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const {
      isSandboxMode,
      defaultTone,
      selectedTemplate,
      smtp,
      whatsapp,
      razorpay,
    } = req.body;

    const existing = await prisma.merchantIntegration.findUnique({
      where: { merchantId },
    });

    const updateData = {};

    if (isSandboxMode !== undefined) updateData.isSandboxMode = Boolean(isSandboxMode);
    if (defaultTone) updateData.defaultTone = String(defaultTone);
    if (selectedTemplate) updateData.selectedTemplate = String(selectedTemplate);

    // SMTP Updates
    if (smtp) {
      if (smtp.provider !== undefined) updateData.emailProvider = smtp.provider;
      if (smtp.host !== undefined) updateData.smtpHost = smtp.host;
      if (smtp.port !== undefined) updateData.smtpPort = Number(smtp.port) || 587;
      if (smtp.user !== undefined) updateData.smtpUser = smtp.user;
      if (smtp.senderEmail !== undefined) updateData.senderEmail = smtp.senderEmail;
      if (smtp.senderName !== undefined) updateData.senderName = smtp.senderName;
      if (smtp.isVerified !== undefined) updateData.emailVerified = Boolean(smtp.isVerified);

      // Only update password if a new non-empty password is submitted
      if (smtp.password && !smtp.password.includes("•••")) {
        updateData.smtpPassEncrypted = encrypt(smtp.password);
        updateData.emailVerified = false; // require re-verification
      }
    }

    // WhatsApp Updates
    if (whatsapp) {
      if (whatsapp.provider !== undefined) updateData.whatsappProvider = whatsapp.provider;
      if (whatsapp.phoneNumberId !== undefined) updateData.whatsappPhoneNumberId = whatsapp.phoneNumberId;
      if (whatsapp.wabaId !== undefined) updateData.whatsappWabaId = whatsapp.wabaId;
      if (whatsapp.merchantTestPhone !== undefined) updateData.merchantTestPhone = whatsapp.merchantTestPhone;
      if (whatsapp.isVerified !== undefined) updateData.whatsappVerified = Boolean(whatsapp.isVerified);

      // Only encrypt new token if provided
      if (whatsapp.token && !whatsapp.token.includes("•••")) {
        updateData.whatsappTokenEncrypted = encrypt(whatsapp.token);
        updateData.whatsappVerified = false;
      }
    }

    // Razorpay Updates
    if (razorpay) {
      if (razorpay.keyId !== undefined) updateData.razorpayKeyId = razorpay.keyId;
      if (razorpay.isVerified !== undefined) updateData.razorpayVerified = Boolean(razorpay.isVerified);

      if (razorpay.keySecret && !razorpay.keySecret.includes("•••")) {
        updateData.razorpaySecretEncrypted = encrypt(razorpay.keySecret);
        updateData.razorpayVerified = false;
      }
    }

    const saved = await prisma.merchantIntegration.upsert({
      where: { merchantId },
      update: updateData,
      create: {
        merchantId,
        ...updateData,
      },
    });

    res.json({
      success: true,
      message: "Merchant integrations updated successfully",
      isSandboxMode: saved.isSandboxMode,
      defaultTone: saved.defaultTone,
      selectedTemplate: saved.selectedTemplate,
    });
  } catch (error) {
    console.error("[Integrations] Error updating settings:", error);
    res.status(500).json({ error: "Failed to save integration settings", message: error.message });
  }
});

/**
 * POST /api/integrations/test-email
 * Live test dispatcher to verify SMTP credentials.
 */
router.post("/test-email", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const { host, port, user, password, senderEmail, senderName, targetEmail } = req.body;

    let finalHost = host;
    let finalPort = port;
    let finalUser = user;
    let finalPass = password;
    let finalSenderEmail = senderEmail;
    let finalSenderName = senderName;

    // If credentials omitted in body, pull stored encrypted config
    if (!finalHost || !finalPass || String(finalPass).includes("•••")) {
      const integration = await prisma.merchantIntegration.findUnique({
        where: { merchantId },
      });
      if (integration) {
        finalHost = finalHost || integration.smtpHost;
        finalPort = finalPort || integration.smtpPort;
        finalUser = finalUser || integration.smtpUser;
        finalPass = integration.smtpPassEncrypted ? decrypt(integration.smtpPassEncrypted) : null;
        finalSenderEmail = finalSenderEmail || integration.senderEmail;
        finalSenderName = finalSenderName || integration.senderName;
      }
    }

    if (!finalHost || !finalUser || !finalPass) {
      return res.status(400).json({
        success: false,
        error: "Missing SMTP configuration (Host, User, or Password)",
      });
    }

    const result = await testSmtpConnection({
      host: finalHost,
      port: finalPort,
      user: finalUser,
      pass: finalPass,
      senderEmail: finalSenderEmail,
      senderName: finalSenderName,
      targetEmail: targetEmail || finalUser,
    });

    if (result.success) {
      // Mark SMTP verified in DB
      await prisma.merchantIntegration.updateMany({
        where: { merchantId },
        data: { emailVerified: true },
      });
    }

    res.json(result);
  } catch (error) {
    console.error("[Integrations] SMTP test failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/integrations/test-whatsapp
 * 1-Click "Send Test to My Phone" live WhatsApp dispatcher.
 */
router.post("/test-whatsapp", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const { phone, templateKey, tone, variables } = req.body;

    const integration = await prisma.merchantIntegration.findUnique({
      where: { merchantId },
    });

    const targetPhone = phone || integration?.merchantTestPhone;
    if (!targetPhone) {
      return res.status(400).json({
        success: false,
        error: "Please provide a valid recipient phone number",
      });
    }

    // Update test phone if provided
    if (phone && phone !== integration?.merchantTestPhone) {
      await prisma.merchantIntegration.updateMany({
        where: { merchantId },
        data: { merchantTestPhone: phone },
      });
    }

    const result = await sendWhatsAppMessage({
      merchantId,
      to: targetPhone,
      templateKey: templateKey || integration?.selectedTemplate || "replenishment_v1",
      tone: tone || integration?.defaultTone || "conversational_d2c",
      variables: variables || {
        customer_name: "Varun",
        product_name: "Whey Protein Isolate (1kg)",
        discount: "10",
        razorpay_link: "https://rzp.io/l/demo-replenish",
        merchant_name: "RakshFit Nutrition",
      },
    });

    res.json(result);
  } catch (error) {
    console.error("[Integrations] WhatsApp test dispatch error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/integrations/templates
 * Returns all 4 pre-approved D2C WhatsApp template definitions with preview copy.
 */
router.get("/templates", (req, res) => {
  const list = Object.values(WHATSAPP_TEMPLATES).map((tpl) => {
    const preview = renderWhatsAppTemplate({
      templateKey: tpl.id,
      tone: "conversational_d2c",
    });
    return {
      id: tpl.id,
      name: tpl.name,
      category: tpl.category,
      description: tpl.description,
      preview: preview.renderedBody,
      tones: tpl.templates,
    };
  });

  res.json({ templates: list });
});

export default router;

