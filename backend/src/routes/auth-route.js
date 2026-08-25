import express from "express";
import { loginMerchant, ensureDemoMerchantCredentials } from "../services/authService.js";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

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
