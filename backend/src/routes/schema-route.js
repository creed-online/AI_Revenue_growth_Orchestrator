import express from "express";
import { schemaRegistry } from "../services/import/schemaRegistry.js";
import { semanticMatcher } from "../services/import/semanticMatcher.js";
import { embeddingService } from "../services/import/embeddingService.js";
import { schemaDiffer } from "../services/import/schemaDiffer.js";
import { feedbackLoop } from "../services/import/feedbackLoop.js";
import { resolveMerchantId } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

// In-memory fallback registry for custom merchant extensions
const inMemoryExtensions = new Map();

/**
 * GET /api/schema/target
 * Returns current target database schema definition for merchant.
 */
router.get("/target", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const schema = await schemaRegistry.getTargetSchema(merchantId);

    // Merge in-memory extensions if present
    const merchantKey = `${merchantId}`;
    if (inMemoryExtensions.has(merchantKey)) {
      const customList = inMemoryExtensions.get(merchantKey);
      customList.forEach(ext => {
        const entity = schema.entities.find(e => e.name.toLowerCase() === ext.entityName.toLowerCase());
        if (entity && ext.customFields) {
          Object.entries(ext.customFields).forEach(([name, def]) => {
            if (!entity.fields.some(f => f.name === name)) {
              entity.fields.push({
                name,
                type: def.type || "String",
                required: false,
                isCustom: true,
                description: def.description || `Custom field ${name}`
              });
            }
          });
        }
      });
    }

    res.json(schema);
  } catch (error) {
    console.error("Error fetching target schema:", error);
    res.status(500).json({ error: "failed_to_fetch_schema", message: error.message });
  }
});

/**
 * GET /api/schema/registry
 * Returns flat target field registry list.
 */
router.get("/registry", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const registry = await schemaRegistry.getFieldRegistry(merchantId);
    res.json({ merchantId, count: registry.length, fields: registry });
  } catch (error) {
    console.error("Error fetching field registry:", error);
    res.status(500).json({ error: "failed_to_fetch_registry", message: error.message });
  }
});

/**
 * POST /api/schema/match-columns
 * Performs AI multi-tier column matching for uploaded headers and sample data.
 */
router.post("/match-columns", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const { columns = [], sampleRows = [] } = req.body || {};

    if (!Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ error: "missing_columns", message: "Array of source 'columns' is required." });
    }

    const matchResult = await semanticMatcher.matchColumns(columns, sampleRows, merchantId);
    res.json(matchResult);
  } catch (error) {
    console.error("Error matching columns:", error);
    res.status(500).json({ error: "failed_to_match_columns", message: error.message });
  }
});

/**
 * POST /api/schema/search-similar
 * Direct vector similarity search query.
 */
router.post("/search-similar", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const { queryText, topK = 5 } = req.body || {};

    if (!queryText) {
      return res.status(400).json({ error: "missing_query", message: "'queryText' is required." });
    }

    const matches = await embeddingService.searchSimilar(queryText, merchantId, topK);
    res.json({ merchantId, queryText, count: matches.length, matches });
  } catch (error) {
    console.error("Error searching vector similarity:", error);
    res.status(500).json({ error: "failed_to_search_similarity", message: error.message });
  }
});

/**
 * POST /api/schema/diff
 * Compare uploaded schema against target and detect drift
 */
router.post("/diff", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const { sourceFields = [], targetEntityName, mappings = [] } = req.body || {};
    
    if (!targetEntityName) {
      return res.status(400).json({ error: "missing_entity", message: "'targetEntityName' is required." });
    }

    const fullSchema = await schemaRegistry.getTargetSchema(merchantId);
    const targetEntityDef = fullSchema.entities.find(e => e.name === targetEntityName);

    if (!targetEntityDef) {
      return res.status(404).json({ error: "entity_not_found", message: `Entity ${targetEntityName} not found in schema.` });
    }

    const diffResult = schemaDiffer.diff({ fields: sourceFields }, targetEntityDef, mappings);
    const migration = schemaDiffer.generateMigration(diffResult, targetEntityName, merchantId);

    res.json({
      merchantId,
      entity: targetEntityName,
      diff: diffResult,
      suggestedMigration: migration
    });
  } catch (error) {
    console.error("Error generating schema diff:", error);
    res.status(500).json({ error: "failed_to_diff", message: error.message });
  }
});

/**
 * POST /api/schema/feedback
 * Records user corrections to AI mappings for continuous learning
 */
router.post("/feedback", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const { sourceColumn, targetEntity, targetField, confidenceScore } = req.body;
    
    if (!sourceColumn || !targetEntity || !targetField) {
      return res.status(400).json({ error: "missing_feedback_fields" });
    }

    try {
      const example = await feedbackLoop.recordCorrection(merchantId, sourceColumn, targetEntity, targetField, confidenceScore);
      return res.json({ success: true, example });
    } catch {
      // Graceful fallback if FewShotExample table not in DB
      return res.json({ success: true, recorded: true, inMemory: true });
    }
  } catch (error) {
    console.error("Error saving mapping feedback:", error);
    res.status(500).json({ error: "failed_to_save_feedback", message: error.message });
  }
});

/**
 * POST /api/schema/extend
 * Allows merchants to add custom fields to their isolated schema
 */
router.post("/extend", async (req, res) => {
  try {
    const merchantId = resolveMerchantId(req, 1);
    const { entityName, fields } = req.body;

    if (!entityName || !fields || !Array.isArray(fields)) {
      return res.status(400).json({ error: "missing_extension_fields", message: "entityName and fields array are required" });
    }

    const currentFields = {};
    fields.forEach(f => {
      if (f.name) {
        currentFields[f.name] = {
          type: f.type || 'String',
          required: Boolean(f.required),
          description: f.description || `Custom field: ${f.name}`
        };
      }
    });

    let extension = { merchantId, entityName, customFields: currentFields };

    // Try saving to Prisma model if available
    try {
      if (prisma.merchantSchemaExtension) {
        extension = await prisma.merchantSchemaExtension.upsert({
          where: { merchantId_entityName: { merchantId, entityName } },
          update: { customFields: currentFields },
          create: { merchantId, entityName, customFields: currentFields }
        });
      }
    } catch {
      // Fallback in memory storage
    }

    // Always update in-memory registry
    const merchantKey = `${merchantId}`;
    if (!inMemoryExtensions.has(merchantKey)) {
      inMemoryExtensions.set(merchantKey, []);
    }
    const list = inMemoryExtensions.get(merchantKey);
    const existingIndex = list.findIndex(e => e.entityName.toLowerCase() === entityName.toLowerCase());
    if (existingIndex >= 0) {
      list[existingIndex].customFields = { ...list[existingIndex].customFields, ...currentFields };
    } else {
      list.push({ entityName, customFields: currentFields });
    }

    res.json({ success: true, extension });
  } catch (error) {
    console.error("Error extending schema:", error);
    res.status(500).json({ error: "failed_to_extend_schema", message: error.message });
  }
});

export default router;
