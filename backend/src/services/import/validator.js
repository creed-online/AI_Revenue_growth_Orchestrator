import { prisma } from "../../lib/prisma.js";
import { ENTITY_DEFINITIONS } from "./dataProfiler.js";

const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.90,
  MEDIUM: 0.70,
  LOW: 0.70,
};

export function assessConfidence(confidence) {
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return "HIGH";
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return "MEDIUM";
  return "LOW";
}

export function validateRequiredFields(record, targetEntity) {
  const entityDef = ENTITY_DEFINITIONS[targetEntity];
  if (!entityDef) return { valid: true, missing: [] };

  const missing = [];
  for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
    if (fieldDef.required && (record[fieldName] === null || record[fieldName] === undefined)) {
      missing.push(fieldName);
    }
  }
  return { valid: missing.length === 0, missing };
}

export function validateRecord(record, targetEntity) {
  const entityDef = ENTITY_DEFINITIONS[targetEntity];
  if (!entityDef) return { valid: true, errors: [] };

  const errors = [];
  const fieldErrors = {};

  for (const [fieldName, fieldDef] of Object.entries(entityDef.fields)) {
    const value = record[fieldName];

    if (fieldDef.required && (value === null || value === undefined)) {
      fieldErrors[fieldName] = `Required field missing`;
      continue;
    }

    if (value === null || value === undefined) continue;

    if (fieldDef.format === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
      fieldErrors[fieldName] = `Invalid email format`;
    }

    if (fieldDef.type === "integer" && !Number.isInteger(Number(value))) {
      fieldErrors[fieldName] = `Must be an integer`;
    }

    if (fieldDef.type === "float" && isNaN(Number(value))) {
      fieldErrors[fieldName] = `Must be a number`;
    }

    if (fieldDef.type === "date" && !(value instanceof Date) && isNaN(Date.parse(value))) {
      fieldErrors[fieldName] = `Invalid date format`;
    }
  }

  return {
    valid: Object.keys(fieldErrors).length === 0,
    errors: fieldErrors,
  };
}

export async function buildLookupMaps(merchantId, mappings) {
  const customerEmails = new Set();
  const productNames = new Set();

  for (const mapping of mappings) {
    if (mapping.targetEntity === "Order") {
      if (mapping.targetField === "customerEmail") customerEmails.add(mapping.sourceColumn);
      if (mapping.targetField === "productName") productNames.add(mapping.sourceColumn);
    }
  }

  const [customers, products] = await Promise.all([
    customerEmails.size > 0
      ? prisma.customer.findMany({
          where: { merchantId },
          select: { id: true, email: true },
        })
      : [],
    productNames.size > 0
      ? prisma.product.findMany({
          where: { merchantId },
          select: { id: true, name: true },
        })
      : [],
  ]);

  const customerMap = new Map(customers.map(c => [c.email.toLowerCase(), c.id]));
  const productMap = new Map(products.map(p => [p.name, p.id]));

  return { customerMap, productMap };
}

export async function resolveRelationships(records, mappings, lookupMaps) {
  const { customerMap, productMap } = lookupMaps;
  const resolved = [];
  const unresolved = [];

  for (const record of records) {
    const orderMappings = mappings.filter(m => m.targetEntity === "Order");
    let hasUnresolved = false;
    const resolvedRecord = { ...record };

    for (const mapping of orderMappings) {
      const sourceValue = record[mapping.sourceColumn];
      if (!sourceValue) continue;

      if (mapping.targetField === "customerEmail" && customerMap) {
        const customerId = customerMap.get(String(sourceValue).toLowerCase());
        if (customerId) {
          resolvedRecord.customerId = customerId;
        } else {
          hasUnresolved = true;
          unresolved.push({
            type: "customer",
            sourceColumn: mapping.sourceColumn,
            sourceValue,
            record,
          });
        }
      }

      if (mapping.targetField === "productName" && productMap) {
        const productId = productMap.get(String(sourceValue));
        if (productId) {
          resolvedRecord.productId = productId;
        } else {
          hasUnresolved = true;
          unresolved.push({
            type: "product",
            sourceColumn: mapping.sourceColumn,
            sourceValue,
            record,
          });
        }
      }
    }

    if (!hasUnresolved) {
      resolved.push(resolvedRecord);
    }
  }

  return { resolved, unresolved };
}

export function detectDuplicates(records, keyFields) {
  const seen = new Map();
  const duplicates = [];

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const key = keyFields.map(f => record[f]).join("|");
    if (seen.has(key)) {
      duplicates.push({ index: i, record, duplicateOf: seen.get(key) });
    } else {
      seen.set(key, i);
    }
  }

  return {
    uniqueRecords: records.filter((_, i) => !duplicates.some(d => d.index === i)),
    duplicates,
  };
}

export async function validateImportData(merchantId, records, mappings, options = {}) {
  const { skipDuplicateCheck = false, keyFields = ["email"] } = options;

  const results = {
    total: records.length,
    valid: 0,
    invalid: 0,
    duplicates: 0,
    byEntity: {},
    errors: [],
    warnings: [],
  };

  const entityRecords = {};
  for (const record of records) {
    for (const mapping of mappings) {
      if (!mapping.targetEntity) continue;
      if (!entityRecords[mapping.targetEntity]) entityRecords[mapping.targetEntity] = [];
      const normalized = normalizeRow(record, mappings);
      if (Object.keys(normalized).length > 0) {
        entityRecords[mapping.targetEntity].push(normalized);
      }
      break;
    }
  }

  for (const [entity, entityData] of Object.entries(entityRecords)) {
    results.byEntity[entity] = { total: entityData.length, valid: 0, invalid: 0, errors: [] };

    for (let i = 0; i < entityData.length; i++) {
      const record = entityData[i];
      const validation = validateRecord(record, entity);

      if (validation.valid) {
        results.valid++;
        results.byEntity[entity].valid++;
      } else {
        results.invalid++;
        results.byEntity[entity].invalid++;
        results.byEntity[entity].errors.push({ row: i, errors: validation.errors });
        results.errors.push({ entity, row: i, errors: validation.errors });
      }
    }

    if (!skipDuplicateCheck && entityData.length > 0) {
      const idFields = ENTITY_DEFINITIONS[entity]?.identifyingFields || keyFields;
      const { duplicates } = detectDuplicates(entityData, idFields);
      if (duplicates.length > 0) {
        results.duplicates += duplicates.length;
        results.warnings.push({
          entity,
          count: duplicates.length,
          message: `Found ${duplicates.length} potential duplicate(s) based on ${idFields.join(", ")}`,
        });
      }
    }
  }

  return results;
}

function normalizeRow(row, mappings) {
  const result = {};
  for (const mapping of mappings) {
    if (!mapping.targetField) continue;
    const sourceValue = row[mapping.sourceColumn];
    if (sourceValue !== undefined && sourceValue !== null && sourceValue !== "") {
      result[mapping.targetField] = sourceValue;
    }
  }
  return result;
}

export async function previewImport(merchantId, records, mappings) {
  const validation = await validateImportData(merchantId, records, mappings);
  const lookupMaps = await buildLookupMaps(merchantId, mappings);
  const { resolved, unresolved } = await resolveRelationships(records, mappings, lookupMaps);

  return {
    validation,
    relationships: {
      resolved: resolved.length,
      unresolved: unresolved.length,
      details: unresolved.slice(0, 10),
    },
    preview: resolved.slice(0, 5),
  };
}