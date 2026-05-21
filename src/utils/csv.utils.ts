/**
 * CSV export / import helpers for marketplace scripts.
 *
 * The CLI scripts already emit logs and ad-hoc JSON; multiple ops
 * workflows (analytics handoff, off-chain audits, dashboards) prefer
 * CSV. These helpers produce RFC-4180 compliant output and accept the
 * same dialect when parsing.
 *
 * Design notes:
 *
 *   - Pure: no FS, no globals. The CLI command layer is responsible
 *     for fs.writeFile / process.stdout.write.
 *   - Handles values containing the separator, quotes, or newlines by
 *     RFC-4180 quoting: surround with double quotes, escape inner
 *     double quotes by doubling them.
 *   - Accepts both arrays of objects (column header inferred from the
 *     first object's keys, or via an explicit `columns` option) and
 *     arrays of arrays (no header).
 *   - Coerces:
 *       - null / undefined  -> empty string
 *       - bigint            -> decimal string (no E notation)
 *       - number            -> JSON.stringify (keeps NaN / Infinity
 *                              visible rather than silently empty)
 *       - boolean           -> 'true' / 'false'
 *       - Date              -> ISO 8601
 *       - everything else   -> String(value)
 *
 * The parser accepts custom `separator` and `newline` strings so the
 * same module can read TSV.
 */

export type CsvCellPrimitive =
  | string
  | number
  | bigint
  | boolean
  | Date
  | null
  | undefined;

export type CsvRow = Record<string, CsvCellPrimitive> | readonly CsvCellPrimitive[];

export interface CsvWriteOptions {
  /** Field separator. Default ','. */
  separator?: string;
  /** Row separator. Default '\r\n' (RFC-4180). */
  newline?: string;
  /** Emit a UTF-8 BOM at the start (Excel friendliness). Default false. */
  bom?: boolean;
  /**
   * Explicit column order + header label. When omitted we use the keys
   * of the first object row in insertion order; for array rows we emit
   * no header.
   */
  columns?: ReadonlyArray<{ key: string; header?: string }>;
}

export interface CsvParseOptions {
  separator?: string;
  /** Treat the first row as a header. Default true. */
  hasHeader?: boolean;
  /**
   * When true and `hasHeader=true`, returns objects keyed by header.
   * When false, returns string[][] regardless. Default true.
   */
  asObjects?: boolean;
}

const DEFAULT_SEPARATOR = ',';
const DEFAULT_NEWLINE = '\r\n';
const UTF8_BOM = '\uFEFF';

function needsQuoting(value: string, separator: string): boolean {
  return (
    value.includes(separator) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  );
}

function coerceCell(value: CsvCellPrimitive): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  // Defensive — should never hit if callers honor the type, but keeps
  // the helper resilient for ad-hoc CLI use.
  return String(value);
}

function escapeCell(value: string, separator: string): string {
  if (!needsQuoting(value, separator)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Converts rows to a CSV string. Returns the full document including
 * the trailing newline (Excel and most tools require it).
 */
export function toCsv(
  rows: readonly CsvRow[],
  options: CsvWriteOptions = {},
): string {
  const separator = options.separator ?? DEFAULT_SEPARATOR;
  const newline = options.newline ?? DEFAULT_NEWLINE;

  let columnDefs = options.columns ?? null;
  const headerLine: string[] = [];
  const isArrayRow = (r: CsvRow): r is readonly CsvCellPrimitive[] =>
    Array.isArray(r);

  const firstRow = rows[0];
  if (!columnDefs && firstRow !== undefined && !isArrayRow(firstRow)) {
    columnDefs = Object.keys(firstRow).map((k) => ({ key: k }));
  }

  let header = '';
  if (columnDefs) {
    for (const c of columnDefs) {
      headerLine.push(escapeCell(c.header ?? c.key, separator));
    }
    header = headerLine.join(separator) + newline;
  }

  const bodyLines: string[] = [];
  for (const row of rows) {
    const cells: string[] = [];
    if (isArrayRow(row)) {
      for (const value of row) {
        cells.push(escapeCell(coerceCell(value), separator));
      }
    } else if (columnDefs) {
      for (const c of columnDefs) {
        const value = (row as Record<string, CsvCellPrimitive>)[c.key];
        cells.push(escapeCell(coerceCell(value), separator));
      }
    }
    bodyLines.push(cells.join(separator));
  }

  let body = bodyLines.join(newline);
  if (body.length > 0) body += newline;
  if (rows.length === 0 && !columnDefs) return '';

  return (options.bom ? UTF8_BOM : '') + header + body;
}

/**
 * Parses an RFC-4180 CSV string. Returns either an array of string
 * objects (when `hasHeader=true` and `asObjects=true`, the defaults)
 * or a flat string[][] otherwise.
 */
export function fromCsv(
  csv: string,
  options: CsvParseOptions = {},
): Array<Record<string, string>> | string[][] {
  const separator = options.separator ?? DEFAULT_SEPARATOR;
  const hasHeader = options.hasHeader ?? true;
  const asObjects = options.asObjects ?? true;

  // Strip optional BOM.
  const input = csv.startsWith(UTF8_BOM) ? csv.slice(1) : csv;

  const records: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === separator) {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (ch === '\r' || ch === '\n') {
      // Consume CRLF or LF as a single record terminator.
      row.push(field);
      field = '';
      records.push(row);
      row = [];
      if (ch === '\r' && input[i + 1] === '\n') i += 2;
      else i += 1;
      continue;
    }
    field += ch;
    i += 1;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  if (!hasHeader || !asObjects) {
    return records;
  }
  if (records.length === 0) return [];

  const header = records[0] ?? [];
  const body = records.slice(1);
  return body.map((cells) => {
    const obj: Record<string, string> = {};
    for (let col = 0; col < header.length; col += 1) {
      const key = header[col];
      if (key === undefined) continue;
      obj[key] = cells[col] ?? '';
    }
    return obj;
  });
}
