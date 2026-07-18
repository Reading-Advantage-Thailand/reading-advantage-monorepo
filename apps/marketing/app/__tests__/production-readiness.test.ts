import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parse } from "yaml";

const { requireAuthMock } = vi.hoisted(() => ({
  requireAuthMock: vi.fn(),
}));

vi.mock("@reading-advantage/auth", async () => {
  const actual =
    await vi.importActual<typeof import("@reading-advantage/auth")>(
      "@reading-advantage/auth",
    );
  return {
    ...actual,
    requireAuth: requireAuthMock,
  };
});

vi.mock("@/lib/db", () => ({ db: { marker: "marketing-db" } }));

interface CloudBuildStep {
  id?: string;
  name?: string;
  args?: string[];
  secretEnv?: string[];
}

interface CloudBuildConfig {
  steps?: CloudBuildStep[];
  images?: string[];
  availableSecrets?: {
    secretManager?: Array<{ env?: string; versionName?: string }>;
  };
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const marketingRoot = resolve(currentDirectory, "../..");

/**
 * Returns a required Cloud Build step from the parsed configuration.
 * @param config The parsed Cloud Build configuration.
 * @param id The step identifier to find.
 * @returns The matching Cloud Build step.
 */
function requireBuildStep(config: CloudBuildConfig, id: string): CloudBuildStep {
  const step = config.steps?.find((candidate) => candidate.id === id);
  if (!step) throw new Error(`Missing Cloud Build step: ${id}`);
  return step;
}

describe("Marketing production access boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admits only the explicit legacy ADMIN compatibility role", async () => {
    const session = {
      id: "session-id",
      userId: "user-id",
      expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      user: { role: "ADMIN" },
    };
    requireAuthMock.mockResolvedValue(session);

    const { requireMarketingSession } = await import("@/lib/auth");
    const result = await requireMarketingSession(
      new Request("https://marketing.reading-advantage.com/api/campaigns", {
        headers: { cookie: "session_token=valid-token" },
      }),
    );

    expect(result).toEqual({ ok: true, session });
    expect(requireAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({ marker: "marketing-db" }),
      "valid-token",
    );
  }, 15_000);

  it.each(["SYSTEM", "SALES_ADMIN", "SALES_REP", "TEACHER", "STUDENT", "INTERN"])(
    "returns 403 for the non-Marketing legacy role %s",
    async (role) => {
      requireAuthMock.mockResolvedValue({
        id: "session-id",
        userId: "user-id",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
        user: { role },
      });

      const { requireMarketingSession } = await import("@/lib/auth");
      const result = await requireMarketingSession(
        new Request("https://marketing.reading-advantage.com/api/campaigns", {
          headers: { cookie: "session_token=non-marketing-token" },
        }),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
        await expect(result.response.json()).resolves.toEqual({
          message: "Marketing access required",
        });
      }
    },
  );
});

describe("Marketing Cloud Run production contract", () => {
  const cloudbuildText = readFileSync(
    resolve(marketingRoot, "cloudbuild.yaml"),
    "utf8",
  );
  const cloudbuild = parse(cloudbuildText) as CloudBuildConfig;
  const dockerfile = readFileSync(resolve(marketingRoot, "Dockerfile"), "utf8");
  const packageJson = JSON.parse(
    readFileSync(resolve(marketingRoot, "package.json"), "utf8"),
  ) as { scripts?: Record<string, string> };
  const grantsSql = readFileSync(
    resolve(marketingRoot, "scripts/marketing-runtime-grants.sql"),
    "utf8",
  );
  const probeSql = readFileSync(
    resolve(marketingRoot, "scripts/marketing-runtime-probe.sql"),
    "utf8",
  );

  it("parses the canonical image, service account, database, and domain", () => {
    const build = requireBuildStep(cloudbuild, "build-image");
    const deploy = requireBuildStep(cloudbuild, "deploy-cloudrun");

    expect(build.args).toContain(
      "asia-southeast1-docker.pkg.dev/$PROJECT_ID/marketing/marketing:$BUILD_ID",
    );
    expect(cloudbuild.images).toEqual([
      "asia-southeast1-docker.pkg.dev/$PROJECT_ID/marketing/marketing:$BUILD_ID",
    ]);
    expect(deploy.args).toContain(
      "--add-cloudsql-instances=reading-advantage:asia-southeast1:cloud-sql",
    );
    expect(deploy.args).toContain(
      "--service-account=marketing-cloud-run@$PROJECT_ID.iam.gserviceaccount.com",
    );
    expect(deploy.args).toContain(
      "--set-env-vars=NODE_ENV=production,NEXT_PUBLIC_API_URL=https://marketing.reading-advantage.com,AI_PROVIDER=openai",
    );
  });

  it("orders migration, doctor, runtime privilege proof, and deployment", () => {
    const ids = cloudbuild.steps?.map((step) => step.id) ?? [];
    expect(ids.indexOf("migrate-db")).toBeLessThan(ids.indexOf("doctor-check"));
    expect(ids.indexOf("doctor-check")).toBeLessThan(
      ids.indexOf("runtime-db-contract"),
    );
    expect(ids.indexOf("runtime-db-contract")).toBeLessThan(
      ids.indexOf("deploy-cloudrun"),
    );

    const doctor = requireBuildStep(cloudbuild, "doctor-check");
    expect(doctor.args?.join(" ")).toContain(
      "doctor --check --required-migration 0021_sales_advantage",
    );
  });

  it("uses both credentials to apply exact grants and probe required tables", () => {
    const runtimeContract = requireBuildStep(
      cloudbuild,
      "runtime-db-contract",
    );
    expect(runtimeContract.secretEnv).toEqual([
      "MARKETING_DIRECT_DATABASE_URL",
      "MARKETING_DATABASE_URL",
    ]);
    expect(runtimeContract.args?.join(" ")).toContain(
      "marketing-runtime-grants.sql",
    );
    expect(runtimeContract.args?.join(" ")).toContain(
      "marketing-runtime-probe.sql",
    );

    for (const table of [
      "users",
      "accounts",
      "sessions",
      "login_attempts",
      "audit_events",
      "campaigns",
      "past_topics",
      "settings",
      "video_projects",
    ]) {
      expect(grantsSql).toContain(`TABLE ${table}`);
      expect(probeSql).toContain(`'${table}'`);
    }
    expect(probeSql).not.toMatch(/SELECT\s+1\b/i);
  });

  it("maps every referenced secret through parsed Secret Manager entries", () => {
    const secretEntries = cloudbuild.availableSecrets?.secretManager ?? [];
    expect(secretEntries).toEqual(
      expect.arrayContaining([
        {
          env: "MARKETING_DIRECT_DATABASE_URL",
          versionName:
            "projects/$PROJECT_ID/secrets/MARKETING_DIRECT_DATABASE_URL/versions/latest",
        },
        {
          env: "MARKETING_DATABASE_URL",
          versionName:
            "projects/$PROJECT_ID/secrets/MARKETING_DATABASE_URL/versions/latest",
        },
      ]),
    );
  });

  it("builds and boots the compiled vinext runtime as part of the image build", () => {
    expect(packageJson.scripts?.build).toBe(
      "vinext build && node scripts/verify-vinext-runtime.mjs",
    );
    expect(dockerfile).toContain("RUN pnpm turbo run build --filter=marketing");
    expect(dockerfile).toContain("ENV PORT=8080");
    expect(dockerfile).toContain("USER appuser");
    expect(dockerfile).toContain(
      "/app/apps/marketing/package.json ./package.json",
    );
    expect(dockerfile).toContain(
      'CMD ["node", "./node_modules/vinext/dist/cli.js", "start"]',
    );
  });
});
