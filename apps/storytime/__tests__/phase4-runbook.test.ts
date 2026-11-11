// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The deploy runbook contract for the teacher routes flag (remediation round 3, findings F481
 * and F471).
 *
 * The runbook is the only text that tells an operator how to turn the teacher routes on. The
 * command must change one variable and keep the rest (`--update-env-vars`), must name the
 * service, the project, and the region like every other gcloud line of the runbook, and must
 * hold the documented way back. The text must hold no `--set-env-vars` anywhere: that flag
 * replaces the whole set of environment variables of the service.
 */

/** The repo root, found from this file. */
const REPO = resolve(import.meta.dirname, "../../..");

/** The runbook text. */
const text = readFileSync(resolve(REPO, "docs/runbooks/storytime-deploy.md"), "utf8");

/** The environment variable of the teacher routes. */
const FLAG = "STORYTIME_TEACHER_ROUTES";

/**
 * Returns the lines of a text that hold a gcloud env-var flag (A3: a labeled list).
 * @param source The text to scan.
 * @returns One entry per matching line, with the matched flag.
 */
function envVarFlagLines(source: string): string[] {
  const hits: string[] = [];
  for (const line of source.split("\n")) {
    if (/--(set|update|remove)-env-vars/.test(line)) hits.push(line.trim());
  }
  return hits;
}

describe("Phase 4 runbook: the teacher routes flag command (F481)", () => {
  it("turns the flag on with --update-env-vars and names the service, project, and region", () => {
    const line = text
      .split("\n")
      .find((entry) => entry.includes("--update-env-vars") && entry.includes(FLAG));
    expect(line, "the runbook must hold an --update-env-vars command for the flag").toBeDefined();
    expect(line ?? "", "the command must name the service").toContain("storytime-app");
    expect(line ?? "", "the command must name the project").toContain("--project primary-advantage");
    expect(line ?? "", "the command must name the region").toContain("--region asia-southeast1");
  });

  it("holds the removal command as the documented way back", () => {
    const line = text
      .split("\n")
      .find((entry) => entry.includes("--remove-env-vars") && entry.includes(FLAG));
    expect(line, "the runbook must hold an --remove-env-vars command for the flag").toBeDefined();
    expect(line ?? "", "the removal command must name the service").toContain("storytime-app");
    expect(line ?? "", "the removal command must name the project").toContain(
      "--project primary-advantage",
    );
    expect(line ?? "", "the removal command must name the region").toContain(
      "--region asia-southeast1",
    );
  });

  it("keeps Daniel's go next to the flag commands", () => {
    const at = text.indexOf("--update-env-vars");
    expect(at, "the runbook must hold the --update-env-vars command").toBeGreaterThan(-1);
    const near = text.slice(Math.max(0, at - 600), at + 600);
    expect(near, "the flag step must wait for Daniel's go").toMatch(/Daniel/);
  });

  it("holds no --set-env-vars anywhere, with a positive control that can fail", () => {
    const hits = envVarFlagLines(text);
    const setters = hits.filter((line) => line.includes("--set-env-vars"));
    expect(
      hits.length,
      `env_var_flag_lines=${hits.length}: the runbook must hold the flag commands`,
    ).toBeGreaterThan(0);
    expect(
      setters,
      `set_env_vars_lines=${setters.length}: --set-env-vars replaces every variable of the service (F481)`,
    ).toEqual([]);
    // Positive control: the same check must fail on a text that holds --set-env-vars.
    const planted = `gcloud run services update storytime-app --set-env-vars ${FLAG}=1`;
    expect(envVarFlagLines(planted).filter((line) => line.includes("--set-env-vars")).length).toBe(
      1,
    );
  });
});
