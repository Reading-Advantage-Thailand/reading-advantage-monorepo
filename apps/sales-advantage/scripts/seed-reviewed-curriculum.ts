import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { client } from "@reading-advantage/db/client";

import { assertCurriculumReleaseReady } from "./curriculum-release";
import {
  buildStaticSalesCurriculumRows,
  SALES_CURRICULUM_EXPECTED_COUNTS,
  seedStaticSalesCurriculum,
} from "./static-seed";

/** Seeds only a graph backed by explicit, graph-bound human approval evidence. */
async function main(): Promise<void> {
  if (process.argv.includes("--force")) {
    throw new Error("SALES_CURRICULUM_FORCE_RESEED_FORBIDDEN");
  }
  const manifestPath = fileURLToPath(
    new URL("../curriculum/release-candidate.json", import.meta.url),
  );
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
  await assertCurriculumReleaseReady(
    manifest,
    buildStaticSalesCurriculumRows(),
    {
      sourceRoot: process.env.SALES_CURRICULUM_SOURCE_ROOT
        ? resolve(process.env.SALES_CURRICULUM_SOURCE_ROOT)
        : undefined,
      workspaceRoot: resolve(import.meta.dirname, "../../.."),
      approvalSha256: process.env.SALES_CURRICULUM_APPROVAL_SHA256,
    },
  );
  const result = await seedStaticSalesCurriculum();
  process.stdout.write(
    `Sales curriculum ${result}: ${JSON.stringify(SALES_CURRICULUM_EXPECTED_COUNTS)}\n`,
  );
}

main()
  .catch((error: unknown) => {
    process.stderr.write(
      `Sales curriculum seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
