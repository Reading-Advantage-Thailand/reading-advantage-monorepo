/**
 * Cloud Build YAML parser — pure helper for Phase 2 cold-start optimization.
 *
 * Parses a simplified Cloud Build YAML string into typed step objects.
 * Uses only stdlib string operations — no external YAML dependency
 * (per test-strategy §4: "prefer hand parse; fall back to existing dep
 * only — do not add `yaml` if not already present").
 *
 * @see measure/tracks/codecamp_infra_cold_start_20260608/test-strategy.md §2
 */

/** A parsed Cloud Build step. */
export interface CloudBuildStep {
  /** The step's `id` field (e.g. `"deploy-cloudrun"`). */
  id: string;
  /** The step's `name` field (e.g. `"gcr.io/cloud-builders/gcloud"`). */
  name: string;
  /** The step's `args` field, collected from either block or inline form. */
  args: string[];
}

/**
 * Parse a simplified Cloud Build YAML string into an ordered list of steps.
 *
 * Supports two arg forms seen in real `cloudbuild.yaml` files:
 *   - Block form: each arg on its own `- "value"` line
 *   - Inline form: `args: ["a", "b", "c"]` on a single line
 *
 * @param yamlText The raw YAML string to parse.
 * @returns Ordered array of `CloudBuildStep` objects.
 */
export function parseCloudBuildSteps(yamlText: string): CloudBuildStep[] {
  if (!yamlText.trim()) return [];

  const steps: CloudBuildStep[] = [];

  // Split on step boundaries: lines matching `  - name:` (with optional leading whitespace).
  const stepBlocks = yamlText.split(/\n\s*-\s*name:\s*/);

  // The first element is the preamble before the first `- name:` (usually just "steps:\n").
  for (let i = 1; i < stepBlocks.length; i++) {
    const block = stepBlocks[i]!;

    // Extract name: it's the rest of the split delimiter line up to the newline.
    const nameLineMatch = block.match(/^"?([^"\n]+)"?\s*/);
    const name = nameLineMatch?.[1]?.trim() ?? "";

    // Extract id.
    const idMatch = block.match(/id:\s*"([^"]+)"/);
    const id = idMatch?.[1] ?? "";

    // Extract args — try inline form first, then block form.
    let args: string[] = [];
    const inlineArgsMatch = block.match(/args:\s*\[([^\]]*)\]/);
    if (inlineArgsMatch) {
      // Inline: args: ["a", "b", "c"]
      const raw = inlineArgsMatch[1]!;
      args = raw
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    } else {
      // Block form: collect lines matching `      - "value"`.
      const argMatches = [...block.matchAll(/^\s*-\s*"([^"]+)"\s*$/gm)];
      // Only collect args that appear after the `args:` key.
      const argsKeyIndex = block.indexOf("args:");
      if (argsKeyIndex !== -1) {
        const afterArgs = block.slice(argsKeyIndex);
        const blockArgMatches = [...afterArgs.matchAll(/^\s*-\s*"([^"]+)"\s*$/gm)];
        args = blockArgMatches.map((m) => m[1]!).filter(Boolean);
      }
    }

    if (id) {
      steps.push({ id, name, args });
    }
  }

  return steps;
}

/**
 * Check whether the `deploy-cloudrun` step in the given YAML contains
 * exactly `--min-instances=<n>` in its args.
 *
 * @param yamlText The raw Cloud Build YAML string.
 * @param n The expected min-instances value.
 * @returns `true` iff the deploy step exists and contains the exact flag.
 */
export function hasMinInstances(yamlText: string, n: number): boolean {
  const steps = parseCloudBuildSteps(yamlText);
  const deployStep = steps.find((s) => s.id === "deploy-cloudrun");
  if (!deployStep) return false;
  return deployStep.args.includes(`--min-instances=${n}`);
}
