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

describe("Phase 4 runbook: the teacher routes flag command (F481, F491)", () => {
  it("turns the flag on with --update-env-vars and names the service, project, and region", () => {
    const line = text
      .split("\n")
      .find((entry) => entry.includes("--update-env-vars") && entry.includes(FLAG));
    expect(line, "the runbook must hold an --update-env-vars command for the flag").toBeDefined();
    expect(line ?? "", "the command must name the service").toContain("storytime-app");
    expect(line ?? "", "the command must name the project").toContain("--project primary-advantage");
    expect(line ?? "", "the command must name the region").toContain("--region asia-southeast1");
  });

  it("pins the live image, no traffic, and a tag on both flag commands (F491)", () => {
    const lines = text
      .split("\n")
      .filter((entry) => /--(update|remove)-env-vars/.test(entry) && entry.includes(FLAG));
    expect(
      lines.length,
      `flag_command_lines=${lines.length}: the runbook must hold the on and off commands`,
    ).toBe(2);
    for (const [index, line] of lines.entries()) {
      expect(line, `the command ${index} must pin the live image`).toContain("--image=");
      expect(line, `the command ${index} must hold --no-traffic`).toContain("--no-traffic");
      expect(line, `the command ${index} must hold a tag`).toContain("--tag=");
    }
  });

  it("reads the image of the live revision before the flag commands (F491)", () => {
    expect(
      text.includes("--format='value(status.traffic)'"),
      "the runbook must read the traffic split of the live service",
    ).toBe(true);
    expect(
      text.includes("--format='value(status.imageDigest)'"),
      "the runbook must read the image digest of the live revision",
    ).toBe(true);
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

  it("names the tag URL check before the traffic step, with no traffic-neutral claim (F491)", () => {
    expect(
      text.includes("traffic-neutral"),
      "the runbook must not call the flag commands traffic-neutral (F491)",
    ).toBe(false);
    const start = text.indexOf("## The teacher routes flag");
    const rest = text.slice(Math.max(0, start));
    const section = rest.slice(0, rest.indexOf("\n## ") === -1 ? undefined : rest.indexOf("\n## "));
    expect(section, "the flag section must exist").toBeDefined();
    expect(section.includes("teacher-flag-on"), "the runbook must tag the flag revision").toBe(true);
    expect(section, "the section must send the operator to the tag URL before the traffic step").toMatch(
      /tag URL/,
    );
    expect(section, "the traffic step must wait for Daniel's go").toMatch(/Daniel/);
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

/** Returns the flag section of the runbook, cut at the next top heading. */
function flagSection(): string {
  const start = text.indexOf("## The teacher routes flag");
  expect(start, "the flag section must exist").toBeGreaterThan(-1);
  const rest = text.slice(start);
  const stop = rest.indexOf("\n## ");
  return stop === -1 ? rest : rest.slice(0, stop);
}

describe("Phase 4 runbook: the flag carry-over, the env compare, and the image value (F495, F496)", () => {
  it("states that the flag stays in the service template and names the off command as the clear (F495)", () => {
    const section = flagSection();
    expect(
      section,
      "the runbook must say the flag stays in the service template after the on command",
    ).toMatch(/service template/);
    expect(
      section,
      "the runbook must say a traffic rollback does not remove the flag",
    ).toMatch(/traffic rollback/);
    expect(section, "the runbook must send the operator to the off command to clear the template").toMatch(
      /off command/,
    );
  });

  it("reads the flag state on the tag URL before each traffic step (F495)", () => {
    const section = flagSection();
    expect(section.includes("/th/teacher/2/1"), "the runbook must name the check route").toBe(true);
    expect(section.includes("tag URL"), "the runbook must read the state on the tag URL").toBe(true);
    expect(section.includes("flag state"), "the runbook must name the flag state").toBe(true);
  });

  it("compares the env of the new revision with the live revision before the traffic step (F495, review C)", () => {
    const section = flagSection();
    expect(
      section,
      "the runbook must send the operator to compare the environments",
    ).toMatch(/compare the environment/);
    const hits = section.split("\n").filter((line) => line.includes("spec.containers[0].env"));
    expect(
      hits.length,
      `env_describe_lines=${hits.length}: the runbook must describe both revisions`,
    ).toBe(2);
    for (const line of hits) {
      expect(line, "each describe line must name the service").toContain(
        "revisions describe",
      );
      expect(line, "each describe line must name the project").toContain(
        "--project primary-advantage",
      );
      expect(line, "each describe line must name the region").toContain("--region asia-southeast1");
    }
  });

  it("says the operator signs in on the tag URL host first (F495, review C)", () => {
    const section = flagSection();
    expect(section.includes("tag URL host"), "the runbook must name the tag URL host").toBe(true);
    expect(
      section.includes("session cookie"),
      "the runbook must explain the host binding of the session cookie",
    ).toBe(true);
  });

  it("names the image placeholder as a full reference and says the value goes into --image as it is (F496)", () => {
    const section = flagSection();
    const hits = section.split("\n").filter((line) =>
      line.includes("<the live revision image reference with its digest>"),
    );
    expect(
      hits.length,
      `image_placeholders=${hits.length}: both flag commands must hold the named placeholder`,
    ).toBe(2);
    for (const line of hits) {
      expect(line, "each placeholder line must pass the value into --image").toContain("--image=");
    }
    expect(
      section.includes("<the live revision image digest>"),
      "the old bare-digest placeholder must not stay (F496)",
    ).toBe(false);
    expect(
      section.includes("as it is"),
      "the runbook must say the read value goes into --image as it is",
    ).toBe(true);
    expect(
      section.includes("@sha256:"),
      "the runbook must name the full reference form with @sha256:",
    ).toBe(true);
  });
});
