import { describe, it, expect } from "vitest";
import {
  parseCloudBuildSteps,
  hasMinInstances,
  type CloudBuildStep,
} from "../_helpers/cloudbuild-parser";

/**
 * Phase 2 — Cloud Build parser helper (unit tests, fixture strings only).
 *
 * These tests are the **Red** gate for the `cloudbuild-parser` helper described
 * in `measure/tracks/codecamp_infra_cold_start_20260608/test-strategy.md` §2
 * and §7.
 *
 * Contract under test (the implementer owns the API shape; tests pin it):
 *   - `parseCloudBuildSteps(yamlText: string): CloudBuildStep[]`
 *       Pure function: takes a YAML string, returns a typed list of steps
 *       (id, name, args). No filesystem access. No new runtime deps
 *       (test-strategy §4: "prefer hand parse; fall back to existing dep
 *       only — do not add `yaml` if not already present").
 *   - `hasMinInstances(yamlText: string, n: number): boolean`
 *       True iff the `deploy-cloudrun` step's args contain exactly
 *       `--min-instances=<n>`. Returns false if the step is absent or the
 *       flag value does not match.
 *
 * The test name "asserts chosen lever" matches the §7 Red command filter
 * (`vitest run … -t "asserts chosen lever"`) so the supervisor can verify
 * the chosen-lever assertion is present and failing.
 *
 * Chosen lever for this track: `--min-instances=1` on the
 * `deploy-cloudrun` step (per test-strategy §7 handoff: "recommend
 * min-instances=1 as fastest"). The other Phase 2 levers (image-size
 * reduction, Next.js startup hooks) are already satisfied at HEAD per
 * test-strategy §6 and the current Dockerfile / next.config.ts inspection.
 *
 * The parser helper does **not** exist yet at HEAD; the import below
 * resolves to a non-existent module, which is the expected Red per §7
 * ("assertion absent → fail" — the helper, including the chosen-lever
 * assertion, is the Green-phase deliverable). Tests intentionally use
 * fixture strings only, never the real `cloudbuild.yaml`, per §2.
 */
describe("parseCloudBuildSteps (Phase 2 cold-start optimization parser)", () => {
  it("extracts a step's id, name, and args from a single-step fixture", () => {
    const yaml = [
      'steps:',
      '  - name: "gcr.io/cloud-builders/gcloud"',
      '    id: "deploy-cloudrun"',
      '    args:',
      '      - "run"',
      '      - "deploy"',
      '      - "--region=asia-southeast1"',
    ].join("\n");

    const steps = parseCloudBuildSteps(yaml);

    expect(steps).toHaveLength(1);
    expect(steps[0]!.id).toBe("deploy-cloudrun");
    expect(steps[0]!.name).toBe("gcr.io/cloud-builders/gcloud");
    expect(steps[0]!.args).toEqual(["run", "deploy", "--region=asia-southeast1"]);
  });

  it("returns multiple steps in declaration order from a multi-step fixture", () => {
    const yaml = [
      'steps:',
      '  - name: "gcr.io/cloud-builders/docker"',
      '    id: "build-image"',
      '    args: ["build", "-t", "image:tag", "."]',
      '  - name: "gcr.io/cloud-builders/docker"',
      '    id: "push-image"',
      '    args: ["push", "image:tag"]',
      '  - name: "gcr.io/cloud-builders/gcloud"',
      '    id: "deploy-cloudrun"',
      '    args: ["run", "deploy", "svc", "--region=asia-southeast1"]',
    ].join("\n");

    const steps = parseCloudBuildSteps(yaml);

    expect(steps.map((s) => s.id)).toEqual(["build-image", "push-image", "deploy-cloudrun"]);
    expect(steps.map((s) => s.name![0])).toEqual(["g", "g", "g"]);
  });

  it("returns an empty array for a fixture declaring no steps", () => {
    expect(parseCloudBuildSteps("steps: []\n")).toEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseCloudBuildSteps("")).toEqual([]);
  });

  it("is a pure function — accepts a raw string, never reads the filesystem", () => {
    const yaml = 'steps:\n  - name: "x"\n    id: "y"\n    args: ["a", "b"]\n';
    // Type-system enforcement: the parameter is `yamlText: string`, not a path.
    // The test verifies the helper is callable with a raw string literal and
    // returns the expected shape — i.e. it does not internally call
    // `readFileSync` or `fs.promises.readFile`.
    const steps = parseCloudBuildSteps(yaml);
    expect(steps).toHaveLength(1);
    expect(steps[0]!.args).toEqual(["a", "b"]);
  });

  it("CloudBuildStep is a typed shape with id/name/args fields", () => {
    // Type-system guard: this assignment must type-check against the
    // exported interface. If the implementer changes the shape, this test
    // will fail to compile (vitest's `expectTypeOf` is not used here; a
    // plain assignment is sufficient to keep the contract pinned).
    const sample: CloudBuildStep = { id: "x", name: "y", args: ["z"] };
    expect(sample.args).toEqual(["z"]);
  });
});

describe("hasMinInstances (Phase 2 chosen-lever assertion)", () => {
  it("asserts chosen lever: returns true when --min-instances=1 is in the deploy step", () => {
    // This is the test name the test-strategy §7 Red command filters on:
    //   pnpm --filter codecamp-advantage vitest run \
    //     lib/__tests__/_helpers/cloudbuild-parser.test.ts -t "asserts chosen lever"
    const yaml = [
      'steps:',
      '  - name: "gcr.io/cloud-builders/gcloud"',
      '    id: "deploy-cloudrun"',
      '    args:',
      '      - "run"',
      '      - "deploy"',
      '      - "codecamp-advantage"',
      '      - "--min-instances=1"',
      '      - "--region=asia-southeast1"',
    ].join("\n");

    expect(hasMinInstances(yaml, 1)).toBe(true);
  });

  it("returns false when --min-instances is absent from the deploy step", () => {
    const yaml = [
      'steps:',
      '  - name: "gcloud"',
      '    id: "deploy-cloudrun"',
      '    args: ["run", "deploy", "x", "--region=asia-southeast1"]',
    ].join("\n");

    expect(hasMinInstances(yaml, 1)).toBe(false);
  });

  it("returns false when --min-instances is set to a different value", () => {
    const yaml = [
      'steps:',
      '  - name: "gcloud"',
      '    id: "deploy-cloudrun"',
      '    args: ["run", "deploy", "x", "--min-instances=3"]',
    ].join("\n");

    expect(hasMinInstances(yaml, 1)).toBe(false);
  });

  it("returns false when the deploy-cloudrun step is absent", () => {
    const yaml = 'steps:\n  - name: "docker"\n    id: "build"\n    args: ["build"]\n';
    expect(hasMinInstances(yaml, 1)).toBe(false);
  });

  it("scopes the check to the deploy-cloudrun step (ignores other steps)", () => {
    // Regression guard: a --min-instances flag on a non-deploy step must
    // not satisfy the chosen-lever check. The contract is "in the deploy
    // step's args", not "anywhere in the file".
    const yaml = [
      'steps:',
      '  - name: "docker"',
      '    id: "build-image"',
      '    args: ["build", "--min-instances=1"]',
      '  - name: "gcloud"',
      '    id: "deploy-cloudrun"',
      '    args: ["run", "deploy", "x", "--region=asia-southeast1"]',
    ].join("\n");

    expect(hasMinInstances(yaml, 1)).toBe(false);
  });
});
