import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "../..");
const workerRoute = resolve(appRoot, "app/api/internal/review-worker-tick/route.ts");
const cloudbuild = resolve(appRoot, "cloudbuild.yaml");
const schedulerConfig = resolve(
  appRoot,
  "scripts/configure-review-worker-scheduler.sh",
);

/** Reads a checked-in deployment artifact when it exists. */
function readArtifact(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("Codecamp PR-review worker deployment contract", () => {
  it("ships the exact internal worker tick route with secret-backed bearer authentication", () => {
    expect(existsSync(workerRoute), `missing Cloud Scheduler target route: ${workerRoute}`).toBe(true);
    if (!existsSync(workerRoute)) return;

    const source = readArtifact(workerRoute);
    expect(source).toContain("REVIEW_WORKER_TICK_TOKEN");
    expect(source).toMatch(/headers\.get\(["']authorization["']\)/i);
    expect(source).toContain("Bearer");
    expect(source).toMatch(
      /(?:authorization|expectedAuthorization)[\s\S]{0,240}(?:!==|===|!=|==)[\s\S]{0,240}(?:authorization|expectedAuthorization)/i,
    );
    expect(source).toContain("runWorkerTick");
  });

  it("binds the route token from the canonical Secret Manager secret", () => {
    const source = readArtifact(cloudbuild);
    expect(source).toContain(
      "REVIEW_WORKER_TICK_TOKEN=CODECAMP_REVIEW_WORKER_TICK_TOKEN:latest",
    );
    expect(source).toContain(
      "projects/$PROJECT_ID/secrets/CODECAMP_REVIEW_WORKER_TICK_TOKEN/versions/latest",
    );
    expect(source).toContain('env: "CODECAMP_REVIEW_WORKER_TICK_TOKEN"');
  });

  it("deploys an isolated, approved OpenRouter candidate in the production region", () => {
    const source = readArtifact(cloudbuild);

    expect(source).toContain("--region=asia-southeast1");
    expect(source).toContain("AI_PROVIDER=openrouter");
    expect(source).toContain("CODECAMP_PR_REVIEW_ROLLOUT_MODE=active");
    expect(source).toContain(
      "CODECAMP_PR_REVIEW_RELEASE_APPROVED_BY=codecamp-ops-release",
    );
    expect(source).toContain("--no-traffic");
  });

  it("checks in the exact two-minute Cloud Scheduler target without a literal credential", () => {
    const source = readArtifact(schedulerConfig);

    expect(source, "missing checked-in Cloud Scheduler configuration").toContain(
      "codecamp-review-worker-tick",
    );
    expect(source).toContain('readonly location="${REVIEW_WORKER_SCHEDULER_LOCATION:-asia-southeast1}"');
    expect(source).toContain('readonly schedule="*/2 * * * *"');
    expect(source).toContain(
      'readonly uri="https://codecamp.reading-advantage.com/api/internal/review-worker-tick"',
    );
    expect(source).toContain('"--time-zone=Etc/UTC"');
    expect(source).toContain("*/2 * * * *");
    expect(source).toContain(
      "https://codecamp.reading-advantage.com/api/internal/review-worker-tick",
    );
    expect(source).toContain("REVIEW_WORKER_TICK_TOKEN");
    expect(source).toContain("CODECAMP_REVIEW_WORKER_TICK_TOKEN");
  });

  it("passes --attempt-deadline=180s on the create branch of the scheduler config (FR-7)", () => {
    const source = readArtifact(schedulerConfig);
    // The scheduler config has both a `create` and an `update` branch. Both
    // must forward the tick deadline so the worker has a time budget per tick.
    expect(source, "scheduler create branch must forward the attempt deadline").toMatch(
      /gcloud\s+scheduler\s+jobs\s+create\s+http[\s\S]{0,400}--attempt-deadline=180s/,
    );
    expect(source, "scheduler update branch must forward the attempt deadline").toMatch(
      /gcloud\s+scheduler\s+jobs\s+update\s+http[\s\S]{0,400}--attempt-deadline=180s/,
    );
  });

  it("sets REVIEW_WORKER_BACKOFF_BASE_MS=30000 in --set-env-vars (FR-6)", () => {
    const source = readArtifact(cloudbuild);
    // The base backoff must be 30 seconds so five attempts span ~8 minutes
    // (30000 * 2^0..4 = ~465s ≈ 7.75 min).
    expect(
      source,
      "cloudbuild.yaml must export REVIEW_WORKER_BACKOFF_BASE_MS=30000",
    ).toMatch(/--set-env-vars=[\s\S]*?REVIEW_WORKER_BACKOFF_BASE_MS=30000/);
  });

  it("pins CODECAMP_PR_REVIEW_MODEL to a non-alias version (no `~` prefix) (FR-8)", () => {
    const source = readArtifact(cloudbuild);
    const match = source.match(/CODECAMP_PR_REVIEW_MODEL=([^,]+)/);
    expect(match, "cloudbuild.yaml must pin CODECAMP_PR_REVIEW_MODEL").not.toBeNull();
    const pinnedValue = match?.[1]?.trim() ?? "";
    expect(pinnedValue.length, "CODECAMP_PR_REVIEW_MODEL value must be non-empty").toBeGreaterThan(0);
    expect(
      pinnedValue.startsWith("~"),
      `CODECAMP_PR_REVIEW_MODEL must NOT use the OpenRouter ~alias prefix (got: ${pinnedValue})`,
    ).toBe(false);
  });
});
