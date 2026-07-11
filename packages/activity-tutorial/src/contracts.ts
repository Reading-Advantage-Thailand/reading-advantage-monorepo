import { z } from "zod";

const safeRelativePathSchema = z.string().trim().min(1).refine((path) =>
  !path.startsWith("/") && !path.startsWith("\\") && !path.split(/[\\/]/).includes("..") && !/^[A-Za-z]:[\\/]/.test(path),
"Path must be repository-relative and cannot traverse parent directories");

const commandSchema = z.object({
  commandId: z.string().regex(/^[a-z0-9.-]+$/),
  profile: z.literal("git-status-porcelain"),
}).strict();

const fileCheckSchema = z.object({
  checkId: z.string().regex(/^[a-z0-9.-]+$/), kind: z.literal("file_contains"),
  filePath: safeRelativePathSchema, expected: z.string().min(1).max(500),
}).strict();
const typescriptObjectShapeCheckSchema = z.object({
  checkId: z.string().regex(/^[a-z0-9.-]+$/), kind: z.literal("typescript_object_shape"),
  filePath: safeRelativePathSchema, exportName: z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/),
  requiredProperties: z.array(z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/)).min(1),
  propertyContracts: z.array(z.discriminatedUnion("kind", [
    z.object({ property: z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/), kind: z.literal("string"), format: z.enum(["nonempty", "semver"]).default("nonempty"), allowedValues: z.array(z.string().min(1)).min(1).optional() }).strict(),
    z.object({ property: z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/), kind: z.literal("string_array"), minItems: z.number().int().nonnegative().default(0) }).strict(),
  ])).min(1),
}).strict();
const commandCheckSchema = z.object({
  checkId: z.string().regex(/^[a-z0-9.-]+$/), kind: z.literal("command"),
  commandId: z.string().regex(/^[a-z0-9.-]+$/), expected: z.union([z.literal("clean"), z.string().regex(/^staged:[^\r\n]+$/)]),
}).strict();

/** Versioned tutorial repository manifest with allowlisted files and commands. */
export const tutorialManifestSchema = z.object({
  schemaVersion: z.literal("activity-tutorial.v1"),
  repositoryId: z.string().trim().min(1), activityId: z.string().trim().min(1),
  activityVersion: z.string().trim().min(1), graphVersion: z.string().trim().min(1),
  allowedFiles: z.array(safeRelativePathSchema).min(1),
  allowedCommands: z.array(commandSchema),
  completionCriteria: z.object({ requiredStepIds: z.array(z.string().regex(/^[a-z0-9.-]+$/)).min(1) }).strict(),
  steps: z.array(z.object({
    stepId: z.string().regex(/^[a-z0-9.-]+$/), order: z.number().int().positive(),
    objectiveId: z.string().trim().min(1), instruction: z.record(z.string(), z.string().min(1)),
    checks: z.array(z.discriminatedUnion("kind", [fileCheckSchema, typescriptObjectShapeCheckSchema, commandCheckSchema])).min(1),
    hints: z.array(z.object({ hintId: z.string().min(1), text: z.record(z.string(), z.string().min(1)) }).strict()),
    reveals: z.array(z.object({ revealId: z.string().min(1), text: z.record(z.string(), z.string().min(1)) }).strict()),
    resourceIds: z.array(z.string().min(1)), scaffoldLevel: z.number().int().min(0).max(3),
  }).strict()).min(1),
}).strict().superRefine((manifest, context) => {
  const fileSet = new Set(manifest.allowedFiles);
  const commandSet = new Set(manifest.allowedCommands.map(({ commandId }) => commandId));
  const unique = (values: string[]) => new Set(values).size === values.length;
  if (!unique(manifest.allowedFiles)) context.addIssue({ code: "custom", path: ["allowedFiles"], message: "Allowed files must be unique" });
  if (!unique(manifest.allowedCommands.map(({ commandId }) => commandId))) context.addIssue({ code: "custom", path: ["allowedCommands"], message: "Command IDs must be unique" });
  if (!unique(manifest.steps.map(({ stepId }) => stepId))) context.addIssue({ code: "custom", path: ["steps"], message: "Step IDs must be unique" });
  if (!unique(manifest.steps.map(({ order }) => String(order)))) context.addIssue({ code: "custom", path: ["steps"], message: "Step order values must be unique" });
  if (!unique(manifest.completionCriteria.requiredStepIds)) context.addIssue({ code: "custom", path: ["completionCriteria", "requiredStepIds"], message: "Required step IDs must be unique" });
  const stepIds = new Set(manifest.steps.map(({ stepId }) => stepId));
  for (const [requiredIndex, stepId] of manifest.completionCriteria.requiredStepIds.entries()) {
    if (!stepIds.has(stepId)) context.addIssue({ code: "custom", path: ["completionCriteria", "requiredStepIds", requiredIndex], message: "Required completion step is not authored" });
  }
  const orderedSteps = [...manifest.steps].sort((left, right) => left.order - right.order);
  for (const [index, step] of orderedSteps.entries()) {
    if (step.order !== index + 1) context.addIssue({ code: "custom", path: ["steps"], message: "Step order must be consecutive starting at one" });
    if (index > 0 && step.scaffoldLevel > orderedSteps[index - 1]!.scaffoldLevel) context.addIssue({ code: "custom", path: ["steps", manifest.steps.indexOf(step), "scaffoldLevel"], message: "Scaffolding must fade or remain stable as steps advance" });
  }
  for (const [stepIndex, step] of manifest.steps.entries()) {
    if (!unique(step.checks.map(({ checkId }) => checkId))) context.addIssue({ code: "custom", path: ["steps", stepIndex, "checks"], message: "Check IDs must be unique within a step" });
    for (const [checkIndex, check] of step.checks.entries()) {
      if ((check.kind === "file_contains" || check.kind === "typescript_object_shape") && !fileSet.has(check.filePath)) context.addIssue({ code: "custom", path: ["steps", stepIndex, "checks", checkIndex, "filePath"], message: "Check file is not allowlisted" });
      if (check.kind === "command" && !commandSet.has(check.commandId)) context.addIssue({ code: "custom", path: ["steps", stepIndex, "checks", checkIndex, "commandId"], message: "Check command is not allowlisted" });
      if (check.kind === "typescript_object_shape") {
        const required = new Set(check.requiredProperties);
        const contracted = check.propertyContracts.map(({ property }) => property);
        if (new Set(contracted).size !== contracted.length) context.addIssue({ code: "custom", path: ["steps", stepIndex, "checks", checkIndex, "propertyContracts"], message: "Property contracts must be unique" });
        if (contracted.some((property) => !required.has(property)) || check.requiredProperties.some((property) => !contracted.includes(property))) context.addIssue({ code: "custom", path: ["steps", stepIndex, "checks", checkIndex, "propertyContracts"], message: "Every required property must have exactly one property contract" });
      }
    }
  }
});

/** Validated tutorial repository manifest. */
export type TutorialManifest = z.infer<typeof tutorialManifestSchema>;

/** Secret-free structured result uploaded after a local tutorial check. */
export const tutorialCheckResultSchema = z.object({
  schemaVersion: z.literal("activity-tutorial-result.v1"), repositoryId: z.string(), activityId: z.string(),
  stepId: z.string(), passed: z.boolean(), checkedAt: z.string().datetime({ offset: true }),
  evidenceDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  checks: z.array(z.object({ checkId: z.string(), passed: z.boolean(), evidenceDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/) }).strict()),
}).strict();

/** Secret-free tutorial check result. */
export type TutorialCheckResult = z.infer<typeof tutorialCheckResultSchema>;
