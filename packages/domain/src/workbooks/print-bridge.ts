/**
 * Inline script injected into generated workbook HTML documents so the parent
 * frame can trigger printing through postMessage. The documents are rendered
 * in a sandboxed iframe with an opaque origin (srcDoc without
 * allow-same-origin), so the parent cannot call `contentWindow.print()`;
 * this listener is the only bridge. The strict message equality is the gate:
 * anything else, including cross-window noise, is ignored.
 */
export const PRINT_BRIDGE_SHIM = `
<script>
window.addEventListener('message', function (event) {
  if (typeof event.data === 'string' && event.data === 'workbook:print') {
    window.print();
  }
});
</script>
`;
