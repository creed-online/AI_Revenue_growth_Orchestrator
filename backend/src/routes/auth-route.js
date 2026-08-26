import express from "express";
import { loginMerchant, registerMerchant, ensureDemoMerchantCredentials } from "../services/authService.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const result = await loginMerchant({
      email: req.body?.email,
      password: req.body?.password,
    });
    if (result.error) {
      const status = result.error === "missing_credentials" ? 400 : 401;
      return res.status(status).json(result);
    }
    res.json(result);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "login_failed", message: "Could not log in." });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password, businessName, industry } = req.body;
    if (!email || !password || !businessName) {
      return res.status(400).json({ error: "missing_fields", message: "Email, password, and business name required." });
    }
    const result = await registerMerchant({ email, password, businessName, industry });
    if (result.error) {
      return res.status(400).json(result);
    }
    res.status(201).json(result);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "registration_failed" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.user.merchantId },
      select: {
        id: true,
        email: true,
        businessName: true,
        industry: true,
        currency: true,
      },
    });
    if (!merchant) return res.status(404).json({ error: "not_found" });
    res.json({ merchant });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(500).json({ error: "failed" });
  }
});

// POST /api/auth/switch-merchant — switch to demo or own merchant
router.post("/switch-merchant", requireAuth, async (req, res) => {
  try {
    const { targetMerchantId } = req.body;
    const userMerchantId = req.user.merchantId;

    if (targetMerchantId !== 1 && targetMerchantId !== userMerchantId) {
      return res.status(403).json({ error: "forbidden", message: "Cannot switch to another merchant's data." });
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: Number(targetMerchantId) },
      select: { id: true, email: true, businessName: true, industry: true, currency: true },
    });
    if (!merchant) return res.status(404).json({ error: "not_found" });

    const JWT_SECRET = process.env.JWT_SECRET || "dev-argo-jwt-secret-change-me";
    const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

    const token = jwt.sign(
      { merchantId: merchant.id, email: merchant.email, businessName: merchant.businessName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({ token, merchant });
  } catch (error) {
    console.error("Switch merchant error:", error);
    res.status(500).json({ error: "switch_failed" });
  }
});

// POST /api/auth/bootstrap-demo — ensure demo password exists (dev helper)
router.post("/bootstrap-demo", async (_req, res) => {
  try {
    const merchant = await ensureDemoMerchantCredentials();
    if (!merchant) {
      return res.status(404).json({ error: "no_merchant", message: "Seed a merchant first." });
    }
    res.json({
      ok: true,
      email: merchant.email,
      hint: "Use the DEMO_MERCHANT_PASSWORD (default demo1234) to log in.",
    });
  } catch (error) {
    console.error("Bootstrap demo error:", error);
    res.status(500).json({ error: "bootstrap_failed" });
  }
});

export default router;
