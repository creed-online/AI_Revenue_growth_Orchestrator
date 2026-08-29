import { ENTITY_DEFINITIONS } from "./dataProfiler.js";

const TRANSFORM_FUNCTIONS = {
  toLowerCase: (val) => String(val).toLowerCase().trim(),
  trim: (val) => String(val).trim(),
  parseInt: (val) => parseInt(String(val).replace(/[,\s]/g, ""), 10),
  parseFloat: (val) => parseFloat(String(val).replace(/[,\s₹$]/g, "")),
  parseBoolean: (val) => {
    const str = String(val).toLowerCase().trim();
    return ["true", "yes", "y", "1"].includes(str);
  },
  parseDate: (val) => {
    const str = String(val).trim();
    const formats = [
      /^(\d{4})-(\d{2})-(\d{2})$/,
      /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/,
      /^(\d{2})[\/\-](\d{2})[\/\-](\d{2})$/,
    ];
    for (const fmt of formats) {
      const match = str.match(fmt);
      if (match) {
        if (match[1].length === 4) return new Date(`${match[1]}-${match[2]}-${match[3]}`);
        return new Date(`${match[3]}-${match[2]}-${match[1]}`);
      }
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? null : parsed;
  },
  normalizeEmail: (val) => String(val).toLowerCase().trim(),
  normalizeName: (val) => String(val).trim().replace(/\s+/g, " "),
};

function applyTransform(value, transform) {
  if (!transform || value === null || value === undefined || value === "") return value;
  const fn = TRANSFORM_FUNCTIONS[transform];
  if (!fn) return value;
  try {
    return fn(value);
  } catch {
    return value;
  }
}

export function normalizeValue(value, targetType, transform) {
  if (value === null || value === undefined || value === "") return null;

  let transformed = applyTransform(value, transform);

  switch (targetType) {
    case "integer":
      const intVal = parseInt(String(transformed).replace(/[,\s]/g, ""), 10);
      return isNaN(intVal) ? null : intVal;
    case "float":
      const floatVal = parseFloat(String(transformed).replace(/[,\s₹$]/g, ""));
      return isNaN(floatVal) ? null : floatVal;
    case "boolean":
      if (typeof transformed === "boolean") return transformed;
      const str = String(transformed).toLowerCase().trim();
      return ["true", "yes", "y", "1"].includes(str);
    case "date":
      if (transformed instanceof Date) return transformed;
      const date = TRANSFORM_FUNCTIONS.parseDate(transformed);
      return date;
    case "email":
      return String(transformed).toLowerCase().trim();
    case "string":
    default:
      return String(transformed).trim();
  }
}

export function normalizeRow(row, mappings, entityDefinitions = ENTITY_DEFINITIONS) {
  const result = {};

  for (const mapping of mappings) {
    if (!mapping.targetField || !mapping.targetEntity) continue;

    const sourceValue = row[mapping.sourceColumn];
    if (sourceValue === undefined || sourceValue === null || sourceValue === "") continue;

    const entityDef = entityDefinitions[mapping.targetEntity];
    if (!entityDef) continue;

    const fieldDef = entityDef.fields[mapping.targetField];
    if (!fieldDef) continue;

    const normalized = normalizeValue(sourceValue, fieldDef.type, mapping.transform);
    if (normalized !== null) {
      result[mapping.targetField] = normalized;
    }
  }

  return result;
}

export function buildInsertData(rows, mappings, entityDefinitions = ENTITY_DEFINITIONS) {
  const byEntity = {};

  for (const row of rows) {
    for (const mapping of mappings) {
      if (!mapping.targetEntity || !mapping.targetField) continue;

      if (!byEntity[mapping.targetEntity]) {
        byEntity[mapping.targetEntity] = [];
      }

      const entityDef = entityDefinitions[mapping.targetEntity];
      if (!entityDef) continue;

      const fieldDef = entityDef.fields[mapping.targetField];
      if (!fieldDef) continue;

      const sourceValue = row[mapping.sourceColumn];
      if (sourceValue === undefined || sourceValue === null || sourceValue === "") continue;

      const normalized = normalizeValue(sourceValue, fieldDef.type, mapping.transform);
      if (normalized !== null) {
        byEntity[mapping.targetEntity].push({
          field: mapping.targetField,
          value: normalized,
          sourceColumn: mapping.sourceColumn,
        });
      }
    }
  }

  return byEntity;
}

export function compileRecordsByEntity(rows, mappings, entityDefinitions = ENTITY_DEFINITIONS) {
  const entityRows = {};

  for (const row of rows) {
    for (const mapping of mappings) {
      if (!mapping.targetEntity) continue;

      if (!entityRows[mapping.targetEntity]) {
        entityRows[mapping.targetEntity] = [];
      }

      const normalized = normalizeRow(row, mappings, entityDefinitions);
      if (Object.keys(normalized).length > 0) {
        entityRows[mapping.targetEntity].push(normalized);
      }
      break;
    }
  }

  return entityRows;
}