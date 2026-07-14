/**
 * Phase 4 contract: artifact assertions for the deploy gate + docs + E2E
 * deliverables (db_migration_ledger_20260611). This test is intentionally
 * RED on master — none of the Phase 4 artifacts exist yet. Green is owned
 * by the Phase 4 Implement role (one describe block per task).
 *
 * Per measure/test-strategy.md §5: "Cloudbuild YAML linted via `js-yaml`
 * parse + step-order assertion (artifact contract). Live behavior proven
 * by fresh-DB end-to-end in CI." Live behavior gate (`cloud-build
 * local-builder` smoke + `docker compose … && pnpm migrate && pnpm doctor
 * --check`) is the jr/green role's responsibility, executed in an
 * environment with podman rootless networking working; the artifact
 * assertions below are the file-system-only signal the implementer must
 * restore.
 *
 * Targeted Red command:
 *   ./node_modules/.bin/vitest run src/__tests__/deploy-gate-contract.test.ts
 *   (from packages/db/; equivalent to `pnpm vitest run …`)
 *
 * YAML is parsed via a hand-rolled stdlib-only extractor (per
 * test-strategy §4 "no external YAML dependency — prefer hand parse; fall
 * back to existing dep only — do not add `yaml` if not already present").
 * The same parser shape is used by the codecamp `cloudbuild-parser.ts`
 * helper — duplicated here to avoid a reverse dep from packages/db into
 * apps/codecamp-advantage test helpers.
 */

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../..");
const REPO_ROOT = resolve(PACKAGE_ROOT, "../..");

const CLOUDBUILD_PATH = join(REPO_ROOT, "apps/codecamp-advantage/cloudbuild.yaml");
const DB_README_PATH = join(PACKAGE_ROOT, "README.md");
const TECH_DEBT_PATH = join(REPO_ROOT, "measure/tech-debt.md");
const LESSONS_LEARNED_PATH = join(REPO_ROOT, "measure/lessons-learned.md");
const E2E_SCRIPT_PATH = join(REPO_ROOT, "scripts/ci/fresh-db-e2e.sh");

interface CloudBuildStep {
  id: string;
  name: string;
  args: string[];
}

/**
 * Hand-rolled Cloud Build YAML step extractor. Same shape as
 * `apps/codecamp-advantage/lib/__tests__/_helpers/cloudbuild-parser.ts` —
 * duplicated to keep `packages/db` free of cross-app test-helper imports.
 */
function parseCloudBuildSteps(yamlText: string): CloudBuildStep[] {
  if (!yamlText.trim()) return [];
  const steps: CloudBuildStep[] = [];
  const stepBlocks = yamlText.split(/\n\s*-\s*name:\s*/);
  for (let i = 1; i < stepBlocks.length; i++) {
    const block = stepBlocks[i]!;
    const nameLineMatch = block.match(/^"?([^"\n]+)"?\s*/);
    const name = nameLineMatch?.[1]?.trim() ?? "";
    const idMatch = block.match(/id:\s*"([^"]+)"/);
    const id = idMatch?.[1] ?? "";
    let args: string[] = [];
    const inlineArgsMatch = block.match(/args:\s*\[([^\]]*)\]/);
    if (inlineArgsMatch) {
      const raw = inlineArgsMatch[1]!;
      args = raw
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    } else {
      const argsKeyIndex = block.indexOf("args:");
      if (argsKeyIndex !== -1) {
        const afterArgs = block.slice(argsKeyIndex);
        const blockArgMatches = [...afterArgs.matchAll(/^\s*-\s*"((?:\\.|[^"])*)"\s*$/gm)];
        args = blockArgMatches.map((m) => m[1]!.replace(/\\"/g, '"')).filter(Boolean);
      }
    }
    if (id) steps.push({ id, name, args });
  }
  return steps;
}

describe("Phase 4 — Task 15: FR-4 codecamp deploy gate (cloudbuild.yaml)", () => {
  it("exists and is non-empty", () => {
    expect(
      existsSync(CLOUDBUILD_PATH),
      "apps/codecamp-advantage/cloudbuild.yaml must exist"
    ).toBe(true);
    const text = readFileSync(CLOUDBUILD_PATH, "utf8");
    expect(text.length).toBeGreaterThan(0);
  });

  it("contains a migrate step that runs `pnpm --filter @reading-advantage/db migrate` before deploy-cloudrun", () => {
    const text = readFileSync(CLOUDBUILD_PATH, "utf8");
    const steps = parseCloudBuildSteps(text);
    const deployIdx = steps.findIndex((s) => s.id === "deploy-cloudrun");
    expect(deployIdx, "deploy-cloudrun step must exist").toBeGreaterThanOrEqual(0);

    const migrateStep = steps.find((s) =>
      s.args.some(
        (a) => a.includes("pnpm") && a.includes("--filter") && a.includes("migrate")
      )
    );
    expect(
      migrateStep,
      "a step invoking `pnpm --filter @reading-advantage/db migrate` must exist"
    ).toBeDefined();

    const migrateIdx = steps.indexOf(migrateStep!);
    expect(
      migrateIdx,
      "migrate step must come BEFORE deploy-cloudrun (FR-4: gate before traffic shift)"
    ).toBeLessThan(deployIdx);
  });

  it("contains a doctor --check step that runs after migrate and before deploy-cloudrun", () => {
    const text = readFileSync(CLOUDBUILD_PATH, "utf8");
    const steps = parseCloudBuildSteps(text);
    const deployIdx = steps.findIndex((s) => s.id === "deploy-cloudrun");
    expect(deployIdx, "deploy-cloudrun step must exist").toBeGreaterThanOrEqual(0);

    const doctorStep = steps.find((s) =>
      s.args.some(
        (a) => a.includes("doctor") && a.includes("--check")
      )
    );
    expect(
      doctorStep,
      "a step invoking `… doctor --check` must exist (FR-4 deploy gate)"
    ).toBeDefined();

    const doctorIdx = steps.indexOf(doctorStep!);
    expect(
      doctorIdx,
      "doctor --check step must come BEFORE deploy-cloudrun (FR-4: gate before traffic shift)"
    ).toBeLessThan(deployIdx);
  });

  it("requires the Codecamp mastery-evidence migration before traffic shifts", () => {
    const text = readFileSync(CLOUDBUILD_PATH, "utf8");
    const steps = parseCloudBuildSteps(text);
    const doctorStep = steps.find((step) =>
      step.args.some((argument) => argument.includes("doctor") && argument.includes("--check")),
    );
    expect(doctorStep, "doctor --check step must exist").toBeDefined();
    const block = text.split(/\n\s*-\s*name:/)[steps.indexOf(doctorStep!) + 1] ?? "";
    expect(
      block,
      "Codecamp deployment must prove 0036_codecamp_mastery_evidence is in the Drizzle ledger before application traffic can use its tables",
    ).toMatch(/--required-migration\s+0036_codecamp_mastery_evidence/);
  });

  it("deploys the unreleased PR-review model in explicit private shadow mode", () => {
    const text = readFileSync(CLOUDBUILD_PATH, "utf8");
    expect(
      text,
      "Codecamp deployment must set CODECAMP_PR_REVIEW_ROLLOUT_MODE=shadow until a human-approved evaluation promotes canary or active feedback",
    ).toMatch(/CODECAMP_PR_REVIEW_ROLLOUT_MODE=shadow/);
  });

  // The deploy gate's "privileged direct connection" is CODECAMP_DATABASE_URL:
  // a Cloud SQL unix-socket URL reached through the Cloud SQL Auth Proxy
  // (session-mode, no transaction pooler) started inside the build step.
  // The project has no DIRECT_DATABASE_URL secret; Cloud SQL replaced the
  // pooled/direct URL split this contract was originally written against.
  it("doctor step targets CODECAMP_DATABASE_URL (privileged connection, per test-strategy §2)", () => {
    const text = readFileSync(CLOUDBUILD_PATH, "utf8");
    const steps = parseCloudBuildSteps(text);
    const doctorStep = steps.find((s) =>
      s.args.some((a) => a.includes("doctor") && a.includes("--check"))
    );
    expect(doctorStep, "doctor --check step must exist").toBeDefined();
    const wholeBlock = text.split(/\n\s*-\s*name:/)[steps.indexOf(doctorStep!) + 1] ?? "";
    expect(
      wholeBlock,
      "doctor step block must reference CODECAMP_DATABASE_URL (privileged connection for ledger reads)"
    ).toMatch(/CODECAMP_DATABASE_URL/);
    expect(
      wholeBlock,
      "doctor step must export DATABASE_URL from the Secret Manager-provided CODECAMP_DATABASE_URL before running the db package command"
    ).toMatch(/export\s+DATABASE_URL=\\?"?\$\$CODECAMP_DATABASE_URL/);
    expect(
      wholeBlock,
      "doctor step must start the Cloud SQL Auth Proxy so the /cloudsql unix-socket URL is reachable inside Cloud Build"
    ).toMatch(/cloud-sql-proxy/);
  });

  it("wires CODECAMP_DATABASE_URL through Cloud Build Secret Manager availableSecrets", () => {
    const text = readFileSync(CLOUDBUILD_PATH, "utf8");
    expect(
      text,
      "Cloud Build must use Secret Manager `availableSecrets`, not legacy KMS `secrets`, so secretEnv receives CODECAMP_DATABASE_URL"
    ).toMatch(/availableSecrets:\s*\n\s*secretManager:/);
    expect(
      text,
      "CODECAMP_DATABASE_URL secret must be bound from Secret Manager to the CODECAMP_DATABASE_URL env name"
    ).toMatch(/versionName:\s*"?projects\/\$PROJECT_ID\/secrets\/CODECAMP_DATABASE_URL\/versions\/latest"?[\s\S]*env:\s*"CODECAMP_DATABASE_URL"/);
    expect(
      text,
      "legacy KMS `secrets:` block must not be used for CODECAMP_DATABASE_URL deploy gate wiring"
    ).not.toMatch(/\nsecrets:\s*\n[\s\S]*CODECAMP_DATABASE_URL/);
  });

  it("doctor step has no `allowFailure: true` — non-zero exit must fail the build (FR-4 acceptance #5)", () => {
    const text = readFileSync(CLOUDBUILD_PATH, "utf8");
    const steps = parseCloudBuildSteps(text);
    const doctorStep = steps.find((s) =>
      s.args.some((a) => a.includes("doctor") && a.includes("--check"))
    );
    expect(doctorStep, "doctor --check step must exist").toBeDefined();
    const wholeBlock = text.split(/\n\s*-\s*name:/)[steps.indexOf(doctorStep!) + 1] ?? "";
    expect(
      wholeBlock,
      "doctor step must NOT carry `allowFailure: true` (FR-4 acceptance #5: build fails before traffic shift)"
    ).not.toMatch(/allowFailure:\s*true/);
  });
});

describe("Phase 4 — Task 15: FR-4 deploy-gate pattern documented in packages/db/README.md", () => {
  it("ships packages/db/README.md", () => {
    expect(
      existsSync(DB_README_PATH),
      "packages/db/README.md must exist for the deploy-gate documentation check"
    ).toBe(true);
  });

  it("documents the deploy-gate pattern with a codecamp reference and DIRECT_DATABASE_URL guidance", () => {
    const text = readFileSync(DB_README_PATH, "utf8");
    // Loose — the section heading may vary; require the concept words.
    expect(text, "README must mention the deploy-gate pattern").toMatch(/deploy[- ]?gate/i);
    expect(text, "README must reference codecamp-advantage as the canonical example").toMatch(
      /codecamp[- ]?advantage/
    );
    expect(text, "README must call out DIRECT_DATABASE_URL for the gate").toMatch(
      /DIRECT_DATABASE_URL/
    );
  });

  it("includes a production reconciliation runbook (doctor report → review → --repair)", () => {
    const text = readFileSync(DB_README_PATH, "utf8");
    // Runbook must mention the three phases: report, review, --repair.
    expect(text, "runbook must mention `doctor`").toMatch(/doctor/);
    expect(text, "runbook must mention `--repair`").toMatch(/--repair/);
    expect(text, "runbook must mention `review` (the manual sign-off step)").toMatch(/review/i);
  });
});

describe("Phase 4 — Task 16: fresh-DB end-to-end shell harness (scripts/ci/fresh-db-e2e.sh)", () => {
  it("exists and is executable", () => {
    expect(
      existsSync(E2E_SCRIPT_PATH),
      "scripts/ci/fresh-db-e2e.sh must exist (Phase 4 closeout gate)"
    ).toBe(true);
    const stat = statSync(E2E_SCRIPT_PATH);
    // owner-execute bit (0o100) — the file must be runnable as a shell script
    expect(
      (stat.mode & 0o100) !== 0,
      `scripts/ci/fresh-db-e2e.sh must be executable (mode=${stat.mode.toString(8)})`
    ).toBe(true);
  });

  it("starts Postgres, runs `pnpm migrate`, then runs `pnpm doctor --check` (Phase 4 closeout gate)", () => {
    const text = readFileSync(E2E_SCRIPT_PATH, "utf8");
    // Shebang
    expect(text, "must be a bash script").toMatch(/^#!\/.*\b(bash|sh)\b/);
    // Postgres bring-up
    expect(text, "must bring up a postgres container (docker compose or docker run)").toMatch(
      /docker\s+(compose|run).*postgres/i
    );
    expect(text, "must reset the target database before migration so the gate proves fresh-DB behavior").toMatch(
      /DROP DATABASE IF EXISTS reading_advantage[\s\S]*CREATE DATABASE reading_advantage/
    );
    expect(text, "must export DIRECT_DATABASE_URL before running doctor --check").toMatch(
      /export\s+DIRECT_DATABASE_URL=/
    );
    expect(text, "must run `pnpm migrate` (or the filter form)").toMatch(/pnpm[^.\n]*migrate/);
    expect(text, "must run `pnpm doctor --check` (the closeout gate command)").toMatch(
      /doctor[^.\n]*--check|--check[^.\n]*doctor/
    );
  });
});

describe("Phase 4 — Task 17: project memory (tech-debt.md + lessons-learned.md)", () => {
  it("updates the P0 row in measure/tech-debt.md to reflect db-side fix + remaining open scope", () => {
    expect(
      existsSync(TECH_DEBT_PATH),
      "measure/tech-debt.md must exist for the P0-row update check"
    ).toBe(true);
    const text = readFileSync(TECH_DEBT_PATH, "utf8");
    // The P0 row must reflect (a) db-side root cause FIXED, (b) doctor
    // available, (c) remaining open scope = run --repair per prod DB +
    // wire gates for non-codecamp pipelines. The marker of the state
    // change is the past-tense verb (Fixed by / Closed by / landed /
    // shipped / complete) replacing the forward-looking "Fix track:"
    // phrase that the row carried at Phase 1.
    const p0Row = text.match(
      /\| 2026-06-08 \| codecamp_qa_prod_20260517 \| \*\*P0:[^\n]+/
    );
    expect(
      p0Row,
      "the 2026-06-08 P0 row must still exist (track still in tech-debt registry)"
    ).not.toBeNull();
    const row = p0Row![0];
    expect(
      row,
      "P0 row must reflect the db-side fix is DONE (past-tense marker, not forward-looking 'Fix track:')"
    ).toMatch(/fixed by|closed by|landed|shipped|complete/i);
    expect(
      row,
      "P0 row must NOT still carry the forward-looking 'Fix track:' marker (Phase 1 state)"
    ).not.toMatch(/Fix track:/);
    expect(
      row,
      "P0 row must mention the doctor is available"
    ).toMatch(/doctor/i);
    expect(
      row,
      "P0 row must call out the remaining open scope: --repair per prod DB + non-codecamp gates"
    ).toMatch(/--repair|non-codecamp|production DB/i);
  });

  it("adds a lessons-learned entry for drizzle migrator strict-`<` `when` semantics", () => {
    expect(
      existsSync(LESSONS_LEARNED_PATH),
      "measure/lessons-learned.md must exist for the lessons-entry check"
    ).toBe(true);
    const text = readFileSync(LESSONS_LEARNED_PATH, "utf8");
    // The entry must mention (a) drizzle migrator, (b) the strict-`<`
    // semantics, (c) the production-ledger ceiling.
    expect(
      text,
      "lessons-learned must mention drizzle migrator strict-`<` semantics"
    ).toMatch(/drizzle[^.\n]*migrator|migrator[^.\n]*drizzle/i);
    expect(
      text,
      "lessons-learned must capture the strict-`<` invariant"
    ).toMatch(/strict-?</i);
    expect(
      text,
      "lessons-learned must reference the production-ledger ceiling 1779120000000"
    ).toMatch(/1779120000000/);
  });
});
