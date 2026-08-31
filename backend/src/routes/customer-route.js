import express from "express";
import {
  calculateReplenishmentInfo,
  findDueReplenishmentOpportunities,
  findDueCustomersForProduct,
} from "../services/replenishment-intervalService.js";
import {
  getDiscountClassification,
  getAllCustomerDiscountClassifications,
} from "../services/discountClassifier.js";
import { requireMerchantAccess, resolveMerchantId } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET /api/customers/:id/replenishment
 * Returns per-product purchase interval data for one customer.
 */
router.get("/:id/replenishment", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const customerId = parseInt(req.params.id, 10);

    if (Number.isNaN(customerId)) {
      return res.status(400).json({ error: "Invalid customer id" });
    }

    const result = await calculateReplenishmentInfo(customerId, merchantId);

    res.json({ customerId, products: result });
  } catch (error) {
    console.error("Error calculating replenishment info:", error);
    res.status(500).json({ error: "Failed to calculate replenishment info" });
  }
});

/**
 * GET /api/customers/replenishment/due
 * Returns every customer+product combination currently due for
 * replenishment, across the whole merchant.
 */
router.get("/replenishment/due", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const due = await findDueReplenishmentOpportunities(merchantId);
    res.json({ merchantId, count: due.length, due });
  } catch (error) {
    console.error("Error finding due replenishment opportunities:", error);
    res.status(500).json({ error: "Failed to find due opportunities" });
  }
});

/**
 * GET /api/customers/replenishment/due-for-product/:productId
 * Returns every customer currently due to repurchase ONE specific product.
 */
router.get("/replenishment/due-for-product/:productId", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const productId = parseInt(req.params.productId, 10);

    if (Number.isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product id" });
    }

    const due = await findDueCustomersForProduct(merchantId, productId);
    res.json({ merchantId, productId, count: due.length, due });
  } catch (error) {
    console.error("Error finding due customers for product:", error);
    res.status(500).json({ error: "Failed to find due customers for product" });
  }
});

router.get("/discount-classification", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const results = await getAllCustomerDiscountClassifications(merchantId);

    return res.json({
      merchantId,
      count: results.length,
      customers: results,
    });
  } catch (error) {
    console.error("Error classifying all customer discount needs:", error);
    return res.status(500).json({ error: "Failed to classify merchant customer discount needs" });
  }
});

router.get("/:id/discount-classification", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const customerId = parseInt(req.params.id, 10);

    if (Number.isNaN(customerId)) {
      return res.status(400).json({ error: "Invalid customer id" });
    }

    const result = await getDiscountClassification(customerId, merchantId);
    return res.json(result);
  } catch (error) {
    console.error("Error classifying customer discount need:", error);
    return res.status(500).json({ error: "Failed to classify discount need" });
  }
});

export default router;