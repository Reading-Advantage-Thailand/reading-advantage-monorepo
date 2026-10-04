/**
 * Print rules for the class sheet and the QR cards: A4 paper, and only the element marked
 * `data-print-area` prints. Every other element is hidden, and the ancestors of the print area
 * lose their layout (position, margins, transforms), so the area starts at the top of the page.
 */
const PRINT_CSS = `@media print {
  @page { size: A4; margin: 10mm; }
  body *:not([data-print-area]):not([data-print-area] *):not(:has([data-print-area])) { display: none !important; }
  body *:has([data-print-area]) {
    display: block !important; position: static !important; inset: auto !important; transform: none !important;
    margin: 0 !important; padding: 0 !important; border: 0 !important; box-shadow: none !important;
    width: auto !important; max-width: none !important; height: auto !important; min-height: 0 !important;
    overflow: visible !important; background: none !important;
  }
}`;

/**
 * Adds the print rules to the page. Render it once on a page or in a dialog that has a print area.
 * @returns A style element.
 */
export function PrintStyles() {
  return <style>{PRINT_CSS}</style>;
}
