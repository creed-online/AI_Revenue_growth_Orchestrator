import express from "express";
import {
  calculateReplenishmentInfo,
  findDueReplenishmentOpportunities,
  findDueCustomersForProduct,
} from "../services/replenishment-intervalService.js";
import { getDiscountClassification } from "../services/discountClassifier.js";

const router = express.Router();

/**
 * GET /api/customers/:id/replenishment
 * Returns per-product purchase interval data for one customer.
 */
router.get("/:id/replenishment", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id, 10);

    if (Number.isNaN(customerId)) {
      return res.status(400).json({ error: "Invalid customer id" });
    }

    const merchantId = parseInt(req.query.merchantId, 10) || 1;
    const result = await calculateReplenishmentInfo(customerId, merchantId);

    res.json({ customerId, products: result });
  } catch (error) {
    console.error("Error calculating replenishment info:", error);
    res.status(500).json({ error: "Failed to calculate replenishment info" });
  }
});

/**
 * GET /api/customers/replenishment/due?merchantId=1
 * Returns every customer+product combination currently due for
 * replenishment, across the whole merchant. Useful for testing the
 * "opportunities show up live in demo" scenario from Day 3.
 */
router.get("/replenishment/due", async (req, res) => {
  try {
    const merchantId = parseInt(req.query.merchantId, 10) || 1;
    const due = await findDueReplenishmentOpportunities(merchantId);
    res.json({ merchantId, count: due.length, due });
  } catch (error) {
    console.error("Error finding due replenishment opportunities:", error);
    res.status(500).json({ error: "Failed to find due opportunities" });
  }
});

/**
 * GET /api/customers/replenishment/due-for-product/:productId?merchantId=1
 * Returns every customer currently due to repurchase ONE specific product.
 * Useful for "who should we target for a campaign on this product" queries.
 */
router.get("/replenishment/due-for-product/:productId", async (req, res) => {
  try {
    const productId = parseInt(req.params.productId, 10);
    const merchantId = parseInt(req.query.merchantId, 10) || 1;

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

router.get("/:id/discount-classification", async (req, res) => {
  try {
    const customerId = parseInt(req.params.id, 10);
    const merchantId = parseInt(req.query.merchantId, 10) || 1;

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