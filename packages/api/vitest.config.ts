import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Only run the TypeScript sources. Without this, `tsc` build output
    // under `dist/__tests__/*.js` is collected as duplicate compiled test
    // copies, which fail on `vi.mock` hoisting that the `.ts` sources
    // handle correctly. Matches the exclusion in packages/storage.
    exclude: ["dist/**", "node_modules/**"],
  },
});
