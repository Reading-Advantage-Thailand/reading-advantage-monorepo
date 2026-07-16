import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  loadProviderCounterexamples,
  validateCounterexampleSources,
} from "../counterexample-fixtures.js";

describe("provider architecture counterexample fixtures", () => {
  it("loads the complete named provider fixture matrix", () => {
    const cases = loadProviderCounterexamples();

    expect(cases.map((fixture) => fixture.id)).toEqual([
      "provider-ai-adapter",
      "provider-ai-alias-import",
      "provider-ai-client-construction",
      "provider-ai-credential-read",
      "provider-ai-direct-import",
      "provider-integration-adapter",
      "provider-integration-dynamic-import",
      "provider-storage-adapter",
      "provider-storage-barrel-import",
    ]);
    expect(
      cases.filter((fixture) => fixture.expected === "violation"),
    ).toHaveLength(6);
    expect(
      cases.filter((fixture) => fixture.expected === "allowed"),
    ).toHaveLength(3);
  });

  it("keeps every exact provider fixture readable and TypeScript-parseable", async () => {
    const result = await validateCounterexampleSources(
      fileURLToPath(new URL("../../../../", import.meta.url)),
      loadProviderCounterexamples(),
    );

    expect(result).toEqual({ filesChecked: 11, parseErrors: [] });
  });
});
