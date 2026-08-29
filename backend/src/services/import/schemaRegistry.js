import { prisma } from "../../lib/prisma.js";

/**
 * Default core entities schema definition used for AI schema matching & mapping.
 */
const CORE_TARGET_ENTITIES = [
  {
    name: "Customer",
    tableName: "Customer",
    description: "Customer account records with repurchase indicators and lifetime value metrics.",
    fields: [
      { name: "name", type: "String", required: true, description: "Customer full name or store account handle", example: "Aarav Sharma" },
      { name: "email", type: "String", required: false, isUnique: true, description: "Primary contact email address", example: "aarav@example.com" },
      { name: "totalOrders", type: "Int", required: false, defaultValue: 1, description: "Total completed historical orders count", example: "5" },
      { name: "totalSpend", type: "Float", required: false, defaultValue: 0, description: "Total monetary amount spent across all orders", example: "24990.00" },
      { name: "avgOrderValue", type: "Float", required: false, defaultValue: 0, description: "Average monetary value per order", example: "4998.00" },
      { name: "isVip", type: "Boolean", required: false, defaultValue: false, description: "High-tier VIP customer flag", example: "true" },
      { name: "isDiscountSensitive", type: "Boolean", required: false, defaultValue: false, description: "Requires promotional discount to convert", example: "true" },
      { name: "isDormant", type: "Boolean", required: false, defaultValue: false, description: "Inactive or churn-risk customer flag", example: "false" },
    ],
  },
  {
    name: "Product",
    tableName: "Product",
    description: "Product catalog items with price points and replenishment settings.",
    fields: [
      { name: "name", type: "String", required: true, description: "Product display title or SKU item name", example: "Whey Protein Isolate 1kg" },
      { name: "price", type: "Float", required: true, description: "Unit selling price in merchant currency", example: "2499.00" },
      { name: "category", type: "String", required: false, defaultValue: "General", description: "Product department or merchandise category", example: "Supplements" },
      { name: "isReplenishable", type: "Boolean", required: false, defaultValue: true, description: "Whether product has predictable repurchase cycles", example: "true" },
      { name: "avgCycleDays", type: "Int", required: false, defaultValue: 30, description: "Average interval between customer repurchases in days", example: "30" },
    ],
  },
  {
    name: "Order",
    tableName: "Order",
    description: "Completed sales transactions linking customers to purchased products.",
    fields: [
      { name: "customerEmail", type: "String", required: true, description: "Email address of customer placing order (used for FK lookup)", example: "aarav@example.com" },
      { name: "productName", type: "String", required: true, description: "Title of product purchased (used for FK lookup)", example: "Whey Protein Isolate 1kg" },
      { name: "quantity", type: "Int", required: false, defaultValue: 1, description: "Number of units purchased in line item", example: "2" },
      { name: "price", type: "Float", required: false, description: "Unit price at time of transaction", example: "2499.00" },
      { name: "createdAt", type: "DateTime", required: false, description: "Timestamp when order was placed", example: "2026-07-20T10:00:00Z" },
    ],
  },
];

export class SchemaRegistry {
  constructor(prismaClient = prisma) {
    this.prisma = prismaClient;
  }

  /**
   * Introspects and returns the target database schema for a given merchant,
   * combining core Prisma model definitions and any merchant custom schema extensions.
   */
  async getTargetSchema(merchantId) {
    const safeMerchantId = Number(merchantId);
    let customExtensions = [];

    // Attempt to query merchant_schema_extensions if table exists
    if (safeMerchantId && this.prisma?.merchantSchemaExtension) {
      try {
        const exts = await this.prisma.merchantSchemaExtension.findMany({
          where: { merchantId: safeMerchantId }
        });
        customExtensions = exts.map(e => ({ entity_name: e.entityName, custom_fields: e.customFields }));
      } catch {
        customExtensions = [];
      }
    }

    // Clone core target schema
    const entities = JSON.parse(JSON.stringify(CORE_TARGET_ENTITIES));

    // Merge custom merchant extensions if present
    if (Array.isArray(customExtensions) && customExtensions.length > 0) {
      customExtensions.forEach((ext) => {
        const entity = entities.find((e) => e.name.toLowerCase() === (ext.entity_name || "").toLowerCase());
        if (entity && ext.custom_fields) {
          const fieldsToAdd = Array.isArray(ext.custom_fields) ? ext.custom_fields : Object.values(ext.custom_fields);
          fieldsToAdd.forEach((f) => {
            if (f && f.name && !entity.fields.some((existing) => existing.name === f.name)) {
              entity.fields.push({
                name: f.name,
                type: f.type || "String",
                required: Boolean(f.required),
                isCustom: true,
                description: f.description || `Custom merchant field ${f.name}`,
                example: f.example || "",
              });
            }
          });
        }
      });
    }

    return {
      merchantId: safeMerchantId || 1,
      version: "1.0",
      entities,
      totalEntities: entities.length,
      fieldCount: entities.reduce((acc, e) => acc + e.fields.length, 0),
    };
  }

  /**
   * Generates a flat registry list of all target field paths (e.g. "Customer.email", "Product.price").
   */
  async getFieldRegistry(merchantId) {
    const schema = await this.getTargetSchema(merchantId);
    const registry = [];

    schema.entities.forEach((entity) => {
      entity.fields.forEach((field) => {
        registry.push({
          entityName: entity.name,
          fieldName: field.name,
          fieldPath: `${entity.name}.${field.name}`,
          type: field.type,
          required: field.required,
          description: field.description,
          example: field.example,
        });
      });
    });

    return registry;
  }

  /**
   * Placeholder for Task 1.2 vector embeddings storage lookup.
   */
  async getSchemaEmbeddings(merchantId) {
    const registry = await this.getFieldRegistry(merchantId);
    return {
      merchantId,
      fieldsCount: registry.length,
      embeddings: {}, // Will be populated by EmbeddingService in Task 1.2
    };
  }
}

export const schemaRegistry = new SchemaRegistry();
export default schemaRegistry;

