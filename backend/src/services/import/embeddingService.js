import { schemaRegistry } from "./schemaRegistry.js";

/**
 * Common semantic synonym mappings for e-commerce, CRM, and ERP schema matching.
 */
const SYNONYM_DICTIONARY = {
  customer: ["cust", "client", "user", "buyer", "shopper", "person", "account"],
  email: ["mail", "email_address", "e_mail", "contact_email", "user_email"],
  name: ["title", "full_name", "first_name", "last_name", "display_name", "product_title", "cust_name"],
  price: ["cost", "amount", "rate", "value", "unit_price", "msrp", "fee"],
  spend: ["total_spend", "lifetime_value", "ltv", "total_paid", "spent"],
  quantity: ["qty", "count", "units", "amount_ordered", "item_count"],
  product: ["item", "sku", "merchandise", "good", "article"],
  category: ["dept", "department", "tag", "group", "type", "class"],
  order: ["transaction", "purchase", "sale", "invoice", "receipt"],
  date: ["timestamp", "created_at", "order_date", "purchase_date", "time"],
};

/**
 * Computes a normalized dense vector (128 dimensions) for a given text.
 */
function textToDenseVector(text = "") {
  const normalized = String(text).toLowerCase().trim().replace(/[^a-z0-9_\s]/g, "");
  const vector = new Float32Array(128);

  if (!normalized) return vector;

  const tokens = normalized.split(/[\s_.]+/).filter(Boolean);

  // 1. Token Hashing (Dimensions 0-63)
  tokens.forEach((token) => {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = (hash << 5) - hash + token.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % 64;
    vector[idx] += 1.0;

    // Check synonym dictionary
    Object.entries(SYNONYM_DICTIONARY).forEach(([concept, synonyms], sIdx) => {
      if (token === concept || synonyms.includes(token)) {
        vector[64 + (sIdx % 32)] += 2.0; // Boost concept dimension
      }
    });
  });

  // 2. Character Tri-gram Hashing (Dimensions 96-127)
  for (let i = 0; i < normalized.length - 2; i++) {
    const trigram = normalized.substring(i, i + 3);
    let hash = 0;
    for (let j = 0; j < trigram.length; j++) {
      hash = (hash << 3) - hash + trigram.charCodeAt(j);
      hash |= 0;
    }
    const idx = 96 + (Math.abs(hash) % 32);
    vector[idx] += 0.5;
  }

  // Normalize Vector (L2 Norm)
  let norm = 0;
  for (let i = 0; i < 128; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < 128; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

/**
 * Computes cosine similarity between two 128-dimensional vectors.
 */
export function calculateCosineSimilarity(v1, v2) {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < v1.length; i++) {
    dotProduct += v1[i] * v2[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}

export class EmbeddingService {
  constructor(registry = schemaRegistry) {
    this.schemaRegistry = registry;
    this.indexCache = new Map(); // merchantId -> IndexedTargetFields
  }

  /**
   * Generates a 128-dimensional dense vector embedding for text.
   */
  async embed(text) {
    return textToDenseVector(text);
  }

  /**
   * Pre-computes and indexes vector embeddings for all target schema fields.
   */
  async indexSchema(merchantId = 1) {
    const registry = await this.schemaRegistry.getFieldRegistry(merchantId);

    const indexedFields = await Promise.all(
      registry.map(async (field) => {
        const textToEmbed = `${field.entityName} ${field.fieldName} ${field.description} ${field.example}`;
        const vector = await this.embed(textToEmbed);
        return {
          ...field,
          vector,
        };
      })
    );

    this.indexCache.set(Number(merchantId), indexedFields);
    return indexedFields;
  }

  /**
   * Searches for top-K similar target schema fields given a source column query.
   */
  async searchSimilar(queryText, merchantId = 1, topK = 5) {
    let indexed = this.indexCache.get(Number(merchantId));
    if (!indexed) {
      indexed = await this.indexSchema(merchantId);
    }

    const queryVector = await this.embed(queryText);

    const scored = indexed.map((item) => {
      const similarityScore = calculateCosineSimilarity(queryVector, item.vector);
      return {
        fieldPath: item.fieldPath,
        entityName: item.entityName,
        fieldName: item.fieldName,
        type: item.type,
        required: item.required,
        similarityScore: Number(similarityScore.toFixed(4)),
      };
    });

    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    return scored.slice(0, topK);
  }
}

export const embeddingService = new EmbeddingService();
export default embeddingService;

