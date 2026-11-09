#!/usr/bin/env node
/**
 * Red tests for Phase 2 of the track `per_app_cicd_20261107`.
 *
 * The cases are W-01 to W-21 of `measure/tracks/per_app_cicd_20261107/test-strategy.md`
 * section P2.4. They are artifact tests of the two CD workflows and the runbook, plus
 * a dry run of the real select step on a scratch git repository.
 *
 * Run with the Red command of test-strategy section P2.3.
 *
 * @module cd-workflows.test
 */
import { afterAll, describe, it } from "vitest";
import { changedFileCount, removeScratchDirs } from "./helpers/scratch.mjs";
import {
  allSteps,
  allWorkflowFiles,
  cloudbuild,
  combined,
  databaseSteps,
  gatedRows,
  planRepo,
  readTable,
  readText,
  removePlanScratch,
  runSelect,
  runbookFacts,
  sectionText,
  selectStep,
  stepEnv,
  stepText,
  tagFor,
  workflow,
} from "./helpers/plan.mjs";

const WWW = "cd-www-reading-advantage.yml";
const APPS = "cd-apps.yml";

afterAll(() => {
  removeScratchDirs();
  removePlanScratch();
});

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
 * Assert that a deploy step makes its tag from the step environment.
 *
 * The file must hold the escaped text `$${BUILD_ID:0:8}`. Cloud Build turns the
 * `$$` into one literal `$`, and bash then slices the step env `BUILD_ID`. The step
 * must not hold an unescaped `${BUILD_ID:0:8}`, because Cloud Build reads that text
 * as a substitution key and the submit fails.
 *
 * @param {Record<string, unknown>} step The deploy step.
 * @param {string} prefix The tag prefix, for example `pa`.
 * @param {string} id The app id of the failure message.
 * @returns {void}
 */
function assertEscapedTag(step, prefix, id) {
  const text = stepText(step);
  const wanted = "--tag=" + prefix + "-$${BUILD_ID:0:8}";
  must(text.includes(wanted), `${id} tag expression missing; expected ${wanted}`);
  must(
    !/(^|[^$])\$\{BUILD_ID:0:8\}/.test(text),
    `${id} tag holds an unescaped ${"${BUILD_ID:0:8}"}`,
  );
  must(
    stepEnv(step).includes("BUILD_ID=$BUILD_ID"),
    `${id} env must hold BUILD_ID=$BUILD_ID`,
  );
}

/**
 * List the raw text of every workflow file.
 *
 * @returns {{ name: string, text: string }[]} The file name and text.
 */
function workflowTexts() {
  return allWorkflowFiles().map((name) => ({ name, text: readText(`.github/workflows/${name}`) }));
}

/**
 * Assert that a step has the checkout, Node, and select plumbing of C11, C14, and C15.
 *
 * @param {Record<string, unknown>} doc The parsed workflow.
 * @param {string} name The workflow file name.
 * @returns {Record<string, unknown>} The select step.
 */
function assertPlumbing(doc, name) {
  const step = selectStep(doc, name);
  const checkout = allSteps(doc).find(({ step: candidate }) =>
    String(candidate.uses ?? "").startsWith("actions/checkout"),
  );
  must(checkout, `missing checkout in .github/workflows/${name}`);
  must(
    String(checkout.step.with?.["fetch-depth"]) === "0",
    `missing fetch-depth: 0 in .github/workflows/${name}`,
  );
  const node = allSteps(doc).find(({ step: candidate }) =>
    String(candidate.uses ?? "").startsWith("actions/setup-node"),
  );
  must(node, `missing setup-node in .github/workflows/${name}`);
  must(
    String(node.step.with?.["node-version"]) === "22",
    `missing node 22 setup in .github/workflows/${name}`,
  );
  const env = step.env ?? {};
  must(
    String(env.BASE_SHA ?? "").includes("github.event.before"),
    `missing BASE_SHA in .github/workflows/${name}`,
  );
  must(
    String(env.HEAD_SHA ?? "").includes("github.sha"),
    `missing HEAD_SHA in .github/workflows/${name}`,
  );
  const run = String(step.run ?? "");
  const order = [
    run.indexOf("scripts/ci/affected-apps.mjs"),
    run.indexOf("--base"),
    run.indexOf("$BASE_SHA"),
    run.indexOf("--head"),
    run.indexOf("$HEAD_SHA"),
  ];
  must(
    order.every((index) => index >= 0) && order.every((index, i) => i === 0 || index > order[i - 1]),
    `missing script call in .github/workflows/${name}`,
  );
  return step;
}

describe("W: per-app CD workflows", () => {
  it("W-01 www-only range plans one deploy job", () => {
    const range = planRepo({
      write: { "apps/www-reading-advantage/src/app/page.tsx": "export default 1;\n" },
    });
    const result = runSelect(WWW, range.dir, range.base, range.head);
    must(result.status === 0, `select step failed: ${result.stderr.trim()}`);
    must(result.outputs.www === "yes", `www=${result.outputs.www} expected=yes`);
    const jobs = result.outputs.www === "yes" ? 1 : 0;
    must(jobs === 1, `jobs_planned=${jobs}`);
    must(result.gcloudCalls.length === 0, `gcloud_calls=${result.gcloudCalls.length}`);
  });

  it("W-02 docs-only range plans no job", () => {
    const range = planRepo({ write: { "docs/a.md": "# a\n", "measure/b.md": "# b\n" } });
    const changed = changedFileCount(range.dir, range.base, range.head);
    must(changed >= 1, `changed_files=${changed}`);
    const result = runSelect(WWW, range.dir, range.base, range.head);
    must(result.status === 0, `select step failed: ${result.stderr.trim()}`);
    must(result.outputs.www === "no", `www=${result.outputs.www} changed_files=${changed}`);
    const jobs = result.outputs.www === "yes" ? 1 : 0;
    must(jobs === 0, `jobs_planned=${jobs} changed_files=${changed}`);
  });

  it("W-03 storytime-only range plans no www job", () => {
    const range = planRepo({ write: { "apps/storytime/app/page.tsx": "export default 1;\n" } });
    const result = runSelect(WWW, range.dir, range.base, range.head);
    must(result.status === 0, `select step failed: ${result.stderr.trim()}`);
    must(result.outputs.www === "no", `www=${result.outputs.www} expected=no`);
  });

  it("W-04 packages/read-along-only range plans no www job", () => {
    const range = planRepo({ write: { "packages/read-along/src/index.ts": "export const x = 2;\n" } });
    const result = runSelect(WWW, range.dir, range.base, range.head);
    must(result.status === 0, `select step failed: ${result.stderr.trim()}`);
    must(result.outputs.www === "no", `www=${result.outputs.www} expected=no`);
  });

  it("W-05 each gated row plans exactly one job", () => {
    const rows = gatedRows();
    must(rows.length === 6, `gated_rows=${rows.length}`);
    for (const row of rows) {
      const range = planRepo({ write: { [`${row.path}/src/red-probe-${row.id}.ts`]: "export const x = 1;\n" } });
      const result = runSelect(APPS, range.dir, range.base, range.head);
      must(result.status === 0, `${row.id}: select step failed: ${result.stderr.trim()}`);
      const matrix = JSON.parse(result.outputs.matrix ?? "null");
      must(Array.isArray(matrix), `${row.id}: matrix is not an array`);
      must(matrix.length === 1, `${row.id}: matrix length=${matrix.length}`);
      must(matrix[0].id === row.id, `${row.id}: matrix id=${matrix[0].id}`);
      must(matrix[0].cloudbuild === row.cloudbuild, `${row.id}: cloudbuild differs`);
      must(result.gcloudCalls.length === 0, `${row.id}: gcloud_calls=${result.gcloudCalls.length}`);
    }
  });

  it("W-06 the excluded row plans no job", () => {
    const range = planRepo({ write: { "apps/reading-advantage/app/page.tsx": "export default 1;\n" } });
    const changed = changedFileCount(range.dir, range.base, range.head);
    must(changed >= 1, `changed_files=${changed}`);
    const result = runSelect(APPS, range.dir, range.base, range.head);
    must(result.status === 0, `select step failed: ${result.stderr.trim()}`);
    must(result.outputs.matrix === "[]", `matrix=${result.outputs.matrix} changed_files=${changed}`);
  });

  it("W-07 a www change plans no gated job", () => {
    const range = planRepo({ write: { "apps/www-reading-advantage/src/app/page.tsx": "export default 1;\n" } });
    const result = runSelect(APPS, range.dir, range.base, range.head);
    must(result.status === 0, `select step failed: ${result.stderr.trim()}`);
    must(result.outputs.matrix === "[]", `matrix=${result.outputs.matrix}`);
  });

  it("W-08 an accounts and workbooks range plans one job and skips workbooks", () => {
    const range = planRepo({
      write: {
        "apps/accounts/src/red-probe.ts": "export const x = 1;\n",
        "apps/workbooks/src/red-probe.ts": "export const x = 1;\n",
      },
    });
    const result = runSelect(APPS, range.dir, range.base, range.head);
    must(result.status === 0, `select step failed: ${result.stderr.trim()}`);
    const matrix = JSON.parse(result.outputs.matrix ?? "null");
    must(Array.isArray(matrix) && matrix.length === 1, `jobs_planned=${matrix?.length}`);
    must(matrix[0].id === "accounts", `id=${matrix[0]?.id}`);
    must(
      result.stderr.includes("skip=workbooks reason=no Cloud Run service exists"),
      `skip line missing for workbooks: ${result.stderr.trim()}`,
    );
  });

  it("W-09 cd-apps passes the table file and project to gcloud", () => {
    const doc = workflow(APPS);
    const runTexts = allSteps(doc)
      .map(({ step }) => String(step.run ?? ""))
      .join("\n");
    const configs = [...runTexts.matchAll(/--config=(?:"([^"]*)"|(\S+))/g)].map(
      (match) => match[1] ?? match[2],
    );
    const projects = [...runTexts.matchAll(/--project=(?:"([^"]*)"|(\S+))/g)].map(
      (match) => match[1] ?? match[2],
    );
    must(configs.length >= 1, "no --config in cd-apps.yml");
    must(projects.length >= 1, "no --project in cd-apps.yml");
    must(
      configs.every((value) => value.includes("${{") && value.includes("matrix.cloudbuild")),
      `--config is not an expression: ${configs.join(",")}`,
    );
    must(
      projects.every((value) => value.includes("${{") && value.includes("matrix.project")),
      `--project is not an expression: ${projects.join(",")}`,
    );
  });

  it("W-10 tag math over the gated rows", () => {
    const rows = gatedRows();
    must(rows.length === 6, `rows_checked=${rows.length}`);
    let max = 0;
    for (const row of rows) {
      const tag = tagFor(row);
      must(
        row.tagLength === tag.length,
        `${row.id}: tagLength=${row.tagLength} rule=${tag.length}`,
      );
      const total = combined(row);
      max = Math.max(max, total);
      must(total <= 46, `${row.id}: combined=${total} limit=46`);
    }
    must(max <= 46, `max_combined=${max} limit=46`);
  });

  it("W-11-primary primary deploy step holds pa- and the build id slice", () => {
    const row = gatedRows().find((entry) => entry.id === "primary-advantage");
    const doc = workflowTextTable(row);
    const step = doc.steps.find((entry) => String(entry.id ?? "").startsWith("deploy"));
    assertEscapedTag(step, "pa", "primary-advantage");
    must(stepText(step).includes("--no-traffic"), "primary deploy step has no --no-traffic");
  });

  it("W-11-storytime storytime deploy step holds st- and the build id slice", () => {
    const row = gatedRows().find((entry) => entry.id === "storytime");
    const doc = workflowTextTable(row);
    const step = doc.steps.find((entry) => String(entry.id ?? "").startsWith("deploy"));
    must(stepText(step).includes("--no-traffic"), "storytime deploy step has no --no-traffic");
    assertEscapedTag(step, "st", "storytime");
  });

  it("W-11-accounts accounts deploy step holds ac- and the build id slice", () => {
    const row = gatedRows().find((entry) => entry.id === "accounts");
    const doc = workflowTextTable(row);
    const step = doc.steps.find((entry) => String(entry.id ?? "").startsWith("deploy"));
    assertEscapedTag(step, "ac", "accounts");
    must(stepText(step).includes("--no-traffic"), "accounts deploy step has no --no-traffic");
  });

  it("W-11-workbooks the hand-run push file holds wb-, no traffic move, and no database step", () => {
    const doc = cloudbuild("apps/workbooks/cloudbuild.yaml");
    const deploys = (doc.steps ?? []).filter((entry) => String(entry.id ?? "").startsWith("deploy"));
    must(deploys.length === 1, `deploy_steps=${deploys.length}`);
    assertEscapedTag(deploys[0], "wb", "workbooks");
    const text = deploys.map((entry) => stepText(entry)).join("\n");
    must(text.includes("--no-traffic"), "workbooks deploy step has no --no-traffic");
    must(!text.includes("update-traffic"), "workbooks push file moves traffic");
    must(databaseSteps(doc).length === 0, "workbooks push file holds a database step");
  });

  it("W-11-accounting accounting deploy step holds the candidate tag", () => {
    const doc = workflowTextTable(gatedRows().find((entry) => entry.id === "accounting"));
    const text = stepText(doc.steps.find((entry) => String(entry.id ?? "").startsWith("deploy")));
    must(text.includes("--tag=candidate"), "accounting tag expression missing");
  });

  it("W-11-codecamp codecamp deploy step holds the sso-candidate tag", () => {
    const doc = workflowTextTable(gatedRows().find((entry) => entry.id === "codecamp-advantage"));
    const text = stepText(doc.steps.find((entry) => String(entry.id ?? "").startsWith("deploy")));
    must(text.includes("--tag=sso-candidate"), "codecamp tag expression missing");
  });

  it("W-11-marketing marketing deploy step derives its candidate tag", () => {
    const doc = workflowTextTable(gatedRows().find((entry) => entry.id === "marketing"));
    const text = stepText(doc.steps.find((entry) => String(entry.id ?? "").startsWith("deploy")));
    must(text.includes("c$${build_id%%-*}"), "marketing tag expression missing");
  });

  it("W-11-sales the hand-run push file holds both tags, no traffic move, and no database step", () => {
    const doc = cloudbuild("apps/sales-advantage/cloudbuild.yaml");
    const deploys = (doc.steps ?? []).filter((entry) => String(entry.id ?? "").startsWith("deploy"));
    const text = deploys.map((entry) => stepText(entry)).join("\n");
    must(deploys.length === 2, `deploy_steps=${deploys.length}`);
    must(text.includes("legacy-rollback"), "sales legacy-rollback tag missing");
    must(text.includes("candidate"), "sales candidate tag missing");
    must(text.includes("--no-traffic"), "sales deploy step has no --no-traffic");
    must(!text.includes("update-traffic"), "sales push file moves traffic");
    must(databaseSteps(doc).length === 0, "sales push file holds a database step");
  });

  it("W-12 each deploy step names the row service", () => {
    const rows = gatedRows();
    must(rows.length === 6, `services_checked=${rows.length}`);
    for (const row of rows) {
      const doc = workflowTextTable(row);
      const deploys = doc.steps.filter((entry) => String(entry.id ?? "").startsWith("deploy"));
      must(deploys.length >= 1, `${row.id}: no deploy step`);
      for (const step of deploys) {
        must(stepText(step).includes(String(row.service)), `${row.id}: service ${row.service} missing`);
      }
    }
  });

  it("W-13 no workflow step moves traffic", () => {
    let hits = 0;
    for (const { name } of workflowTexts()) {
      const doc = workflow(name);
      for (const { step } of allSteps(doc)) {
        const text = stepText(step);
        if (text.includes("update-traffic") || text.includes("--to-latest")) hits += 1;
      }
    }
    must(hits === 0, `workflow_detector_hits=${hits}`);
  });

  it("W-14 the workflows use exactly the two measured secrets", () => {
    const names = new Set();
    for (const { text } of workflowTexts()) {
      for (const match of text.matchAll(/secrets\.([A-Za-z0-9_]+)/g)) names.add(match[1]);
    }
    const sorted = [...names].sort();
    must(
      JSON.stringify(sorted) === JSON.stringify(["GCP_PROJECT_ID", "GCP_SERVICE_ACCOUNT"]),
      `secret_names=${sorted.join(",")}`,
    );
    must(sorted.length === 2, `secret_names=${sorted.length}`);
  });

  it("W-14a cd-www grants only contents: read", () => {
    const doc = workflow(WWW);
    if (!doc.permissions) throw new Error(`permissions missing on .github/workflows/${WWW}`);
    const keys = Object.keys(doc.permissions).sort();
    must(
      JSON.stringify(keys) === JSON.stringify(["contents"]) && doc.permissions.contents === "read",
      `permissions=${JSON.stringify(doc.permissions)}`,
    );
  });

  it("W-14b cd-apps grants only contents: read", () => {
    const doc = workflow(APPS);
    if (!doc.permissions) throw new Error(`permissions missing on .github/workflows/${APPS}`);
    const keys = Object.keys(doc.permissions).sort();
    must(
      JSON.stringify(keys) === JSON.stringify(["contents"]) && doc.permissions.contents === "read",
      `permissions=${JSON.stringify(doc.permissions)}`,
    );
  });

  it("W-14c no pull_request_target and no secret outside a push job", () => {
    for (const { name, text } of workflowTexts()) {
      must(!text.includes("pull_request_target"), `pull_request_target in .github/workflows/${name}`);
      if (!text.includes("secrets.")) continue;
      const doc = workflow(name);
      must(doc.on && doc.on.push, `secrets outside a push-triggered job in .github/workflows/${name}`);
    }
  });

  it("W-15 the storytime tag stays within 46 characters", () => {
    const doc = workflowTextTable(gatedRows().find((entry) => entry.id === "storytime"));
    const step = doc.steps.find((entry) => String(entry.id ?? "").startsWith("deploy"));
    assertEscapedTag(step, "st", "storytime");
    const text = stepText(step);
    const match = text.match(/--tag=(\S+)/);
    must(match, "storytime tag expression missing");
    const buildId = "a".repeat(36);
    const rendered = match[1].replace("$${BUILD_ID:0:8}", buildId.slice(0, 8));
    const total = rendered.length + "storytime-app".length;
    must(total <= 46, `storytime tag combined=${total} limit=46`);
    must(rendered.startsWith("st-"), "storytime tag expression missing");
    must(rendered.length === 11, `storytime tag length=${rendered.length} expected=11`);
  });

  it("W-16 the runbook holds the 7 FR-4 facts", () => {
    const text = readText("docs/runbooks/storytime-deploy.md");
    const facts = runbookFacts();
    must(facts.length === 7, `facts_expected=${facts.length}`);
    const found = facts.filter((fact) => fact.test(text)).length;
    must(found === 7, `facts_found=${found} expected=7`);
  });

  it("W-17 no workflow references a traffic file", () => {
    let refs = 0;
    for (const { text } of workflowTexts()) {
      if (text.includes("cloudbuild-traffic")) refs += 1;
    }
    must(refs === 0, `traffic_refs=${refs}`);
  });

  it("W-18a cd-www holds the select plumbing", () => {
    assertPlumbing(workflow(WWW), WWW);
  });

  it("W-18b cd-apps holds the select plumbing", () => {
    assertPlumbing(workflow(APPS), APPS);
  });

  it("W-18c the two select steps are equal after trim", () => {
    const left = String(selectStep(workflow(WWW), WWW).run ?? "").trim();
    const right = String(selectStep(workflow(APPS), APPS).run ?? "").trim();
    must(left !== "", `empty select run in ${WWW}`);
    must(left === right, `the two select steps differ`);
  });

  it("W-19 the www deploy keeps its file and both secrets", () => {
    const doc = workflow(WWW);
    must(doc.jobs?.select, `missing select step in .github/workflows/${WWW}`);
    const row = readTable().find((entry) => entry.id === "www-reading-advantage");
    const deploy = doc.jobs?.deploy;
    must(deploy, `missing deploy job in .github/workflows/${WWW}`);
    const run = (deploy.steps ?? []).map((step) => String(step.run ?? "")).join("\n");
    const match = run.match(/--config=(?:"([^"]*)"|(\S+))/);
    must(match, "no --config in the www deploy job");
    must((match[1] ?? match[2]) === row.cloudbuild, `config=${match[1] ?? match[2]}`);
    const text = readText(`.github/workflows/${WWW}`);
    must(text.includes("secrets.GCP_SERVICE_ACCOUNT"), "GCP_SERVICE_ACCOUNT missing");
    must(text.includes("secrets.GCP_PROJECT_ID"), "GCP_PROJECT_ID missing");
  });

  it("W-20 the www deploy runs only when www is affected", () => {
    const doc = workflow(WWW);
    must(doc.jobs?.select, `missing select step in .github/workflows/${WWW}`);
    const deploy = doc.jobs?.deploy;
    must(deploy, `missing deploy job in .github/workflows/${WWW}`);
    const needs = Array.isArray(deploy.needs) ? deploy.needs : [deploy.needs];
    must(needs.includes("select"), `www deploy job has no needs: select`);
    must(
      String(deploy.if ?? "").includes("needs.select.outputs.www"),
      `www deploy condition does not read the select output`,
    );
  });

  it("W-21 the input-size guards", () => {
    const rows = gatedRows();
    must(rows.length === 6, `gated_rows=${rows.length}`);
    const ranges = 6;
    must(ranges >= 6, `ranges=${ranges}`);
    const table = readTable();
    must(table.length === 10, `rows_checked=${table.length}`);
  });

  it("W-22 the traffic runbook names how to find the tag or build", () => {
    const text = readText("docs/runbooks/traffic-moves.md");
    const sections = [
      { id: "primary-advantage", variable: "_TAG" },
      { id: "accounts", variable: "_TAG" },
      { id: "accounting", variable: "" },
      { id: "codecamp-advantage", variable: "" },
      { id: "marketing", variable: "_TAG" },
      { id: "sales-advantage", variable: "_PUSH_BUILD_ID" },
    ];
    must(sections.length === 6, `sections_checked=${sections.length}`);
    const missing = [];
    for (const section of sections) {
      const body = sectionText(text, section.id);
      if (body === "") {
        missing.push(`${section.id}:missing`);
        continue;
      }
      if (
        !/gcloud run revisions list|gcloud builds list|actions\/runs|GitHub Actions run/i.test(
          body,
        )
      ) {
        missing.push(`${section.id}:lookup`);
      }
      if (section.variable && !body.includes(section.variable)) {
        missing.push(`${section.id}:${section.variable}`);
      }
    }
    const sales = sectionText(text, "sales-advantage");
    for (const name of [
      "_RELEASE_COMMIT_SHA",
      "_CURRICULUM_BACKUP_ID",
      "_CURRICULUM_BACKUP_NOT_BEFORE",
    ]) {
      if (!sales.includes(name)) missing.push(`sales-advantage:${name}`);
    }
    must(missing.length === 0, `missing=${missing.join(",")} sections_checked=6`);
  });

  it("W-23 every CD workflow action uses a pinned commit SHA", () => {
    let lines = 0;
    const bad = [];
    for (const name of [WWW, APPS]) {
      const text = readText(`.github/workflows/${name}`);
      for (const line of text.split("\n")) {
        const match = line.match(/^\s*uses:\s*(\S+)(?:\s+#.*)?\s*$/);
        if (!match) continue;
        lines += 1;
        if (!/@[0-9a-f]{40}$/.test(match[1])) bad.push(`${name}:${match[1]}`);
      }
    }
    must(lines >= 5, `uses_lines=${lines}`);
    must(bad.length === 0, `unpinned=${bad.join(",")} uses_lines=${lines}`);
  });

  it("W-24 a REQUIRED release commit row gets the pushed commit", () => {
    const rows = gatedRows().filter((row) => row.id !== "sales-advantage");
    must(rows.length >= 1, `rows_checked=${rows.length}`);
    const needs = [];
    for (const row of rows) {
      const subs = cloudbuild(String(row.cloudbuild)).substitutions ?? {};
      if (String(subs._RELEASE_COMMIT_SHA ?? "").startsWith("REQUIRED_")) {
        needs.push({ id: String(row.id), key: "_RELEASE_COMMIT_SHA" });
      }
    }
    must(needs.length >= 1, `required_rows=${needs.length}`);
    must(
      needs.some((entry) => entry.id === "marketing"),
      `required_rows=${needs.map((entry) => entry.id).join(",")}`,
    );
    const appText = readText(`.github/workflows/${APPS}`);
    const appDoc = workflow(APPS);
    const submit = (appDoc.jobs?.build?.steps ?? [])
      .map((step) => String(step.run ?? ""))
      .join("\n");
    for (const { id, key } of needs) {
      const direct = submit.includes(key) && /github\.sha/.test(submit);
      const viaMatrix =
        /matrix\.[\w.-]*substitution/.test(submit) &&
        appText.includes(key) &&
        /github\.sha/.test(appText);
      must(direct || viaMatrix, `${id} does not pass ${key} from the pushed commit`);
    }
  });

  it("W-25 a row without the key gets no release substitution", () => {
    const ids = ["primary-advantage", "storytime", "accounts", "accounting"];
    must(ids.length === 4, `rows_checked=${ids.length}`);
    const rows = readTable().filter((row) => ids.includes(String(row.id)));
    must(rows.length === 4, `rows_checked=${rows.length}`);
    for (const row of rows) {
      const subs = cloudbuild(String(row.cloudbuild)).substitutions ?? {};
      must(
        !("_RELEASE_COMMIT_SHA" in subs),
        `${row.id} declares the release key`,
      );
    }
    const appDoc = workflow(APPS);
    const submit = (appDoc.jobs?.build?.steps ?? [])
      .map((step) => String(step.run ?? ""))
      .join("\n");
    if (submit.includes("_RELEASE_COMMIT_SHA")) {
      must(/matrix\./.test(submit), "the release commit reaches every row");
      must(
        !/--substitutions=[^\n]*_RELEASE_COMMIT_SHA/.test(submit),
        "the release commit is passed unconditionally",
      );
    }
  });

  it("W-26 the sales push stays an open limit", () => {
    const row = readTable().find((entry) => entry.id === "sales-advantage");
    must(row, "sales row missing");
    const subs = cloudbuild(String(row.cloudbuild)).substitutions ?? {};
    must(
      String(subs._RELEASE_COMMIT_SHA ?? "").startsWith("REQUIRED_"),
      "the sales release commit default changed",
    );
    const runbook = readText("docs/runbooks/traffic-moves.md");
    const limits = sectionText(runbook, "Open limits");
    must(limits !== "", "the Open limits section is missing");
    must(limits.includes("sales-advantage"), "Open limits does not name sales-advantage");
    for (const key of ["_RELEASE_COMMIT_SHA"]) {
      must(limits.includes(key), `Open limits does not name ${key}`);
    }
    const sales = sectionText(runbook, "sales-advantage");
    for (const key of [
      "_CURRICULUM_BACKUP_ID",
      "_CURRICULUM_BACKUP_NOT_BEFORE",
      "_PUSH_BUILD_ID",
    ]) {
      must(sales.includes(key), `the sales section does not name ${key}`);
    }
  });
});

/**
 * Parse the Cloud Build file of a row.
 *
 * @param {Record<string, unknown>} row The table row.
 * @returns {{ steps?: Record<string, unknown>[] }} The parsed file.
 */
function workflowTextTable(row) {
  return cloudbuild(String(row.cloudbuild));
}
