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
});
