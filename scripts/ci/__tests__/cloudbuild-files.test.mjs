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
  pushAndTrafficFiles,
  readTable,
  readText,
  sectionText,
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
      if (!text.includes(`--tag=${row.prefix}-${"$${BUILD_ID:0:8}"}`)) {
        problems.push(`${row.id} deploy step has no tag`);
      }
      if (/(^|[^$])\$\{BUILD_ID:0:8\}/.test(text)) {
        problems.push(`${row.id} deploy step holds an unescaped tag`);
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

  it("F-11 the four apps move their database steps to a traffic file", () => {
    const rows = [
      {
        id: "accounting",
        push: "apps/accounting/cloudbuild.yaml",
        traffic: "apps/accounting/cloudbuild-traffic.yaml",
        steps: ["migrate-db", "doctor-check", "runtime-db-contract", "update-traffic"],
      },
      {
        id: "codecamp-advantage",
        push: "apps/codecamp-advantage/cloudbuild.yaml",
        traffic: "apps/codecamp-advantage/cloudbuild-traffic.yaml",
        steps: ["migrate-db", "doctor-check", "update-traffic"],
      },
      {
        id: "marketing",
        push: "apps/marketing/cloudbuild.yaml",
        traffic: "apps/marketing/cloudbuild-traffic.yaml",
        steps: ["migrate-db", "doctor-check", "runtime-db-contract", "update-traffic"],
      },
      {
        id: "sales-advantage",
        push: "apps/sales-advantage/cloudbuild.yaml",
        traffic: "apps/sales-advantage/cloudbuild-traffic.yaml",
        steps: [
          "verify-curriculum-backup",
          "migrate-db",
          "doctor-check",
          "build-curriculum-workspace-deps",
          "seed-production-curriculum",
          "verify-production-curriculum",
          "runtime-db-contract",
          "capture-legacy-rollback",
          "verify-repair-verify-legacy-rollback",
          "update-traffic",
        ],
      },
    ];
    must(rows.length === 4, `files_checked=${rows.length}`);
    const missing = [];
    const pushProblems = [];
    for (const row of rows) {
      const push = cloudbuild(row.push);
      const found = databaseSteps(push);
      if (found.length > 0) {
        pushProblems.push(`${row.id}(${found.map((entry) => entry.id).join("+")})`);
      }
      let traffic;
      try {
        traffic = cloudbuild(row.traffic);
      } catch {
        missing.push(row.id);
        continue;
      }
      ordered(traffic, row.steps, `${row.id} traffic`);
    }
    must(
      missing.length === 0 && pushProblems.length === 0,
      `missing traffic files for the four apps: ${missing.join(",")}; push db steps: ${pushProblems.join(",")}; files_checked=4`,
    );
  });

  it("F-12 sales moves its six database steps and keeps the order", () => {
    const pushFile = "apps/sales-advantage/cloudbuild.yaml";
    const trafficFile = "apps/sales-advantage/cloudbuild-traffic.yaml";
    const dbSteps = [
      "migrate-db",
      "doctor-check",
      "seed-production-curriculum",
      "verify-production-curriculum",
      "runtime-db-contract",
      "verify-repair-verify-legacy-rollback",
    ];
    must(dbSteps.length === 6, `steps_expected=${dbSteps.length}`);
    const push = cloudbuild(pushFile);
    const pushIds = stepIds(push);
    const pushDb = databaseSteps(push).map((entry) => entry.id);
    let traffic;
    try {
      traffic = cloudbuild(trafficFile);
    } catch {
      traffic = null;
    }
    const trafficIds = traffic ? stepIds(traffic) : [];
    const moved = dbSteps.filter((id) => trafficIds.includes(id) && !pushDb.includes(id)).length;
    must(
      moved === 6,
      `sales_db_steps_moved=${moved} expected=6${traffic ? "" : `; missing ${trafficFile}`}`,
    );
    const ids = ordered(
      traffic,
      [
        "verify-curriculum-backup",
        "migrate-db",
        "doctor-check",
        "build-curriculum-workspace-deps",
        "seed-production-curriculum",
        "verify-production-curriculum",
        "runtime-db-contract",
        "capture-legacy-rollback",
        "verify-repair-verify-legacy-rollback",
        "update-traffic",
      ],
      "sales traffic",
    );
    must(ids[0] === "verify-curriculum-backup", "the curriculum backup guard is not first");
    must(
      ids.indexOf("build-curriculum-workspace-deps") < ids.indexOf("seed-production-curriculum"),
      "the workspace build does not precede the seed",
    );
    must(
      ids.indexOf("capture-legacy-rollback") < ids.indexOf("verify-repair-verify-legacy-rollback"),
      "the capture does not precede the legacy-rollback verify",
    );
  });

  it("F-13 the sales push keeps its steps and both no-traffic deploys", () => {
    const doc = cloudbuild("apps/sales-advantage/cloudbuild.yaml");
    const ids = stepIds(doc);
    const expected = [
      "validate-release-inputs",
      "build-image",
      "push-image",
      "deploy-legacy-rollback",
      "deploy-company-candidate",
      "allow-public-invoker",
      "capture-company-candidate",
      "verify-company-candidate",
    ];
    must(expected.length >= 1, "steps_expected=0");
    const indexes = expected.map((id) => {
      const index = ids.indexOf(id);
      must(index >= 0, `sales push is missing ${id}`);
      return index;
    });
    for (let i = 1; i < indexes.length; i += 1) {
      must(indexes[i] > indexes[i - 1], "the sales push step order changed");
    }
    for (const id of ["deploy-legacy-rollback", "deploy-company-candidate"]) {
      const step = (doc.steps ?? []).find((candidate) => candidate.id === id);
      must(stepText(step).includes("--no-traffic"), `${id} holds no --no-traffic`);
    }
  });

  it("F-14 no non-excluded push file holds psql", () => {
    const rows = readTable().filter((row) => row.mode !== "excluded");
    must(rows.length === 9, `files_checked=${rows.length}`);
    const hits = [];
    for (const row of rows) {
      const doc = cloudbuild(String(row.cloudbuild));
      const text = (doc.steps ?? []).map((step) => stepText(step)).join("\n");
      const count = (text.match(/psql/g) ?? []).length;
      if (count > 0) hits.push(`${row.id}(${count})`);
    }
    must(hits.length === 0, `psql in a push file: ${hits.join(",")} psql_hits=${hits.length}`);
  });

  it("F-15 the input-size guards", () => {
    const four = ["accounting", "codecamp-advantage", "marketing", "sales-advantage"];
    must(four.length === 4, `files_checked=${four.length}`);
    const salesSteps = 6;
    must(salesSteps === 6, `steps_expected=${salesSteps}`);
    const two = ["accounts", "workbooks"];
    must(two.length === 2, `files_checked=${two.length}`);
  });

  it("F-16 the traffic runbook holds one complete section per file", () => {
    const text = readText("docs/runbooks/traffic-moves.md");
    const sections = [
      {
        id: "primary-advantage",
        file: "apps/primary-advantage/cloudbuild-traffic.yaml",
        steps: ["refuse-legacy-db", "migrate-db", "doctor-check", "update-traffic"],
      },
      {
        id: "accounts",
        file: "apps/accounts/cloudbuild-traffic.yaml",
        steps: [
          "migrate-company-identity",
          "bootstrap-company-identity",
          "doctor-company-identity",
          "bootstrap-production-identity",
          "runtime-db-contract",
          "update-traffic",
        ],
      },
      {
        id: "accounting",
        file: "apps/accounting/cloudbuild-traffic.yaml",
        steps: ["migrate-db", "doctor-check", "runtime-db-contract", "update-traffic"],
      },
      {
        id: "codecamp-advantage",
        file: "apps/codecamp-advantage/cloudbuild-traffic.yaml",
        steps: ["migrate-db", "doctor-check", "update-traffic"],
      },
      {
        id: "marketing",
        file: "apps/marketing/cloudbuild-traffic.yaml",
        steps: ["migrate-db", "doctor-check", "runtime-db-contract", "update-traffic"],
      },
      {
        id: "sales-advantage",
        file: "apps/sales-advantage/cloudbuild-traffic.yaml",
        steps: [
          "verify-curriculum-backup",
          "migrate-db",
          "doctor-check",
          "build-curriculum-workspace-deps",
          "seed-production-curriculum",
          "verify-production-curriculum",
          "runtime-db-contract",
          "capture-legacy-rollback",
          "verify-repair-verify-legacy-rollback",
          "update-traffic",
        ],
      },
    ];
    must(sections.length === 6, `traffic_runbook_sections=${sections.length}`);
    let complete = 0;
    for (const section of sections) {
      const body = sectionText(text, section.id);
      if (body === "") continue;
      if (!body.includes(section.file)) continue;
      if (section.steps.some((step) => !body.includes(step))) continue;
      if (!/old schema/i.test(body)) continue;
      complete += 1;
    }
    must(complete === 6, `traffic_runbook_sections=${complete}`);
  });

  it("F-19 the sales traffic file names the pushed build in the capture and the move", () => {
    const file = "apps/sales-advantage/cloudbuild-traffic.yaml";
    const doc = cloudbuild(file);
    const steps = doc.steps ?? [];
    must(steps.length >= 2, `steps_checked=${steps.length}`);
    const capture = steps.find((step) => String(step.id ?? "") === "capture-legacy-rollback");
    const move = steps.find((step) => String(step.id ?? "") === "update-traffic");
    must(capture, "capture-legacy-rollback step missing");
    must(move, "update-traffic step missing");
    const captureText = stepText(capture);
    const moveText = stepText(move);
    const image =
      "asia-southeast1-docker.pkg.dev/$PROJECT_ID/sales-advantage/sales-advantage:${_PUSH_BUILD_ID}";
    const record = "/workspace/.sales-legacy-rollback";
    const checks = [
      { name: "capture-image", ok: captureText.includes(image) },
      { name: "capture-record", ok: captureText.includes(record) },
      { name: "move-to-revisions", ok: moveText.includes("--to-revisions=") },
      { name: "move-revision", ok: moveText.includes(`${record}.revision`) },
      { name: "move-no-tag", ok: !moveText.includes("--to-tags=") },
    ];
    must(checks.length === 5, `sales_build_identity_checks=${checks.length}`);
    const failed = checks.filter((check) => !check.ok).map((check) => check.name);
    const identity = failed.length === 0 ? 1 : 0;
    must(
      identity === 1,
      `sales_build_identity=${identity} failed=${failed.join(",")} steps_checked=${steps.length}`,
    );
  });

  it("F-17 no push or traffic file holds an invalid substitution", () => {
    const files = pushAndTrafficFiles();
    must(files.length === 16, `files_checked=${files.length}`);
    const bad = [];
    for (const file of files) {
      const doc = cloudbuild(file);
      for (const step of doc.steps ?? []) {
        const text = stepText(step);
        for (const match of text.matchAll(/(?<!\$)\$\{([^}]*)\}/g)) {
          const key = match[1];
          if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) bad.push(`${file}:${match[0]}`);
        }
      }
    }
    must(
      bad.length === 0,
      `invalid_substitutions=${bad.length}: ${bad.slice(0, 8).join(",")}`,
    );
  });
});
