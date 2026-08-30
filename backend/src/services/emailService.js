import nodemailer from "nodemailer";
import { prisma } from "../lib/prisma.js";
import { decrypt } from "../lib/encryption.js";

let etherealTransporter = null;

/**
 * Creates or retrieves the Ethereal dev mailbox transporter for sandbox testing.
 */
async function getEtherealTransporter() {
  if (!etherealTransporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log(`[Email] Created Ethereal test mailbox: ${testAccount.user}`);
      etherealTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.warn("[Email] Could not create Ethereal test account:", err.message);
      etherealTransporter = {
        sendMail: async (mailOptions) => ({
          messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          previewUrl: null,
          envelope: { to: [mailOptions.to] },
        }),
      };
    }
  }
  return etherealTransporter;
}

/**
 * Returns an active Nodemailer transport based on per-merchant settings or global env config.
 */
export async function getTransporter(merchantId = null) {
  // 1. Check if merchant has custom BYO SMTP configured
  if (merchantId) {
    try {
      const integration = await prisma.merchantIntegration.findUnique({
        where: { merchantId: Number(merchantId) },
      });

      if (integration && !integration.isSandboxMode && integration.smtpHost && integration.smtpUser && integration.smtpPassEncrypted) {
        const decryptedPass = decrypt(integration.smtpPassEncrypted);
        if (decryptedPass) {
          const port = Number(integration.smtpPort) || 587;
          const secure = port === 465;
          const from = integration.senderEmail
            ? integration.senderName
              ? `"${integration.senderName}" <${integration.senderEmail}>`
              : integration.senderEmail
            : `"${integration.senderName || 'Merchant Campaigns'}" <${integration.smtpUser}>`;

          const transporter = nodemailer.createTransport({
            host: integration.smtpHost,
            port,
            secure,
            auth: {
              user: integration.smtpUser,
              pass: decryptedPass,
            },
          });

          return {
            mode: "merchant_smtp",
            transporter,
            fromAddress: from,
          };
        }
      }
    } catch (err) {
      console.warn(`[Email] Could not load merchant #${merchantId} SMTP config:`, err.message);
    }
  }

  // 2. Global environment SMTP fallback
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (user && pass && user !== "your_smtp_user") {
    return {
      mode: "global_smtp",
      transporter: nodemailer.createTransport({
        host: host || "smtp.gmail.com",
        port,
        secure,
        auth: { user, pass },
      }),
      fromAddress: process.env.SMTP_FROM || `"AI Revenue Orchestrator" <${user}>`,
    };
  }

  // 3. Ethereal sandbox test mailbox fallback
  const devTransporter = await getEtherealTransporter();
  return {
    mode: "ethereal",
    transporter: devTransporter,
    fromAddress: process.env.SMTP_FROM || `"AI Revenue Orchestrator (Demo)" <campaigns@growth-orchestrator.ai>`,
  };
}

/**
 * Tests an SMTP connection directly with provided credentials.
 */
export async function testSmtpConnection({
  host,
  port = 587,
  user,
  pass,
  senderEmail,
  senderName = "ARGOES Merchant Test",
  targetEmail,
}) {
  const p = Number(port) || 587;
  const secure = p === 465;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: p,
      secure,
      auth: { user, pass },
    });

    await transporter.verify();

    const fromAddress = senderEmail
      ? `"${senderName}" <${senderEmail}>`
      : `"${senderName}" <${user}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: targetEmail || user,
      subject: "✔ ARGOES Live SMTP Channel Verification",
      text: `Hello! This is a test email from your ARGOES Merchant Integration Gateway.\n\nHost: ${host}\nPort: ${p}\nUser: ${user}\nTimestamp: ${new Date().toISOString()}\n\nYour SMTP gateway is fully operational.`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e5e5e5; border-radius: 8px;">
          <h2 style="color: #D97757; margin-top: 0;">✔ SMTP Gateway Verified</h2>
          <p>This is a verification test from your <strong>ARGOES Merchant Integration Gateway</strong>.</p>
          <ul style="line-height: 1.8; color: #444;">
            <li><strong>Host:</strong> ${host}</li>
            <li><strong>Port:</strong> ${p}</li>
            <li><strong>Account:</strong> ${user}</li>
            <li><strong>Verified At:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p style="font-size: 12px; color: #888; margin-top: 24px;">ARGOES Revenue Growth Orchestrator</p>
        </div>
      `,
    });

    return {
      success: true,
      messageId: info.messageId,
      verified: true,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      verified: false,
    };
  }
}

/**
 * Sends a real or sandbox marketing email with tracking pixel & CTA.
 */
export async function sendRealEmail({
  merchantId = null,
  to,
  subject,
  text,
  html,
  trackingToken,
}) {
  if (!isValidEmail(to)) {
    return { success: false, error: `Invalid email address format: ${to}` };
  }

  try {
    const { mode, transporter, fromAddress } = await getTransporter(merchantId);

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html,
      headers: trackingToken ? { "X-Argo-Tracking-Token": trackingToken } : {},
    });

    let previewUrl = null;
    if (mode === "ethereal" && typeof nodemailer.getTestMessageUrl === "function") {
      previewUrl = nodemailer.getTestMessageUrl(info) || null;
    }

    console.log(`[Email] Dispatched to ${to} (${mode}) → Message ID: ${info.messageId} ${previewUrl ? '→ Preview: ' + previewUrl : ''}`);

    return {
      success: true,
      mode,
      messageId: info.messageId,
      previewUrl,
    };
  } catch (error) {
    console.error(`[Email] Send failed for ${to}:`, error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Basic RFC email validation check.
 */
export function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export const isRealEmail = isValidEmail;

export default {
  getTransporter,
  testSmtpConnection,
  sendRealEmail,
  isValidEmail,
  isRealEmail,
};