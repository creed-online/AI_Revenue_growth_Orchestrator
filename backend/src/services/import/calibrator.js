import { prisma } from "../../lib/prisma.js";

/**
 * Task 2.4 - Confidence Calibration
 * Adjusts AI confidence thresholds based on real user feedback.
 * If the AI often guesses with 0.95 confidence but users have to correct it,
 * the calibrator will increase the safety threshold so the UI forces user review.
 */
export class ConfidenceCalibrator {
  constructor() {
    // Default system baseline thresholds
    this.thresholds = {
      Customer: 0.85,
      Product: 0.85,
      Order: 0.85
    };
  }

  /**
   * Evaluates recent feedback logs for a merchant to adjust thresholds.
   * A simplified form of Platt Scaling: shifting thresholds up if overconfident.
   */
  async calibrate(merchantId, targetEntity) {
    try {
      // Fetch recent few-shot examples (which are born from user corrections)
      const corrections = await prisma.fewShotExample.findMany({
        where: { merchantId, targetEntity },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      if (corrections.length < 5) {
        // Not enough data to confidently shift the threshold; return baseline.
        return this.thresholds[targetEntity] || 0.85;
      }

      // If there are many recent corrections for this entity, the AI is likely miscalibrated
      // and overconfident. We should raise the threshold to force more manual review.
      
      const baseline = this.thresholds[targetEntity] || 0.85;
      
      // For every correction, we slightly increase the strictness (e.g. +0.01) up to a max of 0.95
      const penalty = corrections.length * 0.01;
      const newThreshold = Math.min(0.95, baseline + penalty);

      console.log(`[Calibrator] Adjusted threshold for ${targetEntity} (Merchant ${merchantId}) from ${baseline} -> ${newThreshold.toFixed(2)}`);
      
      return newThreshold;
    } catch (e) {
      console.warn("Failed to calibrate confidence (DB offline?):", e.message);
      return this.thresholds[targetEntity] || 0.85;
    }
  }

  /**
   * Applies the calibrated threshold to a set of AI mappings.
   * If the mapping's confidence is below the calibrated threshold, it marks `needsReview = true`.
   */
  async applyCalibration(merchantId, entityName, mappings) {
    const calibratedThreshold = await this.calibrate(merchantId, entityName);

    return mappings.map(mapping => {
      const isConfident = mapping.confidence >= calibratedThreshold;
      return {
        ...mapping,
        needsReview: !isConfident,
        calibratedThreshold
      };
    });
  }
}

export const calibrator = new ConfidenceCalibrator();

