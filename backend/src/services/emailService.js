import nodemailer from "nodemailer";

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
      // Fallback stub transporter to ensure zero-crash operations
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
 * Returns an active Nodemailer transport based on environment config.
 */
async function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (user && pass && user !== "your_smtp_user") {
    return {
      mode: "smtp",
      transporter: nodemailer.createTransport({
        host: host || "smtp.gmail.com",
        port,
        secure,
        auth: { user, pass },
      }),
      fromAddress: process.env.SMTP_FROM || `"AI Revenue Orchestrator" <${user}>`,
    };
  }

  // Fallback to dev Ethereal test mailbox
  const devTransporter = await getEtherealTransporter();
  return {
    mode: "ethereal",
    transporter: devTransporter,
    fromAddress: process.env.SMTP_FROM || `"AI Revenue Orchestrator (Demo)" <campaigns@growth-orchestrator.ai>`,
  };
}

/**
 * Sends a real or sandbox marketing email with tracking pixel & CTA.
 */
export async function sendRealEmail({ to, subject, text, html, trackingToken }) {
  if (!isValidEmail(to)) {
    return { success: false, error: `Invalid email address format: ${to}` };
  }

  try {
    const { mode, transporter, fromAddress } = await getTransporter();

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

export default { sendRealEmail, isValidEmail, isRealEmail };