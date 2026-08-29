import { schemaRegistry } from "./schemaRegistry.js";
import { schemaDiffer } from "./schemaDiffer.js";
import { prisma } from "../../lib/prisma.js";

export class DriftDetector {
  /**
   * Detects schema drift when a file is uploaded or during a scheduled sync.
   * Compares the source schema against the target database schema.
   */
  async detectDrift(merchantId, sourceEntityName, sourceFields, mappings = []) {
    const fullSchema = await schemaRegistry.getTargetSchema(merchantId);
    const targetEntityDef = fullSchema.entities.find(e => e.name === sourceEntityName);

    if (!targetEntityDef) {
      throw new Error(`Target entity '${sourceEntityName}' not found in registry.`);
    }

    // Use SchemaDiffer to detect additions, removals, and modifications
    const diff = schemaDiffer.diff({ fields: sourceFields }, targetEntityDef, mappings);

    // If drift is detected (new columns added or required columns missing)
    if (diff.added.length > 0 || diff.removed.length > 0) {
      await this.handleDriftDetected(merchantId, sourceEntityName, diff);
    }

    return diff;
  }

  /**
   * Handles drift by logging it and potentially sending an alert to the merchant.
   */
  async handleDriftDetected(merchantId, entityName, diff) {
    console.warn(`[DriftDetector] Schema Drift detected for Merchant #${merchantId} on entity ${entityName}.`);
    
    // Log the drift to AuditLog
    let inputSummary = [];
    if (diff.added.length > 0) inputSummary.push(`Added: ${diff.added.map(f => f.name).join(', ')}`);
    if (diff.removed.length > 0) inputSummary.push(`Removed: ${diff.removed.map(f => f.name).join(', ')}`);
    
    try {
      await prisma.auditLog.create({
        data: {
          merchantId,
          actor: "system",
          action: "schema_drift_detected",
          entityType: entityName,
          inputSummary: inputSummary.join(' | '),
          reason: "Source data schema differs from target database schema."
        }
      });
    } catch(e) {
      console.warn("Failed to log drift to AuditLog (DB might be offline):", e.message);
    }

    // In a production system, we would trigger an email or in-app notification here
    // notificationService.sendSystemAlert(merchantId, 'SCHEMA_DRIFT', { entityName, diff });
  }
}

export const driftDetector = new DriftDetector();

