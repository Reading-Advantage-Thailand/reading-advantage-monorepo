/** A value that a CSV cell holds. `null` gives an empty cell. */
export type CsvCell = string | number | boolean | null;

/**
 * Quotes one CSV cell. Text that starts with `=`, `+`, `-`, `@`, a tab, or a carriage return gets
 * a leading single quote, so a spreadsheet does not run it as a formula (a number or numeric text
 * stays as it is). A cell with a comma, a quote, or a new line gets quotes, and each quote inside doubles.
 * @param value The cell value.
 * @returns The cell text for a CSV file.
 */
export function quoteCsvCell(value: CsvCell): string {
  let text = value === null ? "" : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Builds CSV text: the header row, then the rows in the given order, with a new line at the end.
 * The header is written as given (it must not need quotes).
 * @param header The column names.
 * @param rows The rows. Each cell goes through {@link quoteCsvCell}.
 * @returns The CSV text.
 */
export function toCsvText(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  return [header.join(","), ...rows.map((row) => row.map(quoteCsvCell).join(","))].join("\n") + "\n";
}
