import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { evaluateConsumerCompatibility, runtimeManifest } from "../index.js";
import { createWorkspaceLeaseRuntimeForTest } from "../release-artifact.js";

const ROOT = resolve(import.meta.dirname, "../../../..");
const SALES_DESCRIPTOR_PATH = resolve(
  ROOT,
  "packages/mastery-runtime-compat/fixtures/consumer/sales-advantage.json",
);
const LEASE_TEST_ROOT = resolve(
  ROOT,
  ".cache/mastery-runtime-compat/phase0-security-remediation",
);
const WORKSPACE_LEASE_STALE_AFTER_MS = 15 * 60 * 1_000;

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

  it("binds a lease to process-start identity and reclaims a mismatched owner", async () => {
    expect(process.platform).toBe("linux");
    await mkdir(LEASE_TEST_ROOT, { recursive: true });
    const root = await mkdtemp(join(LEASE_TEST_ROOT, "lease-"));
    const leasePath = resolve(root, ".workspace-build.lease");
    const runtime = await createWorkspaceLeaseRuntimeForTest({
      leasePath,
      now: Date.now,
      maxWaitMs: 1_000,
    });

    try {
      const lease = await runtime.acquire();
      const owner = JSON.parse(
        await readFile(resolve(leasePath, "owner.json"), "utf8"),
      ) as { processStartIdentity?: unknown };
      expect(owner.processStartIdentity).toMatch(/^\d+$/);
      const processStartIdentity = owner.processStartIdentity as string;
      await runtime.release(lease);

      await mkdir(leasePath);
      await writeFile(
        resolve(leasePath, "owner.json"),
        `${JSON.stringify({
          pid: process.pid,
          token: "mismatched-process-start-identity",
          acquiredAt: Date.now() - WORKSPACE_LEASE_STALE_AFTER_MS - 1,
          processStartIdentity: processStartIdentity === "0" ? "1" : "0",
        })}\n`,
        { flag: "wx" },
      );

      const reclaimedLease = await runtime.acquire();
      expect(reclaimedLease.token).not.toBe(
        "mismatched-process-start-identity",
      );
      await runtime.release(reclaimedLease);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
