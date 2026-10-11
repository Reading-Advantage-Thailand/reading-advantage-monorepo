/** A result column: its name and Postgres type name. */
export interface ColumnShape {
  name: string;
  type: string;
}

/** One difference found between the reference and the target. */
export interface Difference {
  kind: "missing-column" | "extra-column" | "type-mismatch" | "missing-row" | "extra-row" | "value-mismatch" | "query-error";
  detail: string;
}

/**
 * Compares the column shape of a target query result with a reference.
 * @param reference Columns from the legacy database.
 * @param target Columns from the new database.
 * @returns One difference for each missing, extra, or retyped column. Empty means match.
 */
export function diffColumnShapes(reference: ColumnShape[], target: ColumnShape[]): Difference[] {
  const out: Difference[] = [];
  const targetByName = new Map(target.map((c) => [c.name, c]));
  const refNames = new Set(reference.map((c) => c.name));
  for (const ref of reference) {
    const t = targetByName.get(ref.name);
    if (!t) out.push({ kind: "missing-column", detail: `${ref.name} (${ref.type})` });
    else if (t.type !== ref.type) out.push({ kind: "type-mismatch", detail: `${ref.name}: ${ref.type} -> ${t.type}` });
  }
  for (const t of target) {
    if (!refNames.has(t.name)) out.push({ kind: "extra-column", detail: `${t.name} (${t.type})` });
  }
  return out;
}

type Row = Record<string, unknown>;

function sortKey(row: Row): string {
  return typeof row.id === "string" || typeof row.id === "number" ? String(row.id) : JSON.stringify(row);
}

/**
 * Compares result rows, ordered by id (or by JSON text when a row has no id).
 * @param reference Rows from the legacy database.
 * @param target Rows from the new database.
 * @returns One difference for each missing row, extra row, or changed column value.
 */
export function diffRows(reference: Row[], target: Row[]): Difference[] {
  const out: Difference[] = [];
  const byKey = (rows: Row[]) => new Map(rows.map((r) => [sortKey(r), r]));
  const t = byKey(target);
  const r = byKey(reference);
  for (const [key, ref] of [...r].sort(([a], [b]) => a.localeCompare(b))) {
    const row = t.get(key);
    if (!row) {
      out.push({ kind: "missing-row", detail: key.slice(0, 80) });
      continue;
    }
    for (const col of Object.keys(ref)) {
      if (JSON.stringify(ref[col]) !== JSON.stringify(row[col])) {
        out.push({ kind: "value-mismatch", detail: `${key}.${col}` });
      }
    }
  }
  for (const key of [...t.keys()].sort()) {
    if (!r.has(key)) out.push({ kind: "extra-row", detail: key.slice(0, 80) });
  }
  return out;
}

/**
 * Applies owner-approved value fixes to reference rows, so that the fixed target values match.
 * @param reference Rows from the legacy database.
 * @param column The column that the fixes change.
 * @param fixes Each row id mapped to its approved value.
 * @returns The rows with the fixes applied, and the number of rows changed.
 */
export function applyExpectedFixes(
  reference: Row[],
  column: string,
  fixes: Readonly<Record<string, unknown>>,
): { rows: Row[]; applied: number } {
  let applied = 0;
  const rows = reference.map((row) => {
    const id = String(row.id);
    if (!Object.hasOwn(fixes, id)) return row;
    applied++;
    return { ...row, [column]: fixes[id] };
  });
  return { rows, applied };
}

const SHAPE_SQLSTATES = new Set(["42703", "42P01"]);

/**
 * Classifies a query error as a shape failure or a connection or config error.
 * @param error The error thrown by a Tutor read query.
 * @returns "shape" for SQLSTATE 42703 (undefined column) or 42P01 (undefined table); otherwise "connection".
 */
export function classifyQueryError(error: unknown): "shape" | "connection" {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && SHAPE_SQLSTATES.has(code) ? "shape" : "connection";
}
