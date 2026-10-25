// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(app, "../..");
const image = "asia-southeast1-docker.pkg.dev/primary-advantage/primary-advantage-repo/storytime-app";

/**
 * Read a required artifact with an explicit missing-file assertion.
 * @param path The artifact path.
 * @returns The file text.
 */
function readRequired(path: string): string {
  expect(existsSync(path), `Missing Phase 1 artifact: ${path}`).toBe(true);
  return readFileSync(path, "utf8");
}

describe("Phase 1 service contracts", () => {
  it("AC-1.2 builds and deploys only the Storytime service without traffic", () => {
    const config = parse(readRequired(resolve(app, "cloudbuild.yaml")));
    const substitute = (value: string): string => value.replace(
      /\$\{(_[A-Z0-9_]+)\}|\$(_[A-Z0-9_]+)/g,
      (_match, braced, bare) => config.substitutions?.[braced ?? bare] ?? _match,
    ).replace(/\$\{PROJECT_ID\}|\$PROJECT_ID/g, "primary-advantage");
    const steps = config.steps.map((step: { args?: string[] }) => (step.args ?? []).map(substitute));
    const deploys = steps.filter((args: string[]) => args[0] === "run" && args[1] === "deploy");
    expect(deploys).toHaveLength(1);
    const deploy = deploys[0];
    expect(deploy[2]).toBe("storytime-app");
    expect(deploy).toContain("--no-traffic");
    expect(deploy.join(" ")).toMatch(/--tag(?:=|\s+)\S+/);
    expect(deploy.join(" ")).toMatch(/--region(?:=|\s+)asia-southeast1(?:\s|$)/);
    expect(deploy.join(" ")).toContain(`--image=${image}:`);
    expect(JSON.stringify(config)).not.toContain("primary-advantage-app");
    expect(JSON.stringify(config)).not.toMatch(/DATABASE_URL|secretEnv|availableSecrets|--(?:set|update)-secrets|--add-cloudsql/);
    expect(steps.some((args: string[]) => args.includes("update-traffic"))).toBe(false);
    const build = steps.find((args: string[]) => args[0] === "build");
    expect(build).toBeDefined();
    expect(build).toContain("apps/storytime/Dockerfile");
    expect(build).toContain(".");
    expect(build.some((arg: string) => arg.startsWith(`${image}:`))).toBe(true);
    expect(steps.some((args: string[]) => args[0] === "push" && args[1].startsWith(`${image}:`))).toBe(true);
    if (deploy.some((arg: string) => arg.startsWith("--project"))) {
      expect(deploy.join(" ")).toMatch(/--project(?:=|\s+)primary-advantage(?:\s|$)/);
    }
  });

  it("AC-1.4 provides the standalone Docker runner on port 8080", () => {
    const dockerfile = readRequired(resolve(app, "Dockerfile"));
    const commands = dockerfile.split("\n").filter((line) => !line.trim().startsWith("#")).join("\n");
    expect(commands).toMatch(/RUN\s+pnpm turbo run build --filter=storytime\b/);
    expect(commands).toContain("/app/apps/storytime/.next/standalone");
    expect(commands).toContain("/app/apps/storytime/.next/static");
    expect(commands).toMatch(/ENV\s+PORT(?:=|\s+)8080/);
    expect(commands).toMatch(/EXPOSE\s+8080/);
    expect(commands).toMatch(/CMD\s+\[\s*"node",\s*"apps\/storytime\/server\.js"\s*\]/);
    const ignore = readRequired(resolve(root, ".dockerignore")).split("\n");
    for (const path of [".git", "**/node_modules", "**/.next", "**/.env", "**/.env.*"]) {
      expect(ignore).toContain(path);
    }
  });

  it("task 1.5 documents the archive, tagged check, traffic gate, and rollback", () => {
    const runbook = readRequired(resolve(root, "docs/runbooks/storytime-deploy.md"));
    expect(runbook).toMatch(/git archive\b/);
    expect(runbook).toContain("gcloud builds submit --region asia-southeast1 --config apps/storytime/cloudbuild.yaml");
    expect(runbook).toContain("--project primary-advantage");
    expect(runbook).toContain("storytime-app");
    expect(runbook).toMatch(/curl[^\n]*(?:tag|candidate|---)/i);
    expect(runbook).toMatch(/gcloud run services update-traffic storytime-app/);
    expect(runbook).toMatch(/--to-revisions[= ]/);
    expect(runbook).toMatch(/rollback/i);
    expect(runbook).toMatch(/(?:previous|rollback)[^\n]*(?:revision)|(?:revision)[^\n]*(?:previous|rollback)/i);
    expect(runbook).toMatch(/Daniel[^.\n]*(?:go|approval)/);
    expect(runbook).toMatch(/(?:deploy|traffic)[^.\n]*(?:Daniel)|Daniel[^.\n]*(?:deploy|traffic)/i);
  });
});
