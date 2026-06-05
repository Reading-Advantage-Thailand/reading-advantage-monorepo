/**
 * Deterministic 1×1 PNG buffer for AI image-generator tests.
 *
 * Used by:
 *   - Phase 2 mock-provider tests (asserting `generateImage` returns a Buffer)
 *   - Phase 7 ImageGenerator regression net (asserting the AIClient.generateImage
 *     contract is preserved across the lib/ai refactor)
 *   - The shared contract harness (`__fixtures__/contract-suite.ts`)
 *
 * The bytes are the canonical minimal 1×1 transparent PNG (~70 bytes,
 * base64-encoded below). Kept as a `.ts` module rather than a `.png` binary
 * so the package's existing Vitest/tsc pipeline can import it without
 * additional asset-loader configuration.
 *
 * If `AIClient.generateImage` ever changes its return type from `Buffer`,
 * the snapshot test in `__tests__/phase-2-mock-provider.test.ts` will fail
 * here first — that is the intended drift detector.
 */

const DIAGRAM_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=";

/**
 * 1×1 transparent PNG as a Node Buffer. Suitable for asserting
 * `Buffer.isBuffer(...)` and round-trip identity in tests.
 */
export const diagramBuffer: Buffer = Buffer.from(DIAGRAM_PNG_BASE64, "base64");

/**
 * The same fixture exposed as base64, in case a test wants to compare
 * against the on-wire format without re-encoding.
 */
export const diagramBase64: string = DIAGRAM_PNG_BASE64;
