import { prisma } from "../../lib/prisma.js";

export class FeedbackLoop {
  /**
   * Records a user's correction to the AI's mapping.
   * If the AI mapped `cust_id` -> `Customer.id`, but the user corrected it to `Customer.name`,
   * we record that so the AI learns for next time.
   */
  async recordCorrection(merchantId, sourceColumn, targetEntity, targetField, confidenceScore = 1.0) {
    if (!merchantId || !sourceColumn || !targetEntity || !targetField) {
      throw new Error("Missing required fields for feedback loop");
    }

    // Upsert the few-shot example.
    // If it already exists, we can boost the confidence score to strengthen the neural pathway.
    return await prisma.fewShotExample.upsert({
      where: {
        merchantId_sourceColumn_targetEntity_targetField: {
          merchantId,
          sourceColumn,
          targetEntity,
          targetField
        }
      },
      update: {
        confidenceScore: { increment: 0.1 },
        updatedAt: new Date()
      },
      create: {
        merchantId,
        sourceColumn,
        targetEntity,
        targetField,
        confidenceScore
      }
    });
  }

  /**
   * Retrieves past successful mappings for a specific entity to feed into the AI prompt as few-shot examples.
   */
  async getFewShotExamples(merchantId, targetEntity, limit = 10) {
    return await prisma.fewShotExample.findMany({
      where: {
        merchantId,
        targetEntity
      },
      orderBy: {
        confidenceScore: 'desc'
      },
      take: limit
    });
  }
}

export const feedbackLoop = new FeedbackLoop();

