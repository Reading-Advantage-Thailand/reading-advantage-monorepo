import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { getAIClient } from "@reading-advantage/ai";
import { z } from "zod";

import { CURRICULUM_SOURCE_PATHS } from "./curriculum-release";

const execFileAsync = promisify(execFile);

const criterionSchema = z.object({
  criterion: z.string().min(1),
  weight: z.number().positive(),
  passingScore: z.number().min(0).max(100),
  sourceRef: z.string().min(1),
});

const curriculumSchema = z.object({
  modules: z.array(z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    phase: z.string().min(1),
    order: z.number().int().positive(),
    lessons: z.array(z.object({
      title: z.string().min(1),
      type: z.enum(["theory", "roleplay", "quiz"]),
      content: z.string().min(1),
      order: z.number().int().positive(),
      scenarios: z.array(z.object({
        personaName: z.string().min(1),
        personaRole: z.string().min(1),
        situation: z.string().min(1),
        objective: z.string().min(1),
        prospectContext: z.string().min(1),
        rubric: z.object({
          name: z.string().min(1),
          criteria: z.array(criterionSchema).min(1),
        }),
      })).optional(),
      quizQuestions: z.array(z.object({
        question: z.string().min(1),
        options: z.array(z.string().min(1)).length(4),
        correctAnswer: z.string().min(1),
        explanation: z.string().min(1),
      })).optional(),
    })).min(1),
  })).length(6),
});

/**
 * Requires an explicit, provider-specific approval before source text is shared.
 * @param environment Process environment carrying the recorded approval value.
 * @throws When OpenRouter sharing has not been explicitly approved.
 */
export function assertOpenRouterCurriculumSharingApproved(
  environment: Readonly<Record<string, string | undefined>>,
): void {
  if (
    environment.SALES_CURRICULUM_EXTERNAL_SHARING_APPROVED !==
      "advantage-pr-to-openrouter"
  ) {
    throw new Error("SALES_CURRICULUM_OPENROUTER_SHARING_APPROVAL_REQUIRED");
  }
}

const prompt = `Create a six-module Sales Advantage curriculum using the attached canonical sources.

Follow the Codecamp pedagogy: learn a concept, practice it in a realistic task, evaluate against a source-grounded rubric, then reflect or check understanding before progression. Modules must progress from discovery and listening, to value framing, objection handling, Reading Advantage product application, demos, then negotiation and closing.

Every roleplay lesson must include non-empty teaching content before its scenario so the evaluator receives canonical excerpts. Every roleplay must include at least one scenario and a weighted rubric whose sourceRef names the supplied source document or a named general-sales source. Every quiz answer must be one of its four options.

The outcome-claims policy is binding. Teach approved Aka (2019) phrasing and explicitly reject unsourced percentages, guarantees, market-leadership language, and improvised claims. Produce draft content only; a human reviewer decides release approval.`;

/** Generates one non-secret OpenRouter draft artifact for human curriculum review. */
async function main(): Promise<void> {
  assertOpenRouterCurriculumSharingApproved(process.env);
  const argument = (name: string): string | undefined => {
    const prefix = `--${name}=`;
    return process.argv.find((value) => value.startsWith(prefix))?.slice(
      prefix.length,
    );
  };
  const sourceRoot = resolve(
    argument("source-root") ?? join(homedir(), "Desktop", "advantage-pr"),
  );
  const output = resolve(
    argument("output") ??
      "measure/tracks/sales_advantage_golive_20260701/openrouter-curriculum-draft.json",
  );
  const model = process.env.SALES_CURRICULUM_MODEL ??
    "google/gemini-2.5-flash-lite";
  const sources = await Promise.all(CURRICULUM_SOURCE_PATHS.map(async (path) => {
    const content = await readFile(join(sourceRoot, path), "utf8");
    return {
      path,
      sha256: createHash("sha256").update(content).digest("hex"),
      content,
    };
  }));
  const { stdout: sourceCommit } = await execFileAsync(
    "git",
    ["-C", sourceRoot, "rev-parse", "HEAD"],
  );
  const sourceText = sources
    .map((source) => `[${source.path}]\n${source.content.slice(0, 6000)}`)
    .join("\n\n---\n\n");
  const result = await getAIClient().generateObjectWithProvenance({
    schema: curriculumSchema,
    model,
    prompt: `${prompt}\n\nCANONICAL SOURCES\n${sourceText}`,
    temperature: 0.3,
    maxTokens: 16_384,
  });
  for (const module of result.object.modules) {
    for (const lesson of module.lessons) {
      if (lesson.type === "roleplay" && !lesson.scenarios?.length) {
        throw new Error(`ROLEPLAY_SCENARIO_MISSING: ${lesson.title}`);
      }
      if (lesson.type === "quiz") {
        for (const question of lesson.quizQuestions ?? []) {
          if (!question.options.includes(question.correctAnswer)) {
            throw new Error(`QUIZ_ANSWER_INVALID: ${lesson.title}`);
          }
        }
      }
    }
  }
  const artifact = {
    schemaVersion: 1,
    status: "awaiting_human_review",
    generatedAt: new Date().toISOString(),
    promptVersion: "sales-curriculum-v2",
    source: {
      repository: "advantage-pr",
      commit: sourceCommit.trim(),
      documents: sources.map(({ path, sha256 }) => ({ path, sha256 })),
    },
    generation: {
      provider: "openrouter",
      requestedModel: model,
      provenance: result.provenance,
    },
    curriculum: result.object,
  };
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(`OpenRouter curriculum draft written: ${output}\n`);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `OpenRouter curriculum generation failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
