import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  collectCurriculumInventory,
} from "../src/curriculum-inventory-contract.ts";
import { sha256 } from "../src/source-sync.ts";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(packageRoot, "../..");
const sourceArtifact = "source-snapshots/codecamp-curriculum-e4d3fc7cc9927f91.ts";
const sourceInputPath = process.env.CODECAMP_CURRICULUM_SOURCE == null
  ? resolve(packageRoot, sourceArtifact)
  : resolve(repoRoot, process.env.CODECAMP_CURRICULUM_SOURCE);
const outputDirectory = resolve(packageRoot, "src/data");
const curriculumData = await import(pathToFileURL(sourceInputPath).href);
const {
  MODULE_REPO_MAP,
  PORTFOLIO_PROJECTS,
  getPhaseACurriculumData,
  getPhaseBCurriculumData,
  getPhaseCCurriculumData,
  getPhaseDCurriculumData,
} = curriculumData;

const phases = [
  getPhaseACurriculumData(),
  getPhaseBCurriculumData(),
  getPhaseCCurriculumData(),
  getPhaseDCurriculumData(),
];
const modules = phases.flatMap((phase) => phase.modules);
const inventory = collectCurriculumInventory({
  modules,
  repositoryModuleSlugs: Object.keys(MODULE_REPO_MAP),
  portfolioPhases: PORTFOLIO_PROJECTS.map((portfolio) => portfolio.phase),
});
const sourceBytes = readFileSync(sourceInputPath);
const sourceDigest = sha256(sourceBytes);
const originBaseRevision = "08de1c28a154c2d0608c7b3515149b73dbe33152";
const originBaseBytes = execFileSync(
  "git",
  ["show", `${originBaseRevision}:packages/db/src/seed/codecamp-curriculum-data.ts`],
  { cwd: repoRoot },
);
const originBaseDigest = sha256(originBaseBytes);
const inventoryDigest = sha256(
  new TextEncoder().encode(JSON.stringify(inventory)),
);

const primaryObjectiveByModule: Record<string, string> = {
  "dev-environment": "codecamp.workflow.skill.development-environment",
  "git-github": "codecamp.workflow.skill.git-branches",
  "html-css": "codecamp.frontend.skill.semantic-html-css",
  javascript: "codecamp.foundation.skill.functions",
  typescript: "codecamp.foundation.skill.typescript-contracts",
  vitest: "codecamp.testing.skill.unit-tests",
  react: "codecamp.frontend.skill.react-components",
  "api-fundamentals": "codecamp.backend.concept.http-api",
  "nextjs-basics": "codecamp.frontend.skill.next-routing",
  "nextjs-advanced": "codecamp.architecture.skill.contract-first",
  "databases-orms": "codecamp.data.skill.drizzle-queries",
  "trpc-server-actions": "codecamp.architecture.skill.backend-module",
  authentication: "codecamp.backend.skill.authorization",
  internationalization: "codecamp.frontend.skill.internationalization",
  "ai-integration": "codecamp.ai.skill.provider-adapter",
  "measure-ai-development": "codecamp.workflow.skill.measure-development",
  "monorepo-packages": "codecamp.architecture.skill.shared-package",
  "cloud-docker": "codecamp.deployment.skill.container-build",
  "real-world-practice": "codecamp.workflow.skill.pull-requests",
};

const bindings: Array<Record<string, unknown>> = [];
for (const module of modules) {
  const objectiveId = primaryObjectiveByModule[module.slug];
  if (objectiveId == null) throw new Error(`Missing objective map for ${module.slug}`);
  for (const lesson of module.lessons) {
    bindings.push({
      activityId: `codecamp.${module.slug}.lesson.${lesson.order}`,
      activityKind: "lesson",
      source: { moduleSlug: module.slug, lessonOrder: lesson.order },
      objectiveIds: [objectiveId],
      practiceMode: "exposure",
      evidenceMode: "exposure",
      evidenceWeight: 0,
      evidenceSource: "lesson-view",
      variantId: null,
      variantFamily: null,
      misconceptionTags: [],
      rubricRefs: [],
      resourceRefs: [`lesson:${module.slug}:${lesson.order}`],
    });
    for (const question of lesson.questions ?? []) {
      bindings.push({
        activityId: `codecamp.${module.slug}.question.${lesson.order}.${question.order}`,
        activityKind: "question",
        source: { moduleSlug: module.slug, lessonOrder: lesson.order, itemOrder: question.order },
        objectiveIds: [objectiveId],
        practiceMode: "assessment",
        evidenceMode: "assessed",
        evidenceWeight: 0.3,
        evidenceSource: "quiz-response",
        variantId: `${module.slug}-quiz-${lesson.order}-${question.order}`,
        variantFamily: `${module.slug}-quiz`,
        misconceptionTags: [`${module.slug}-concept-confusion`],
        rubricRefs: ["codecamp.quiz.v1"],
        resourceRefs: [],
      });
    }
    for (const exercise of lesson.exercises ?? []) {
      bindings.push({
        activityId: `codecamp.${module.slug}.exercise.${lesson.order}.${exercise.order}`,
        activityKind: "exercise",
        source: { moduleSlug: module.slug, lessonOrder: lesson.order, itemOrder: exercise.order },
        objectiveIds: [objectiveId],
        practiceMode: "guided",
        evidenceMode: "assessed",
        evidenceWeight: 0.55,
        evidenceSource: "exercise-check",
        variantId: `${module.slug}-exercise-${exercise.order}`,
        variantFamily: `${module.slug}-guided-exercise`,
        misconceptionTags: [`${module.slug}-implementation-gap`],
        rubricRefs: ["codecamp.exercise.v1"],
        resourceRefs: [],
      });
    }
  }
  if (MODULE_REPO_MAP[module.slug] != null) {
    bindings.push({
      activityId: `codecamp.${module.slug}.repository`,
      activityKind: "repository",
      source: { moduleSlug: module.slug },
      objectiveIds: [objectiveId],
      practiceMode: "independent",
      evidenceMode: "assessed",
      evidenceWeight: 0.75,
      evidenceSource: "pull-request",
      variantId: `${module.slug}-repository`,
      variantFamily: `${module.slug}-independent-repository`,
      misconceptionTags: [`${module.slug}-transfer-gap`],
      rubricRefs: ["codecamp.pr.v1"],
      resourceRefs: [`repo:${module.slug}`],
    });
  }
}

const portfolioModuleByPhase: Record<string, string> = {
  A: "html-css",
  B: "react",
  C: "authentication",
  D: "cloud-docker",
};
for (const portfolio of PORTFOLIO_PROJECTS) {
  const moduleSlug = portfolioModuleByPhase[portfolio.phase]!;
  bindings.push({
    activityId: `codecamp.portfolio.phase-${portfolio.phase.toLowerCase()}`,
    activityKind: "portfolio",
    source: { moduleSlug },
    objectiveIds: [primaryObjectiveByModule[moduleSlug]!],
    practiceMode: "independent",
    evidenceMode: "assessed",
    evidenceWeight: 0.8,
    evidenceSource: "portfolio-review",
    variantId: `portfolio-phase-${portfolio.phase.toLowerCase()}`,
    variantFamily: `portfolio-phase-${portfolio.phase.toLowerCase()}`,
    misconceptionTags: ["portfolio-transfer-gap"],
    rubricRefs: ["codecamp.portfolio.v1"],
    resourceRefs: [`portfolio:phase-${portfolio.phase.toLowerCase()}`],
  });
}

const moduleSummaries = inventory.modules.map((module) => ({
  slug: module.slug,
  order: module.order,
  status: module.status,
  lessonCount: module.lessonOrders.length,
  questionCount: module.questionCoordinates.length,
  exerciseCount: module.exerciseCoordinates.length,
  repositoryCount: module.hasRepository ? 1 : 0,
}));
const allObjectives = [...new Set(Object.values(primaryObjectiveByModule))].sort();
const rubrics = [
  {
    rubricId: "codecamp.quiz.v1",
    objectiveIds: allObjectives,
    appliesToKinds: ["question"],
    scoringDimensions: ["conceptual accuracy", "misconception diagnosis"],
  },
  {
    rubricId: "codecamp.exercise.v1",
    objectiveIds: allObjectives,
    appliesToKinds: ["exercise"],
    scoringDimensions: ["deterministic checks", "guided implementation"],
  },
  {
    rubricId: "codecamp.pr.v1",
    objectiveIds: allObjectives,
    appliesToKinds: ["repository"],
    scoringDimensions: ["correctness", "tests", "code quality", "professional workflow"],
  },
  {
    rubricId: "codecamp.portfolio.v1",
    objectiveIds: allObjectives,
    appliesToKinds: ["portfolio"],
    scoringDimensions: ["independent transfer", "integration", "reflection"],
  },
];
const release = {
  schemaVersion: "codecamp-curriculum-bindings.v1",
  releaseId: "codecamp-curriculum-2026-07",
  graphVersion: "1.2.0",
  curriculumVersion: "19-modules.88-lessons.v1",
  provenance: {
    sourcePath: "packages/db/src/seed/codecamp-curriculum-data.ts",
    originBaseRevision,
    originBaseDigest,
    sourceDigest,
    sourceArtifact,
    sourceDirty: true,
    inventoryDigest,
    generatedAt: "2026-07-10T18:00:00.000Z",
    reviewedBy: "Codecamp curriculum owner",
  },
  inventory: inventory.totals,
  modules: moduleSummaries,
  rubrics,
  bindings,
};
const sourceProvenance = {
  schemaVersion: "codecamp-curriculum-source.v1",
  sourcePath: "packages/db/src/seed/codecamp-curriculum-data.ts",
  originBaseRevision,
  originBaseDigest,
  sourceDigest,
  sourceArtifact,
  sourceDirty: true,
  snapshotDigest: inventoryDigest,
};

writeFileSync(resolve(outputDirectory, "curriculum-source-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);
writeFileSync(resolve(outputDirectory, "curriculum-source-provenance.json"), `${JSON.stringify(sourceProvenance, null, 2)}\n`);
writeFileSync(resolve(outputDirectory, "curriculum-bindings.json"), `${JSON.stringify(release, null, 2)}\n`);
