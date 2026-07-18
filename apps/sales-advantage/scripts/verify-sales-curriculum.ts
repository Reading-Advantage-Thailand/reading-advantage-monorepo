import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

import { client, db, type DB } from "@reading-advantage/db/client";
import {
  salesLessons,
  salesModules,
  salesQuizQuestions,
  salesRoleplayScenarios,
  salesRubrics,
} from "@reading-advantage/db/schema";

/** Immutable reviewed production curriculum counts, independent of seed code. */
export const PINNED_SALES_CURRICULUM_COUNTS = Object.freeze({
  modules: 6,
  lessons: 26,
  rubrics: 8,
  scenarios: 8,
  quizQuestions: 13,
});

/** SHA-256 of the reviewed canonical production curriculum graph. */
export const PINNED_SALES_CURRICULUM_GRAPH_SHA256 =
  "f8b1391302650874154066d5a21189a71d3cbaf78b528f579642fc9fc696f0e7";

type SalesTransaction = Parameters<Parameters<DB["transaction"]>[0]>[0];

interface CurriculumGraph {
  modules: Array<{
    id: string;
    slug: string;
    title: string;
    description: string;
    phase: string;
    order: number;
  }>;
  lessons: Array<{
    id: string;
    moduleId: string;
    title: string;
    type: "theory" | "roleplay" | "quiz";
    content: string;
    order: number;
    reviewStatus: "draft" | "reviewed" | "approved";
  }>;
  rubrics: Array<{
    id: string;
    name: string;
    criteriaJson: unknown;
    reviewStatus: "draft" | "reviewed" | "approved";
  }>;
  scenarios: Array<{
    id: string;
    lessonId: string;
    personaName: string;
    personaRole: string;
    situation: string;
    objective: string;
    prospectContextJson: unknown;
    rubricId: string;
    order: number;
  }>;
  quizQuestions: Array<{
    id: string;
    lessonId: string;
    question: string;
    optionsJson: unknown;
    correctAnswer: string;
    explanation: string;
    order: number;
  }>;
}

/** Reads the complete production curriculum graph directly from PostgreSQL. */
async function readCurriculumGraph(
  transaction: SalesTransaction,
): Promise<CurriculumGraph> {
  const [modules, lessons, rubrics, scenarios, quizQuestions] =
    await Promise.all([
      transaction.select({
        id: salesModules.id,
        slug: salesModules.slug,
        title: salesModules.title,
        description: salesModules.description,
        phase: salesModules.phase,
        order: salesModules.order,
      }).from(salesModules),
      transaction.select({
        id: salesLessons.id,
        moduleId: salesLessons.moduleId,
        title: salesLessons.title,
        type: salesLessons.type,
        content: salesLessons.content,
        order: salesLessons.order,
        reviewStatus: salesLessons.reviewStatus,
      }).from(salesLessons),
      transaction.select({
        id: salesRubrics.id,
        name: salesRubrics.name,
        criteriaJson: salesRubrics.criteriaJson,
        reviewStatus: salesRubrics.reviewStatus,
      }).from(salesRubrics),
      transaction.select({
        id: salesRoleplayScenarios.id,
        lessonId: salesRoleplayScenarios.lessonId,
        personaName: salesRoleplayScenarios.personaName,
        personaRole: salesRoleplayScenarios.personaRole,
        situation: salesRoleplayScenarios.situation,
        objective: salesRoleplayScenarios.objective,
        prospectContextJson: salesRoleplayScenarios.prospectContextJson,
        rubricId: salesRoleplayScenarios.rubricId,
        order: salesRoleplayScenarios.order,
      }).from(salesRoleplayScenarios),
      transaction.select({
        id: salesQuizQuestions.id,
        lessonId: salesQuizQuestions.lessonId,
        question: salesQuizQuestions.question,
        optionsJson: salesQuizQuestions.optionsJson,
        correctAnswer: salesQuizQuestions.correctAnswer,
        explanation: salesQuizQuestions.explanation,
        order: salesQuizQuestions.order,
      }).from(salesQuizQuestions),
    ]);
  return { modules, lessons, rubrics, scenarios, quizQuestions };
}

/** Recursively sorts object keys while retaining reviewed array order. */
function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, stableJsonValue(child)]),
    );
  }
  return value;
}

/**
 * Computes the canonical content digest without using seed implementation data.
 * @param graph Curriculum rows read independently from PostgreSQL.
 * @returns SHA-256 digest of the canonical curriculum graph.
 */
export function curriculumGraphDigest(graph: CurriculumGraph): string {
  const sort = <T extends { id: string }>(rows: T[]): T[] =>
    [...rows].sort((left, right) => left.id.localeCompare(right.id));
  const canonical = stableJsonValue({
    modules: sort(graph.modules),
    lessons: sort(graph.lessons),
    rubrics: sort(graph.rubrics),
    scenarios: sort(graph.scenarios),
    quizQuestions: sort(graph.quizQuestions),
  });
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/** Enforces counts, review state, foreign-key ownership, and lesson-type content. */
function assertGraphInvariants(graph: CurriculumGraph): void {
  const counts = {
    modules: graph.modules.length,
    lessons: graph.lessons.length,
    rubrics: graph.rubrics.length,
    scenarios: graph.scenarios.length,
    quizQuestions: graph.quizQuestions.length,
  };
  if (JSON.stringify(counts) !== JSON.stringify(PINNED_SALES_CURRICULUM_COUNTS)) {
    throw new Error(`SALES_CURRICULUM_COUNT_MISMATCH ${JSON.stringify(counts)}`);
  }
  const moduleIds = new Set(graph.modules.map((row) => row.id));
  const lessonIds = new Set(graph.lessons.map((row) => row.id));
  const rubricIds = new Set(graph.rubrics.map((row) => row.id));
  if (graph.lessons.some((row) =>
    row.reviewStatus !== "approved" || !moduleIds.has(row.moduleId))) {
    throw new Error("SALES_CURRICULUM_LESSON_INVARIANT_FAILED");
  }
  if (graph.rubrics.some((row) =>
    row.reviewStatus !== "approved" ||
    !Array.isArray(row.criteriaJson) || row.criteriaJson.length === 0)) {
    throw new Error("SALES_CURRICULUM_RUBRIC_INVARIANT_FAILED");
  }
  if (graph.scenarios.some((row) =>
    !lessonIds.has(row.lessonId) || !rubricIds.has(row.rubricId) ||
    !row.personaName.trim() || !row.objective.trim())) {
    throw new Error("SALES_CURRICULUM_SCENARIO_INVARIANT_FAILED");
  }
  if (graph.quizQuestions.some((row) => {
    const options = Array.isArray(row.optionsJson) ? row.optionsJson : [];
    return !lessonIds.has(row.lessonId) || options.length !== 4 ||
      !options.includes(row.correctAnswer) || !row.explanation.trim();
  })) {
    throw new Error("SALES_CURRICULUM_QUIZ_INVARIANT_FAILED");
  }
  for (const lesson of graph.lessons) {
    if (lesson.type === "theory" && !lesson.content.trim()) {
      throw new Error("SALES_CURRICULUM_THEORY_CONTENT_MISSING");
    }
    if (lesson.type === "roleplay" &&
        !graph.scenarios.some((row) => row.lessonId === lesson.id)) {
      throw new Error("SALES_CURRICULUM_ROLEPLAY_SCENARIO_MISSING");
    }
    if (lesson.type === "quiz" &&
        !graph.quizQuestions.some((row) => row.lessonId === lesson.id)) {
      throw new Error("SALES_CURRICULUM_QUIZ_QUESTIONS_MISSING");
    }
  }
}

/**
 * Independently verifies the deployed curriculum against reviewed constants.
 * @param database Sales database connection to inspect.
 * @returns Hard-pinned counts and canonical graph digest.
 * @throws When counts, graph content, approval, type, or ownership differs.
 */
export async function verifyProductionSalesCurriculum(
  database: DB = db,
): Promise<{
  counts: typeof PINNED_SALES_CURRICULUM_COUNTS;
  graphSha256: string;
}> {
  return database.transaction(async (transaction) => {
    const graph = await readCurriculumGraph(transaction);
    assertGraphInvariants(graph);
    const graphSha256 = curriculumGraphDigest(graph);
    if (graphSha256 !== PINNED_SALES_CURRICULUM_GRAPH_SHA256) {
      throw new Error(
        `SALES_CURRICULUM_GRAPH_DIGEST_MISMATCH actual=${graphSha256}`,
      );
    }
    return { counts: PINNED_SALES_CURRICULUM_COUNTS, graphSha256 };
  });
}

/** Runs the standalone predeploy curriculum verifier. */
async function main(): Promise<void> {
  const result = await verifyProductionSalesCurriculum();
  process.stdout.write(`Sales curriculum verified: ${JSON.stringify(result)}\n`);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  main()
    .catch((error: unknown) => {
      process.stderr.write(
        `Sales curriculum verification failed: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      await client.end({ timeout: 5 });
    });
}
