import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendRealEmail({ to, subject, text, html }) {
  console.log(`[Email] Attempting to send to: ${to}`);
  console.log(`[Email] SMTP Config:`, {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER ? "SET" : "MISSING",
    pass: process.env.SMTP_PASS ? "SET" : "MISSING",
  });
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("[Email] SMTP not configured");
    return { success: false, reason: "SMTP not configured" };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"AI Revenue Orchestrator" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`[Email] Sent successfully:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email] Send failed:", error);
    return { success: false, error: error.message };
  }
}

export function isRealEmail(email) {
  if (!email) return false;
  const lower = email.toLowerCase();
  // Filter out demo/test patterns
  const demoPatterns = [
    "@example.com",
    "@test.com",
    "@demo.",
    "@localhost",
    "demo@",
    "test@",
    "fake@",
    "sample@",
  ];
  const isDemo = demoPatterns.some((p) => lower.includes(p));
  console.log(`[Email Check] ${email} -> isReal: ${!isDemo}`);
  return !isDemo;
}