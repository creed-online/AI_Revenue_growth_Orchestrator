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
 * Resolve merchantId from JWT first, then query/body, default 1.
 */
export function resolveMerchantId(req, fallback = 1) {
  if (req.user?.merchantId) return Number(req.user.merchantId);
  if (req.query?.merchantId) return Number(req.query.merchantId) || fallback;
  if (req.body?.merchantId) return Number(req.body.merchantId) || fallback;
  return fallback;
}

export default { optionalAuth, requireAuth, resolveMerchantId };
