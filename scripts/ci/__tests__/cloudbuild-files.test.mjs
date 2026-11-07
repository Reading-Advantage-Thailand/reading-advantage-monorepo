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
  readTable,
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

  it("F-06 accounts and workbooks deploy with no traffic and a tag", () => {
    const rows = [
      { id: "accounts", file: "apps/accounts/cloudbuild.yaml", prefix: "ac" },
      { id: "workbooks", file: "apps/workbooks/cloudbuild.yaml", prefix: "wb" },
    ];
    must(rows.length === 2, `files_checked=${rows.length}`);
    const problems = [];
    for (const row of rows) {
      const text = stepText(deployStep(cloudbuild(row.file)));
      if (!text.includes("--no-traffic")) {
        problems.push(`${row.id} deploy step has no --no-traffic`);
      }
      if (!text.includes(`--tag=${row.prefix}-${"${BUILD_ID:0:8}"}`)) {
        problems.push(`${row.id} deploy step has no tag`);
      }
      if (text.includes("update-traffic")) {
        problems.push(`${row.id} deploy step moves traffic`);
      }
    }
    must(problems.length === 0, `${problems.join("; ")} files_checked=2`);
  });

  it("F-07 the accounts and workbooks runtime flags stay", () => {
    const rows = [
      { id: "accounts", file: "apps/accounts/cloudbuild.yaml", serviceAccount: "accounts-cloud-run@", secrets: "--set-secrets=" },
      { id: "workbooks", file: "apps/workbooks/cloudbuild.yaml", serviceAccount: "workbooks-cloud-run@", secrets: "--set-secrets=" },
    ];
    must(rows.length === 2, `files_checked=${rows.length}`);
    for (const row of rows) {
      const text = stepText(deployStep(cloudbuild(row.file)));
      must(text.includes(row.serviceAccount), `${row.id}: --service-account missing`);
      must(text.includes(row.secrets), `${row.id}: --set-secrets missing`);
      must(text.includes("--add-cloudsql-instances="), `${row.id}: --add-cloudsql-instances missing`);
    }
  });

  it("F-08 the 9 non-excluded push files hold no database step", () => {
    const rows = readTable().filter((row) => row.mode !== "excluded");
    must(rows.length === 9, `files_checked=${rows.length}`);
    const withSteps = [];
    for (const row of rows) {
      const doc = cloudbuild(String(row.cloudbuild));
      const steps = doc.steps ?? [];
      must(steps.length >= 1, `${row.id}: steps=0`);
      const found = databaseSteps(doc);
      if (found.length > 0) withSteps.push(`${row.id}(${found.map((entry) => entry.id).join("+")})`);
    }
    must(
      withSteps.length === 0,
      `files_with_db_steps=${withSteps.length} files_checked=9: ${withSteps.join(",")}`,
    );
  });

  it("F-09 the database-step detector fixtures", () => {
    const fixtures = [
      {
        step: { args: ["run", "deploy", "x", "--set-secrets=DATABASE_URL=DB:latest"] },
        expected: null,
      },
      {
        step: { args: ["run", "deploy", "x", "--add-cloudsql-instances=reading-advantage:asia-southeast1:cloud-sql"] },
        expected: null,
      },
      {
        step: { entrypoint: "bash", args: ["-c", 'psql "$DATABASE_URL" -f probe.sql'] },
        expected: "psql",
      },
    ];
    must(fixtures.length === 3, `fixtures=${fixtures.length}`);
    for (const fixture of fixtures) {
      const token = dbToken(fixture.step);
      must(
        token === fixture.expected,
        `detector returned ${JSON.stringify(token)} expected ${JSON.stringify(fixture.expected)}`,
      );
    }
  });

  it("F-10 the accounts traffic file orders the five database steps and the move", () => {
    const doc = cloudbuild("apps/accounts/cloudbuild-traffic.yaml");
    const ids = ordered(
      doc,
      [
        "migrate-company-identity",
        "bootstrap-company-identity",
        "doctor-company-identity",
        "bootstrap-production-identity",
        "runtime-db-contract",
        "update-traffic",
      ],
      "accounts traffic",
    );
    must(ids.length >= 6, `steps_checked=${ids.length}`);
    const guard = ids.findIndex((id) => /refuse|guard/.test(id));
    if (guard >= 0) must(guard === 0, "a guard step is not first");
    must(ids[ids.length - 1] === "update-traffic", "update-traffic is not last");
  });
});
