import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { evaluateConsumerCompatibility, runtimeManifest } from "../index.js";

const ROOT = resolve(import.meta.dirname, "../../../..");
const SALES_DESCRIPTOR_PATH = resolve(
  ROOT,
  "packages/mastery-runtime-compat/fixtures/consumer/sales-advantage.json",
);

/** Returns an independent copy of the admitted Sales descriptor. */
async function readSalesDescriptor(): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(SALES_DESCRIPTOR_PATH, "utf8")) as Record<
    string,
    unknown
  >;
}

describe("Phase 0 security remediation", () => {
  it("rejects omitted and duplicate Sales imports", async () => {
    const descriptor = await readSalesDescriptor();
    const imports = descriptor.imports as Array<{
      package: string;
      export: string;
    }>;

    const missingImport = {
      ...descriptor,
      imports: imports.slice(0, 3),
    };
    const duplicateImport = {
      ...descriptor,
      imports: [imports[0], imports[0], imports[2], imports[3]],
    };

    for (const candidate of [missingImport, duplicateImport]) {
      expect(
        evaluateConsumerCompatibility(runtimeManifest, candidate),
      ).toMatchObject({
        compatible: false,
        issues: [
          expect.objectContaining({
            code: "IMPORT_SET_MISMATCH",
            path: "imports",
          }),
        ],
      });
    }
  });

  it("runs the packed import proof from the validated descriptor", async () => {
    const source = await readFile(
      resolve(
        ROOT,
        "packages/mastery-runtime-compat/fixtures/consumer/check-consumer.mjs",
      ),
      "utf8",
    );

    expect(source).toContain("for (const importEntry of descriptor.imports)");
    expect(source).toContain(
      "const result = gate.runConsumerCompatibilityGate(descriptor);",
    );
    expect(source).not.toContain("const enginePackages = [");
  });

  it("binds the production lease and output to immutable proof inputs", async () => {
    const source = await readFile(
      resolve(ROOT, "packages/mastery-runtime-compat/src/release-artifact.ts"),
      "utf8",
    );

    expect(source).toContain(
      "const workspaceLeaseRuntime: WorkspaceLeaseRuntimeContext",
    );
    expect(source).toContain("maxWaitMs: WORKSPACE_LEASE_MAX_WAIT_MS");
    expect(source).toContain(
      "processStartIdentity: await readProcessStartIdentity(process.pid)",
    );
    expect(source).toContain("runtimeDistSnapshotRoot");
    expect(source).toContain(
      "sourceDigestSha256: releaseInputs.sourceDigestSha256",
    );
    expect(source).toContain("archiveDigestsSha256");
    expect(source).toContain("auditedHead: releaseInputs.auditedHead");
  });
});
