import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-argo-jwt-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const DEMO_PASSWORD = process.env.DEMO_MERCHANT_PASSWORD || "demo1234";

/**
 * Ensure the demo merchant has a password hash (idempotent).
 * Safe for hackathon seed DBs that predate passwordHash.
 */
export async function ensureDemoMerchantCredentials() {
  const merchant = await prisma.merchant.findFirst({
    orderBy: { id: "asc" },
  });
  if (!merchant) return null;

  if (!merchant.passwordHash) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    return prisma.merchant.update({
      where: { id: merchant.id },
      data: { passwordHash },
    });
  }
  return merchant;
}

export async function loginMerchant({ email, password }) {
  if (!email || !password) {
    return { error: "missing_credentials", message: "Email and password are required." };
  }

  await ensureDemoMerchantCredentials();

  const merchant = await prisma.merchant.findUnique({
    where: { email: String(email).trim().toLowerCase() },
  });

  if (!merchant?.passwordHash) {
    return { error: "invalid_credentials", message: "Invalid email or password." };
  }

  const ok = await bcrypt.compare(password, merchant.passwordHash);
  if (!ok) {
    return { error: "invalid_credentials", message: "Invalid email or password." };
  }

  const token = jwt.sign(
    {
      merchantId: merchant.id,
      email: merchant.email,
      businessName: merchant.businessName,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    merchant: {
      id: merchant.id,
      email: merchant.email,
      businessName: merchant.businessName,
      industry: merchant.industry,
      currency: merchant.currency,
    },
  };
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export async function registerMerchant({ email, password, businessName, industry }) {
  const normalizedEmail = String(email).trim().toLowerCase();

  const existing = await prisma.merchant.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { error: "email_exists", message: "A merchant with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const merchant = await prisma.$transaction(async (tx) => {
    const newMerchant = await tx.merchant.create({
      data: {
        businessName,
        email: normalizedEmail,
        passwordHash,
        industry: industry || "General",
        currency: "INR",
      },
    });

    await tx.policy.create({
      data: {
        merchantId: newMerchant.id,
        maxDiscount: 15,
        maxCampaignAudience: 5000,
        maxCampaignBudget: 20000,
        maxCampaignsPerCustomerPerMonth: 2,
        requireApproval: true,
        optOutCustomerIds: [],
        optOutProductIds: [],
      },
    });

    await tx.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: businessName,
        merchantId: newMerchant.id,
        role: "merchant_admin",
      },
    });

    return newMerchant;
  });

  const token = jwt.sign(
    { merchantId: merchant.id, email: merchant.email, businessName: merchant.businessName },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  return {
    token,
    merchant: {
      id: merchant.id,
      email: merchant.email,
      businessName: merchant.businessName,
      industry: merchant.industry,
      currency: merchant.currency,
    },
  };
}

export default {
  ensureDemoMerchantCredentials,
  loginMerchant,
  registerMerchant,
  verifyToken,
  JWT_SECRET,
};
