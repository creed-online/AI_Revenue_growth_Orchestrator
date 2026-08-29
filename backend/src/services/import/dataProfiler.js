import { callModel } from "../../config/aiClient.js";
import { semanticMatcher } from "./semanticMatcher.js";
import { schemaRegistry } from "./schemaRegistry.js";

const ENTITY_DEFINITIONS = {
  Customer: {
    fields: {
      name: { type: "string", required: true, examples: ["John Doe", "Jane Smith"] },
      email: { type: "string", required: false, format: "email", examples: ["john@example.com"] },
      totalOrders: { type: "integer", required: false, examples: ["5", "10"] },
      totalSpend: { type: "float", required: false, examples: ["25000.00", "50000.50"] },
      avgOrderValue: { type: "float", required: false, examples: ["5000", "5000.50"] },
      lastPurchaseDate: { type: "date", required: false, format: "ISO8601", examples: ["2024-01-15"] },
      firstPurchaseDate: { type: "date", required: false, format: "ISO8601", examples: ["2023-06-01"] },
      isVip: { type: "boolean", required: false, examples: ["true", "false", "1", "0"] },
      isDiscountSensitive: { type: "boolean", required: false, examples: ["true", "false"] },
      isDormant: { type: "boolean", required: false, examples: ["true", "false"] },
    },
    identifyingFields: ["email", "name"],
  },
  Product: {
    fields: {
      name: { type: "string", required: true, examples: ["Protein Powder", "Yoga Mat"] },
      price: { type: "float", required: true, examples: ["2999", "1499.00"] },
      category: { type: "string", required: false, examples: ["Supplements", "Equipment"] },
      isReplenishable: { type: "boolean", required: false, examples: ["true", "false"] },
      avgCycleDays: { type: "integer", required: false, examples: ["30", "45"] },
    },
    identifyingFields: ["name"],
  },
  Order: {
    fields: {
      customerEmail: { type: "string", required: true, format: "email", examples: ["john@example.com"] },
      productName: { type: "string", required: true, examples: ["Protein Powder"] },
      quantity: { type: "integer", required: false, examples: ["2", "1"] },
      price: { type: "float", required: false, examples: ["2999", "1499.00"] },
      createdAt: { type: "date", required: false, format: "ISO8601", examples: ["2024-01-15"] },
    },
    identifyingFields: ["customerEmail", "productName", "createdAt"],
  },
};

function analyzeColumnValues(values, sampleSize = 100) {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== "");
  if (nonNull.length === 0) {
    return { type: "string", nullable: true, sample: [] };
  }

  const sample = nonNull.slice(0, sampleSize);
  const types = new Set();

  for (const val of sample) {
    const str = String(val).trim();
    if (!str) continue;

    if (/^\d+$/.test(str)) types.add("integer");
    else if (/^\d*\.\d+$/.test(str)) types.add("float");
    else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) types.add("date");
    else if (/^\d{2}[\/\-]\d{2}[\/\-]\d{4}$/.test(str)) types.add("date");
    else if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(str)) types.add("email");
    else if (/^(true|false|yes|no|y|n|1|0)$/i.test(str)) types.add("boolean");
    else types.add("string");
  }

  if (types.size === 1) {
    return { type: types.values().next().value, nullable: values.length > nonNull.length, sample: sample.slice(0, 5) };
  }

  if (types.has("integer") && types.has("float")) return { type: "float", nullable: values.length > nonNull.length, sample: sample.slice(0, 5) };
  if (types.has("date")) return { type: "date", nullable: values.length > nonNull.length, sample: sample.slice(0, 5) };

  return { type: "string", nullable: values.length > nonNull.length, sample: sample.slice(0, 5) };
}

export function profileSheet(rows, sheetName) {
  if (!rows || rows.length === 0) {
    return { name: sheetName, rowCount: 0, columns: [], entities: [] };
  }

  const columns = Object.keys(rows[0]);
  const columnProfiles = {};

  for (const col of columns) {
    const values = rows.map(r => r[col]);
    columnProfiles[col] = analyzeColumnValues(values);
  }

  return {
    name: sheetName,
    rowCount: rows.length,
    columns: columns.map(col => ({
      name: col,
      ...columnProfiles[col],
    })),
  };
}

export function profileData(parsedData) {
  const sheets = [];
  const allEntities = new Set();

  const extracted = extractSheets(parsedData);
  for (const sheet of extracted) {
    const profile = profileSheet(sheet.rows, sheet.name);
    sheets.push(profile);
    allEntities.add(sheet.name);
  }

  return {
    sheets,
    totalRows: sheets.reduce((sum, s) => sum + s.rowCount, 0),
    detectedEntities: Array.from(allEntities),
  };
}

function extractSheets(parsedData) {
  if (parsedData?.type === "xlsx" && parsedData.sheets) {
    return Object.entries(parsedData.sheets).map(([name, rows]) => ({ name, rows }));
  }
  if (parsedData?.sheets) {
    return Object.entries(parsedData.sheets).map(([name, rows]) => ({ name, rows }));
  }
  if (Array.isArray(parsedData)) {
    return [{ name: "data", rows: parsedData }];
  }
  return [];
}

const ENTITY_DETECTION_PROMPT = `You are an expert database architect and data mapping AI. Given a data profile with sheets/columns and sample values, identify what business entities are present.

Known entity types in this system:
1. Customer - people who buy things (name, email, purchase history, behavioral flags)
2. Product - items for sale (name, price, category, replenishment settings)
3. Order - transactions linking customers to products (customer reference, product reference, quantity, price, date)

For each sheet/table, determine:
1. Which entity type it most likely represents (Customer, Product, Order, or Unknown)
2. Confidence score (0.0 - 1.0)
3. Reasoning

Return ONLY valid JSON:
{
  "entities": [
    {
      "sourceSheet": "sheet name",
      "targetEntity": "Customer|Product|Order|Unknown",
      "confidence": 0.95,
      "reasoning": "Contains email, name, purchase history fields typical of customer records"
    }
  ]
}`;

export async function detectEntitiesWithAI(profiles) {
  const summary = profiles.map(p => ({
    sheet: p.name,
    rowCount: p.rowCount,
    columns: p.columns.map(c => ({
      name: c.name,
      type: c.type,
      nullable: c.nullable,
      sample: c.sample,
    })),
  }));

  const userPrompt = `Analyze this data profile and identify entities:\n\n${JSON.stringify(summary, null, 2)}`;

  try {
    const response = await callModel({
      system: ENTITY_DETECTION_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      tools: [],
    });

    const cleaned = response.text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error("AI entity detection failed:", err);
    return { entities: [] };
  }
}

const ENHANCED_MAPPING_PROMPT = `You are a high-precision AI data mapping engine. You are given source columns, sample data values, and pre-calculated vector embedding similarity hints.

Your task: Reason over the vector hints, column names, and data types, then map each source column to its target database field.

Target entity schemas:
${JSON.stringify(ENTITY_DEFINITIONS, null, 2)}

For each source column, provide:
1. "sourceSheet": sheet name
2. "sourceColumn": original column header
3. "targetEntity": Customer | Product | Order | Unknown
4. "targetField": field name inside entity (e.g. "email", "price", "quantity")
5. "confidence": float between 0.0 and 1.0
6. "transform": optional transformation string (e.g. "toLowerCase", "parseNumber", "formatDate", "toBoolean")
7. "reasoning": clear concise explanation of why this mapping was chosen

Return ONLY valid JSON format:
{
  "mappings": [
    {
      "sourceSheet": "Sheet1",
      "sourceColumn": "client_email",
      "targetEntity": "Customer",
      "targetField": "email",
      "confidence": 0.98,
      "transform": "toLowerCase",
      "reasoning": "Vector similarity (87%) + sample values match email format."
    }
  ],
  "unmappedColumns": [],
  "warnings": []
}`;

/**
 * Enhanced AI Mapper combining LLM reasoning, Dense Vector Embedding hints, and Few-Shot Learning (Task 1.5 + 2.1).
 */
export async function generateMappingsWithAI(profiles, entityDetections, merchantId = 1) {
  const relevantProfiles = profiles.filter(p => 
    entityDetections.entities.some(e => e.sourceSheet === p.name && e.targetEntity !== "Unknown")
  );

  // Compute vector embedding hints for all columns in relevant sheets
  const sheetSummariesWithVectorHints = await Promise.all(
    relevantProfiles.map(async (p) => {
      const sheetEntity = entityDetections.entities.find(e => e.sourceSheet === p.name)?.targetEntity;
      const columnNames = p.columns.map(c => c.name);

      // Reconstruct sample rows for vector pattern check
      const sampleRows = [0, 1, 2].map(rowIdx => {
        const row = {};
        p.columns.forEach(c => {
          row[c.name] = c.sample[rowIdx] ?? "";
        });
        return row;
      });

      // Get vector similarity matches for these columns
      const vectorMatchesResult = await semanticMatcher.matchColumns(columnNames, sampleRows, merchantId);

      // (NEW Task 2.1) Fetch few-shot learning examples for this entity
      const { feedbackLoop } = await import("./feedbackLoop.js");
      let fewShotExamples = [];
      try {
        if (sheetEntity) {
          fewShotExamples = await feedbackLoop.getFewShotExamples(merchantId, sheetEntity, 5);
        }
      } catch(e) {
        // Safe fail if DB not migrated yet during development
        console.warn("Could not fetch few-shot examples:", e.message);
      }

      return {
        sheet: p.name,
        entity: sheetEntity,
        pastLearnedMappings: fewShotExamples.map(f => `${f.sourceColumn} -> ${f.targetField} (Confidence: ${f.confidenceScore})`),
        columns: p.columns.map(c => {
          const vMatch = vectorMatchesResult.mappings.find(m => m.sourceColumn === c.name);
          return {
            name: c.name,
            detectedType: c.type,
            sampleValues: c.sample,
            vectorAIRecommendation: vMatch ? {
              targetEntity: vMatch.targetEntity,
              targetField: vMatch.targetField,
              vectorConfidence: vMatch.confidence,
              matchStrategy: vMatch.strategyUsed,
              reason: vMatch.reason,
            } : null,
          };
        }),
      };
    })
  );

  const userPrompt = `Synthesize these column profiles, vector similarity hints, and past learned mappings into final AI mappings:\n\n${JSON.stringify(sheetSummariesWithVectorHints, null, 2)}`;

  try {
    const response = await callModel({
      system: ENHANCED_MAPPING_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      tools: [],
    });

    let rawText = response.text || "";
    // Extract JSON object if wrapped in markdown or extra text
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn("LLM JSON parse fallback to vector hints:", err.message);

    // Resilient Fallback: construct mappings directly from calculated vector hints
    const fallbackMappings = [];
    sheetSummariesWithVectorHints.forEach(sheetSummary => {
      sheetSummary.columns.forEach(c => {
        if (c.vectorAIRecommendation && c.vectorAIRecommendation.targetField) {
          fallbackMappings.push({
            sourceSheet: sheetSummary.sheet,
            sourceColumn: c.name,
            targetEntity: c.vectorAIRecommendation.targetEntity || sheetSummary.entity,
            targetField: c.vectorAIRecommendation.targetField,
            confidence: c.vectorAIRecommendation.vectorConfidence || 0.85,
            transform: null,
            reasoning: c.vectorAIRecommendation.reason || `Vector match with ${(c.vectorAIRecommendation.vectorConfidence * 100).toFixed(0)}% similarity.`,
          });
        }
      });
    });

    return { mappings: fallbackMappings, unmappedColumns: [], warnings: [] };
  }
}

export { ENTITY_DEFINITIONS };