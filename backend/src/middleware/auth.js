import { verifyToken } from "../services/authService.js";

/**
 * Optional auth — attaches req.user when a valid Bearer token is present.
 * Does not reject anonymous requests (keeps demo flows working).
 */
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = verifyToken(token);
    req.user = {
      merchantId: payload.merchantId,
      email: payload.email,
      businessName: payload.businessName,
    };
  } catch {
    // ignore invalid token for optional auth
  }
  return next();
}

/**
 * Required auth — 401 without a valid JWT.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "unauthorized", message: "Login required." });
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      merchantId: payload.merchantId,
      email: payload.email,
      businessName: payload.businessName,
    };
    return next();
  } catch {
    return res.status(401).json({ error: "unauthorized", message: "Invalid or expired token." });
  }
}

/**
 * Strict merchant access — requires valid JWT and sets req.merchantId.
 * Never falls back to query/body merchantId.
 */
export function requireMerchantAccess(req, res, next) {
  if (!req.user?.merchantId) {
    return res.status(401).json({ error: "unauthorized", message: "Login required." });
  }
  req.merchantId = Number(req.user.merchantId);
  next();
}

/**
 * Resolve merchantId from demo header first, then JWT, then fallback.
 * Demo mode takes precedence so users can explore demo data regardless of their actual merchant.
 */
export function resolveMerchantId(req, fallback = null) {
  if (req.headers["x-demo-mode"] === "true") return 1;
  if (req.user?.merchantId) return Number(req.user.merchantId);
  return fallback;
}

export default { optionalAuth, requireAuth, requireMerchantAccess, resolveMerchantId };
