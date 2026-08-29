import { schemaRegistry } from "./schemaRegistry.js";
import { embeddingService } from "./embeddingService.js";

/**
 * Normalizes text string for fuzzy string comparisons.
 */
function normalizeName(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Calculates Dice Coefficient fuzzy string similarity between two strings (0.0 to 1.0).
 */
function diceCoefficient(str1, str2) {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);

  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1.0 : 0.0;

  const getBigrams = (s) => {
    const bigrams = new Set();
    for (let i = 0; i < s.length - 1; i++) {
      bigrams.add(s.substring(i, i + 2));
    }
    return bigrams;
  };

  const bg1 = getBigrams(s1);
  const bg2 = getBigrams(s2);

  let intersection = 0;
  bg1.forEach((gram) => {
    if (bg2.has(gram)) intersection++;
  });

  return (2.0 * intersection) / (bg1.size + bg2.size);
}

/**
 * Tests sample data values against expected data types.
 */
function inspectValuePattern(sampleValues = [], expectedType = "String") {
  const nonNulls = sampleValues
    .map((v) => String(v ?? "").trim())
    .filter((v) => v.length > 0);

  if (nonNulls.length === 0) return 0;

  let matches = 0;

  nonNulls.forEach((val) => {
    switch (expectedType) {
      case "String":
        if (/^[a-zA-Z0-9\s._@\--]+$/.test(val)) matches++;
        break;
      case "Float":
      case "Int":
        if (!isNaN(Number(val.replace(/[$,₹]/g, "")))) matches++;
        break;
      case "Boolean":
        if (/^(true|false|1|0|yes|no)$/i.test(val)) matches++;
        break;
      case "DateTime":
        if (!isNaN(Date.parse(val)) || /^\d{4}-\d{2}-\d{2}/.test(val)) matches++;
        break;
      default:
        matches++;
    }
  });

  return matches / nonNulls.length;
}

export class SemanticMatcher {
  constructor(registry = schemaRegistry, embedder = embeddingService) {
    this.schemaRegistry = registry;
    this.embeddingService = embedder;
  }

  /**
   * Matches uploaded source columns to target schema fields combining:
   * 1. Exact name match (1.0)
   * 2. Fuzzy Dice string match (0.85 - 0.95)
   * 3. Vector embedding similarity (0.70 - 0.90)
   * 4. Sample value pattern verification (+0.05 to +0.10)
   */
  async matchColumns(sourceColumns = [], sampleRows = [], merchantId = 1) {
    const targetRegistry = await this.schemaRegistry.getFieldRegistry(merchantId);
    const mappings = [];

    for (const sourceCol of sourceColumns) {
      const normSource = normalizeName(sourceCol);
      const sampleValues = sampleRows.map((row) => row[sourceCol]).filter((v) => v !== undefined);

      let bestMatch = null;
      let highestScore = 0;
      let strategy = "none";
      let matchReason = "";

      for (const targetField of targetRegistry) {
        const normTargetName = normalizeName(targetField.fieldName);
        const normTargetPath = normalizeName(targetField.fieldPath);

        let currentScore = 0;
        let currentStrategy = "none";
        let reasonStr = "";

        // Strategy 1: Exact Name Match
        if (normSource === normTargetName || normSource === normTargetPath) {
          currentScore = 1.0;
          currentStrategy = "exact_match";
          reasonStr = `Exact match '${sourceCol}' === '${targetField.fieldPath}'`;
        }
        // Strategy 2: Prefix Strip & Fuzzy String Match
        else {
          // Check common prefix stripping: e.g. cust_email -> email, cust_name -> name
          const strippedSource = normSource.replace(/^(cust|customer|client|user|prod|product|order|item)/, "");
          if (strippedSource === normTargetName) {
            currentScore = 0.92;
            currentStrategy = "prefix_exact";
            reasonStr = `Prefix match '${sourceCol}' -> '${targetField.fieldPath}' (92%)`;
          } else {
            const nameFuzzy = diceCoefficient(sourceCol, targetField.fieldName);
            const pathFuzzy = diceCoefficient(sourceCol, targetField.fieldPath);
            const maxFuzzy = Math.max(nameFuzzy, pathFuzzy);

            if (maxFuzzy >= 0.7) {
              currentScore = 0.82 + (maxFuzzy - 0.7) * 0.5;
              currentStrategy = "fuzzy_string";
              reasonStr = `Fuzzy string similarity (${(maxFuzzy * 100).toFixed(0)}%) with '${targetField.fieldPath}'`;
            }
          }
        }

        // Strategy 3: Vector Semantic Embedding
        if (currentScore < 0.85) {
          const vectorMatches = await this.embeddingService.searchSimilar(sourceCol, merchantId, 5);
          const vecMatch = vectorMatches.find((vm) => vm.fieldPath === targetField.fieldPath);

          if (vecMatch && vecMatch.similarityScore >= 0.5) {
            const vectorScore = 0.70 + (vecMatch.similarityScore - 0.5) * 0.4;
            if (vectorScore > currentScore) {
              currentScore = vectorScore;
              currentStrategy = "semantic_embedding";
              reasonStr = `Semantic vector similarity (${(vecMatch.similarityScore * 100).toFixed(0)}%) with '${targetField.fieldPath}'`;
            }
          }
        }

        // Strategy 4: Sample Value Pattern Verification
        if (currentScore > 0.4 && sampleValues.length > 0) {
          const patternScore = inspectValuePattern(sampleValues, targetField.type);
          if (patternScore >= 0.8) {
            currentScore = Math.min(1.0, currentScore + 0.08);
            reasonStr += ` + verified ${targetField.type} sample data format`;
          } else if (patternScore < 0.2 && targetField.type !== "String") {
            currentScore = Math.max(0.2, currentScore - 0.15); // Penalty if format mismatches
          }
        }

        if (currentScore > highestScore) {
          highestScore = Number(currentScore.toFixed(4));
          bestMatch = targetField;
          strategy = currentStrategy;
          matchReason = reasonStr;
        }
      }

      mappings.push({
        sourceColumn: sourceCol,
        targetEntity: bestMatch ? bestMatch.entityName : null,
        targetField: bestMatch ? bestMatch.fieldName : null,
        targetPath: bestMatch ? bestMatch.fieldPath : null,
        confidence: highestScore,
        strategyUsed: strategy,
        isAutoMapped: highestScore >= 0.75,
        reason: matchReason || `No confident match found for '${sourceCol}'`,
      });
    }

    return {
      merchantId: Number(merchantId),
      totalColumns: sourceColumns.length,
      autoMappedCount: mappings.filter((m) => m.isAutoMapped).length,
      mappings,
    };
  }
}

export const semanticMatcher = new SemanticMatcher();
export default semanticMatcher;

