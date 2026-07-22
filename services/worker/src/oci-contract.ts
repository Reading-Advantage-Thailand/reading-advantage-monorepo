import { z } from "zod";

const workerDeploymentTargetSchema = z.object({
  healthCheckPath: z.string().startsWith("/"),
  name: z.enum(["cloud-run", "ecs-fargate"]),
  portMode: z.enum(["environment", "task-definition"]),
});

const workerOciContractSchema = z.object({
  schemaVersion: z.literal(1),
  service: z.literal("@reading-advantage/worker"),
  image: z.object({
    architectures: z.array(z.enum(["amd64", "arm64"])).min(1),
    operatingSystem: z.literal("linux"),
    runsAsNonRoot: z.literal(true),
  }),
  process: z.object({
    command: z.array(z.string().min(1)).min(1),
    shutdownSignals: z.array(z.enum(["SIGTERM", "SIGINT"])).min(1),
  }),
  http: z.object({
    defaultHost: z.string().min(1),
    defaultPort: z.number().int().min(1).max(65_535),
    hostEnv: z.literal("HOST"),
    livenessPath: z.string().startsWith("/"),
    portEnv: z.literal("PORT"),
    readinessPath: z.string().startsWith("/"),
  }),
  targets: z.array(workerDeploymentTargetSchema).min(1),
});

/** Portable worker deployment target recorded in the OCI contract. */
export type WorkerDeploymentTarget = z.infer<
  typeof workerDeploymentTargetSchema
>;

/** Validated, provider-neutral process and network contract for the worker image. */
export type WorkerOciContract = z.infer<typeof workerOciContractSchema>;

/**
 * Parses the worker OCI contract and verifies requested deployment targets.
 * @param source Untrusted JSON-compatible contract value.
 * @param requestedTargets Deployment targets the caller needs to validate.
 * @returns The validated provider-neutral worker OCI contract.
 * @throws When the contract is invalid, has duplicate targets, or omits a requested target.
 */
export function parseWorkerOciContract(
  source: unknown,
  requestedTargets: readonly string[] = [],
): WorkerOciContract {
  const parsed = workerOciContractSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid worker OCI contract: ${issues}`);
  }

  const availableTargets = new Set(
    parsed.data.targets.map((target) => target.name),
  );
  if (availableTargets.size !== parsed.data.targets.length) {
    throw new Error("Invalid worker OCI contract: deployment targets must be unique");
  }

  const unsupportedTargets = requestedTargets.filter(
    (target) => !availableTargets.has(target as WorkerDeploymentTarget["name"]),
  );
  if (unsupportedTargets.length > 0) {
    throw new Error(
      `Unsupported worker OCI deployment target(s): ${unsupportedTargets.join(", ")}`,
    );
  }

  return Object.freeze(parsed.data);
}

/**
 * Validates the Dockerfile-specific ignore file that bounds the worker build context.
 * @param buildContextDefinition Docker ignore rules selected for the worker image.
 * @returns Nothing when only source inputs are allowlisted and package artifacts remain excluded.
 * @throws When the repository is not excluded first, a required rule is omitted, or an exclusion is ordered unsafely.
 */
export function validateWorkerBuildContextDefinition(
  buildContextDefinition: string,
): void {
  const rules = buildContextDefinition
    .split(/\r?\n/)
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0 && !rule.startsWith("#"));
  if (rules[0] !== "*") {
    throw new Error(
      "Invalid worker build context: exclude the repository by default.",
    );
  }

  const requiredInputRules = [
    "!package.json",
    "!pnpm-lock.yaml",
    "!pnpm-workspace.yaml",
    "!.pnpmfile.cjs",
    "!packages/",
    "packages/*",
    "!packages/config/",
    "!packages/config/**",
    "!services/",
    "services/*",
    "!services/worker/",
    "!services/worker/**",
  ];
  const requiredExclusionRules = [
    "packages/config/node_modules",
    "packages/config/node_modules/**",
    "packages/config/dist",
    "packages/config/dist/**",
    "packages/config/.turbo",
    "packages/config/.turbo/**",
    "packages/config/coverage",
    "packages/config/coverage/**",
    "packages/config/.env",
    "packages/config/.env.*",
    "services/worker/node_modules",
    "services/worker/node_modules/**",
    "services/worker/dist",
    "services/worker/dist/**",
    "services/worker/.turbo",
    "services/worker/.turbo/**",
    "services/worker/coverage",
    "services/worker/coverage/**",
    "services/worker/.env",
    "services/worker/.env.*",
  ];
  const missingInputRules = requiredInputRules.filter(
    (rule) => !rules.includes(rule),
  );
  if (missingInputRules.length > 0) {
    throw new Error(
      `Invalid worker build context: missing required rule(s) ${missingInputRules.join(", ")}.`,
    );
  }

  const missingExclusionRules = requiredExclusionRules.filter(
    (rule) => !rules.includes(rule),
  );
  if (missingExclusionRules.length > 0) {
    throw new Error(
      `Invalid worker build context: missing required exclusion(s) ${missingExclusionRules.join(", ")}.`,
    );
  }

  const unsafelyOrderedExclusions = requiredExclusionRules.filter((rule) => {
    const broadIncludeRule = rule.startsWith("packages/config/")
      ? "!packages/config/**"
      : "!services/worker/**";
    return rules.lastIndexOf(rule) <= rules.lastIndexOf(broadIncludeRule);
  });
  if (unsafelyOrderedExclusions.length > 0) {
    throw new Error(
      `Invalid worker build context: required exclusions must follow the broad package re-includes (${unsafelyOrderedExclusions.join(", ")}).`,
    );
  }

  const allowedRules = new Set([
    "*",
    ...requiredInputRules,
    ...requiredExclusionRules,
  ]);
  const unexpectedRules = rules.filter((rule) => !allowedRules.has(rule));
  if (unexpectedRules.length > 0) {
    throw new Error(
      `Invalid worker build context: unexpected rule(s) ${unexpectedRules.join(", ")}.`,
    );
  }
}

/**
 * Validates a Dockerfile against the process, network, and non-root OCI contract.
 * @param dockerfile Dockerfile source text to validate.
 * @param contract Validated worker OCI contract.
 * @returns Nothing when every portable image invariant is present.
 * @throws When the Dockerfile contradicts or omits a required image invariant.
 */
export function validateWorkerImageDefinition(
  dockerfile: string,
  contract: WorkerOciContract,
): void {
  const command = JSON.stringify(contract.process.command);
  const checks: Array<[boolean, string]> = [
    [
      /(?:^|\n)USER\s+(?!root(?:\s|$))\S+/m.test(dockerfile),
      "The worker image must run as a non-root user.",
    ],
    [
      new RegExp(
        `(?:^|\\n)EXPOSE\\s+${contract.http.defaultPort}(?:\\s|$)`,
        "m",
      ).test(dockerfile),
      `The worker image must expose port ${contract.http.defaultPort}.`,
    ],
    [
      dockerfile.includes(`HOST=${contract.http.defaultHost}`),
      `The worker image must default HOST to ${contract.http.defaultHost}.`,
    ],
    [
      dockerfile.includes(`PORT=${contract.http.defaultPort}`),
      `The worker image must default PORT to ${contract.http.defaultPort}.`,
    ],
    [
      dockerfile.includes(`CMD ${command}`),
      `The worker image must use process command ${command}.`,
    ],
    [
      dockerfile.includes("HEALTHCHECK") &&
        dockerfile.includes(contract.http.livenessPath),
      `The worker image must probe ${contract.http.livenessPath}.`,
    ],
    [
      dockerfile.includes("--config.node-linker=isolated"),
      "The worker build must use pnpm's isolated linker instead of the monorepo hoisted linker.",
    ],
    [
      /\.\/services\/worker\/node_modules\/\.bin\/tsc\s+\\?\s*--project\s+services\/worker\/tsconfig\.build\.json/m.test(
        dockerfile,
      ),
      "The worker image must compile with the package-local pinned TypeScript binary.",
    ],
    [
      /deploy\s+--prod\s+--legacy\s+\/opt\/worker/m.test(dockerfile),
      "The worker image must use pnpm's explicit legacy deploy mode for a non-injected workspace.",
    ],
    [
      !/(?:DATABASE_URL|DIRECT_DATABASE_URL|@reading-advantage\/db|\bpostgres\b)/i.test(
        dockerfile,
      ),
      "The worker image bootstrap must not own database configuration or clients.",
    ],
  ];

  const failures = checks
    .filter(([passed]) => !passed)
    .map(([, message]) => message);
  if (failures.length > 0) {
    throw new Error(`Invalid worker image definition: ${failures.join(" ")}`);
  }
}
