import { copyFileSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const packageRoot = process.cwd();
const checker = resolve(packageRoot, "scripts/check-accepted-inputs.mjs");

function runCheckerWithPathReplacement(replacement: string) {
  const temporaryChecker = resolve(
    packageRoot,
    `scripts/.check-accepted-inputs-${randomUUID()}.mjs`,
  );
  try {
    copyFileSync(checker, temporaryChecker);
    writeFileSync(
      temporaryChecker,
      readFileSync(temporaryChecker, "utf8").replace(
        "measure/archive/apk_independent_acceptance_handoff_20260712",
        replacement,
      ),
    );
    const result = spawnSync(process.execPath, [temporaryChecker], {
      encoding: "utf8",
    });
    return result;
  } finally {
    unlinkSync(temporaryChecker);
  }
}

describe("accepted-inputs checker archive paths", () => {
  it("resolves accepted artifacts from measure/archive", () => {
    const result = spawnSync(process.execPath, [checker], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("All accepted-input bindings verified.");
  });

  it("fails closed when the archived artifact directory is stale or missing", () => {
    const stale = runCheckerWithPathReplacement(
      "measure/tracks/apk_independent_acceptance_handoff_20260712",
    );
    const missing = runCheckerWithPathReplacement(
      "measure/archive/missing-apk_independent_acceptance_handoff_20260712",
    );

    expect(stale.status).not.toBe(0);
    expect(missing.status).not.toBe(0);
  });
});
