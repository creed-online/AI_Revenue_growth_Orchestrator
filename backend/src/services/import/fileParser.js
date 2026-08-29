import * as XLSX from "xlsx";
import { parse as parseCSV } from "csv-parse/sync";
import { parseStringPromise } from "xml2js";

const SUPPORTED_MIME_TYPES = {
  "text/csv": "csv",
  "application/vnd.ms-excel": "xlsx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/json": "json",
  "text/tab-separated-values": "tsv",
  "application/xml": "xml",
  "text/xml": "xml",
};

const SUPPORTED_EXTENSIONS = {
  ".csv": "csv",
  ".xlsx": "xlsx",
  ".xls": "xlsx",
  ".json": "json",
  ".tsv": "tsv",
  ".xml": "xml",
};

export function detectFileType(file) {
  const ext = file.originalname?.toLowerCase().split(".").pop();
  const mime = file.mimetype;

  if (SUPPORTED_MIME_TYPES[mime]) return SUPPORTED_MIME_TYPES[mime];
  if (ext && SUPPORTED_EXTENSIONS[`.${ext}`]) return SUPPORTED_EXTENSIONS[`.${ext}`];

  return null;
}

export async function parseFile(file) {
  const type = detectFileType(file);
  if (!type) {
    throw new Error(`Unsupported file type: ${file.mimetype || file.originalname}`);
  }

  const buffer = file.buffer;

  switch (type) {
    case "csv":
      return parseCSV(buffer.toString("utf-8"), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
        relax_column_count: true,
      });

    case "tsv":
      return parseCSV(buffer.toString("utf-8"), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        delimiter: "\t",
        relax_quotes: true,
        relax_column_count: true,
      });

    case "json": {
      const text = buffer.toString("utf-8");
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    }

    case "xlsx": {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheets = {};

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, {
          defval: null,
          raw: false,
          dateNF: "yyyy-mm-dd",
        });
        if (rows.length > 0) {
          sheets[sheetName] = rows;
        }
      }

      return { type: "xlsx", sheets };
    }

    case "xml": {
      const text = buffer.toString("utf-8");
      const parsed = await parseStringPromise(text, {
        explicitArray: false,
        ignoreAttrs: true,
        mergeAttrs: true,
        trim: true,
      });
      return normalizeXML(parsed);
    }

    default:
      throw new Error(`Parser not implemented for type: ${type}`);
  }
}

function normalizeXML(obj) {
  if (Array.isArray(obj)) return obj;
  if (!obj || typeof obj !== "object") return [];

  const arrays = Object.values(obj).filter(v => Array.isArray(v));
  if (arrays.length === 1) return arrays[0];
  if (arrays.length > 1) return { sheets: Object.fromEntries(Object.entries(obj).filter(([_, v]) => Array.isArray(v))) };

  return [obj];
}

export function extractSheets(parsedData) {
  if (parsedData?.type === "xlsx" && parsedData.sheets) {
    return Object.entries(parsedData.sheets).map(([name, rows]) => ({
      name,
      rows,
      rowCount: rows.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
    }));
  }

  if (parsedData?.sheets) {
    return Object.entries(parsedData.sheets).map(([name, rows]) => ({
      name,
      rows,
      rowCount: rows.length,
      columns: rows.length > 0 ? Object.keys(rows[0]) : [],
    }));
  }

  if (Array.isArray(parsedData)) {
    return [{
      name: "data",
      rows: parsedData,
      rowCount: parsedData.length,
      columns: parsedData.length > 0 ? Object.keys(parsedData[0]) : [],
    }];
  }

  return [];
}

export function getFilePreview(parsedData, maxRows = 5) {
  const sheets = extractSheets(parsedData);
  return sheets.map(sheet => ({
    name: sheet.name,
    rowCount: sheet.rowCount,
    columns: sheet.columns,
    sample: sheet.rows.slice(0, maxRows),
  }));
}