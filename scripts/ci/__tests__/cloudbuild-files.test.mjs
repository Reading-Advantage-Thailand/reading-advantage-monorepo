#!/usr/bin/env node
/**
 * Red tests for Phase 2 of the track `per_app_cicd_20261107`.
 *
 * The cases are F-01 to F-16 of `measure/tracks/per_app_cicd_20261107/test-strategy.md`
 * section P2.4. They are artifact tests of the Cloud Build files and of the traffic
 * runbook. They never run Cloud Build.
 *
 * Run with the Red command of test-strategy section P2.3.
 *
 * @module cloudbuild-files.test
 */
import { describe, it } from "vitest";
import {
  allWorkflowFiles,
  cloudbuild,
  databaseSteps,
  dbToken,
  deployStep,
  ordered,
  readText,
  stepIds,
  stepText,
} from "./helpers/plan.mjs";

/**
 * Throw when a condition is false.
 *
 * @param {unknown} condition The condition.
 * @param {string} message The failure message.
 * @returns {void}
 */
function must(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Apply the AC-2.6 guard rule to a list of steps.
 *
 * @param {Record<string, unknown>[]} steps The steps.
 * @returns {boolean} True when every database step follows a refuse-legacy-db step.
 */
function guardRule(steps) {
  let guard = false;
  for (const step of steps) {
    if (step.id === "refuse-legacy-db") guard = true;
    else if (dbToken(step) && !guard) return false;
  }
  return true;
}

describe("F: Cloud Build files", () => {
  it("F-01 the primary push file holds no database step", () => {
    const doc = cloudbuild("apps/primary-advantage/cloudbuild.yaml");
    const steps = doc.steps ?? [];
    must(steps.length >= 1, "push_steps=0");
    const bad = [];
    for (const step of steps) {
      if (["refuse-legacy-db", "migrate-db", "doctor-check"].includes(String(step.id ?? ""))) {
        bad.push(String(step.id));
      }
      if (dbToken(step)) bad.push(String(step.id ?? ""));
    }
    const ids = [...new Set(bad)];
    must(
      ids.length === 0,
      `primary push file holds database steps: ${ids.join(",")}`,
    );
    const found = databaseSteps(doc);
    must(found.length === 0, `db_steps_found=${found.length}`);
  });

  it("F-02 the guard rule on a fixture", () => {
    const withoutGuard = [{ id: "migrate-db", entrypoint: "bash", secretEnv: ["DATABASE_URL"] }];
    const withGuard = [
      { id: "refuse-legacy-db", entrypoint: "bash", secretEnv: ["DATABASE_URL"] },
      { id: "migrate-db", entrypoint: "bash", secretEnv: ["DATABASE_URL"] },
    ];
    const cases = [
      [withoutGuard, false],
      [withGuard, true],
    ];
    must(cases.length === 2, `guard_rule_cases=${cases.length}`);
    for (const [steps, expected] of cases) {
      must(guardRule(steps) === expected, `a guard rule case returned the wrong answer`);
    }
  });

  it("F-03 the primary traffic file orders the guard, migrate, doctor, and the move", () => {
    const doc = cloudbuild("apps/primary-advantage/cloudbuild-traffic.yaml");
    const ids = ordered(
      doc,
      ["refuse-legacy-db", "migrate-db", "doctor-check", "update-traffic"],
      "primary traffic",
    );
    must(ids.length >= 4, `steps_checked=${ids.length}`);
    const doctor = (doc.steps ?? []).find((step) => step.id === "doctor-check");
    must(doctor, "doctor-check step missing");
    const text = stepText(doctor);
    must(
      text.includes("--required-migration") && text.includes("0074_primary_help_events"),
      "doctor-check lost its --required-migration argument",
    );
    must(ids[ids.length - 1] === "update-traffic", "update-traffic is not last");
  });

  it("F-04 the traffic step holds a substitution and no literal revision", () => {
    const doc = cloudbuild("apps/primary-advantage/cloudbuild-traffic.yaml");
    const step = (doc.steps ?? []).find((candidate) => String(candidate.id ?? "") === "update-traffic");
    must(step, "update-traffic step missing");
    const text = stepText(step);
    must(
      /--to-revisions=/.test(text) || /--to-tags?=/.test(text),
      "the traffic move holds no substitution",
    );
    must(/\$/.test(text), "the traffic move holds no substitution variable");
    must(
      !/\b[a-z0-9-]+-\d{5}-[a-z0-9]{3}\b/.test(text),
      "the traffic move holds a literal revision",
    );
  });

  it("F-05 no workflow references a traffic file", () => {
    let refs = 0;
    for (const name of allWorkflowFiles()) {
      if (readText(`.github/workflows/${name}`).includes("cloudbuild-traffic")) refs += 1;
    }
    must(refs === 0, `traffic_refs=${refs}`);
  });
});
