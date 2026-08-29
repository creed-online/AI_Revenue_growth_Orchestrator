export class SchemaDiffer {
  /**
   * Compares an uploaded/source schema against the target database schema
   * @param {Object} sourceSchema - e.g., { fields: { "client_email": { type: "string" }, "new_custom_field": { type: "string" } } }
   * @param {Object} targetSchema - e.g., { fields: { "email": { type: "string" }, "name": { type: "string" } } }
   * @param {Array} mappings - The AI mappings e.g., [{ sourceColumn: "client_email", targetField: "email" }]
   */
  diff(sourceSchema, targetSchema, mappings = []) {
    const diffResult = {
      added: [],
      removed: [],
      modified: [],
      compatible: true
    };

    const mappedSourceCols = mappings.map(m => m.sourceColumn);
    const mappedTargetFields = mappings.map(m => m.targetField);

    // 1. Detect ADDED (Drift) - Columns in source that are NOT mapped to any target field
    // sourceSchema.fields could be an array or object depending on how it's passed. Let's assume array of {name, type}
    const sourceFields = Array.isArray(sourceSchema.fields) 
      ? sourceSchema.fields 
      : Object.entries(sourceSchema.fields || {}).map(([name, def]) => ({ name, type: def.type }));

    for (const field of sourceFields) {
      if (!mappedSourceCols.includes(field.name)) {
        diffResult.added.push({
          name: field.name,
          type: field.type || 'string',
          reason: 'Present in source but unmapped to target'
        });
      }
    }

    // 2. Detect REMOVED - Required target fields that are NOT present in mappings
    const targetFields = Array.isArray(targetSchema.fields) 
      ? targetSchema.fields 
      : Object.entries(targetSchema.fields || {}).map(([name, def]) => ({ name, ...def }));

    for (const field of targetFields) {
      if (field.required && !mappedTargetFields.includes(field.name)) {
        diffResult.removed.push({
          name: field.name,
          type: field.type,
          reason: 'Required target field missing from source mappings'
        });
        diffResult.compatible = false;
      }
    }

    // 3. Detect MODIFIED - Type mismatches in mapped fields
    for (const mapping of mappings) {
      const sourceDef = sourceFields.find(f => f.name === mapping.sourceColumn);
      const targetDef = targetFields.find(f => f.name === mapping.targetField);

      if (sourceDef && targetDef && sourceDef.type !== targetDef.type) {
        // We tolerate some AI transformations, but we flag the raw mismatch
        diffResult.modified.push({
          sourceColumn: mapping.sourceColumn,
          targetField: mapping.targetField,
          sourceType: sourceDef.type,
          targetType: targetDef.type,
          reason: `Type mismatch: Source is ${sourceDef.type}, Target is ${targetDef.type}. AI Transform: ${mapping.transform || 'None'}`
        });
      }
    }

    return diffResult;
  }

  /**
   * Generates a SQL migration to add the "drifted" columns to the merchant's custom schema
   * @param {Object} diff - The result from diff()
   * @param {String} entityName - Target entity, e.g., 'Customer'
   * @param {Number} merchantId - The isolated merchant ID
   */
  generateMigration(diff, entityName, merchantId = 1) {
    const sqlStatements = [];
    const warnings = [];
    let reversible = true;

    if (diff.added.length === 0) {
      return { sql: '-- No schema drift detected. Database is up to date.', reversible, warnings };
    }

    sqlStatements.push(`-- Auto-generated Schema Drift Migration for Merchant #${merchantId}`);
    sqlStatements.push(`-- Entity: ${entityName}`);
    sqlStatements.push('');

    const customFieldsJson = {};
    diff.added.forEach(field => {
      customFieldsJson[field.name] = { type: field.type, required: false };
      warnings.push(`Column '${field.name}' is unrecognized. Suggesting it as a Custom Field extension.`);
    });

    const jsonString = JSON.stringify(customFieldsJson).replace(/'/g, "''"); // escape SQL quotes

    // Generate pseudo-SQL for the future merchant_schema_extensions table
    sqlStatements.push(`INSERT INTO merchant_schema_extensions (merchant_id, entity_name, custom_fields)`);
    sqlStatements.push(`VALUES (${merchantId}, '${entityName}', '${jsonString}')`);
    sqlStatements.push(`ON CONFLICT (merchant_id, entity_name)`);
    sqlStatements.push(`DO UPDATE SET custom_fields = merchant_schema_extensions.custom_fields || '${jsonString}';`);

    return {
      sql: sqlStatements.join('\n'),
      reversible,
      warnings
    };
  }
}

export const schemaDiffer = new SchemaDiffer();

