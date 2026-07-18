// @vitest-environment node
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { count, eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
  db,
  salesLessons,
  salesModules,
  salesQuizQuestions,
  salesRoleplayScenarios,
  salesRubrics,
} from "@reading-advantage/db";

import { seedStaticSalesCurriculum } from "./static-seed";
import {
  PINNED_SALES_CURRICULUM_COUNTS,
  PINNED_SALES_CURRICULUM_GRAPH_SHA256,
  verifyProductionSalesCurriculum,
} from "./verify-sales-curriculum";

const describeRealDatabase =
  process.env.RUN_SALES_CURRICULUM_REAL_DB_TESTS === "true"
    ? describe
    : describe.skip;
const execFileAsync = promisify(execFile);

/** Returns exact curriculum table counts from the disposable database. */
async function curriculumCounts(): Promise<Record<string, number>> {
  const tables = [
    salesModules,
    salesLessons,
    salesRubrics,
    salesRoleplayScenarios,
    salesQuizQuestions,
  ] as const;
  const values: number[] = [];
  for (const table of tables) {
    const [row] = await db.select({ value: count() }).from(table);
    values.push(row?.value ?? 0);
  }
  return {
    modules: values[0]!,
    lessons: values[1]!,
    rubrics: values[2]!,
    scenarios: values[3]!,
    quizQuestions: values[4]!,
  };
}

describeRealDatabase("Sales production curriculum (real PostgreSQL)", () => {
  it("rolls back atomically, rejects partial state, and verifies idempotent complete data", async () => {
    await db.execute(sql.raw(`
      create function sales_curriculum_test_reject_quiz() returns trigger
      language plpgsql as $$ begin raise exception 'quiz insert rejected'; end $$;
      create trigger sales_curriculum_test_reject_quiz
      before insert on sales_quiz_questions
      for each statement execute function sales_curriculum_test_reject_quiz();
    `));
    await expect(seedStaticSalesCurriculum()).rejects.toThrow(
      "sales_quiz_questions",
    );
    expect(await curriculumCounts()).toEqual({
      modules: 0,
      lessons: 0,
      rubrics: 0,
      scenarios: 0,
      quizQuestions: 0,
    });
    await db.execute(sql.raw(`
      drop trigger sales_curriculum_test_reject_quiz on sales_quiz_questions;
      drop function sales_curriculum_test_reject_quiz();
    `));

    await db.insert(salesModules).values({
      slug: "incomplete-production-data",
      title: "Incomplete",
      description: "Fail-closed probe",
      phase: "Foundations",
      order: 999,
    });
    await expect(seedStaticSalesCurriculum()).rejects.toThrow(
      "SALES_CURRICULUM_INCOMPLETE_OR_INCONSISTENT",
    );
    expect((await curriculumCounts()).modules).toBe(1);
    await db.delete(salesModules).where(
      eq(salesModules.slug, "incomplete-production-data"),
    );

    await expect(seedStaticSalesCurriculum()).resolves.toBe("inserted");
    await expect(verifyProductionSalesCurriculum()).resolves.toMatchObject({
      counts: PINNED_SALES_CURRICULUM_COUNTS,
    });
    await expect(seedStaticSalesCurriculum()).resolves.toBe("already-complete");
    expect(await curriculumCounts()).toEqual(PINNED_SALES_CURRICULUM_COUNTS);

    const [lesson] = await db.select({
      id: salesLessons.id,
      title: salesLessons.title,
    })
      .from(salesLessons).limit(1);
    await db.update(salesLessons).set({ title: `${lesson!.title} tampered` })
      .where(eq(salesLessons.id, lesson!.id));
    await expect(verifyProductionSalesCurriculum()).rejects.toThrow(
      "SALES_CURRICULUM_GRAPH_DIGEST_MISMATCH",
    );
    await db.update(salesLessons).set({ title: lesson!.title })
      .where(eq(salesLessons.id, lesson!.id));
    await db.update(salesLessons).set({ reviewStatus: "draft" })
      .where(eq(salesLessons.id, lesson!.id));
    await expect(seedStaticSalesCurriculum()).rejects.toThrow(
      "SALES_CURRICULUM_INCOMPLETE_OR_INCONSISTENT",
    );
    await expect(verifyProductionSalesCurriculum()).rejects.toThrow(
      "SALES_CURRICULUM_LESSON_INVARIANT_FAILED",
    );
    expect(await curriculumCounts()).toEqual(PINNED_SALES_CURRICULUM_COUNTS);
    await db.update(salesLessons).set({ reviewStatus: "approved" })
      .where(eq(salesLessons.id, lesson!.id));
    await expect(verifyProductionSalesCurriculum()).resolves.toMatchObject({
      counts: PINNED_SALES_CURRICULUM_COUNTS,
    });

    const repositoryRoot = resolve(import.meta.dirname, "../../..");
    const pnpm = process.env.PNPM_BIN ?? "pnpm";
    await execFileAsync(pnpm, ["--filter", "@reading-advantage/db", "build"], {
      cwd: repositoryRoot,
      env: process.env,
      timeout: 60_000,
    });
    const seedCli = await execFileAsync(
      pnpm,
      ["--filter", "sales-advantage", "seed:production-curriculum"],
      { cwd: repositoryRoot, env: process.env, timeout: 30_000 },
    );
    expect(seedCli.stdout).toContain("already-complete");
    const verifyCli = await execFileAsync(
      pnpm,
      ["--filter", "sales-advantage", "verify:production-curriculum"],
      { cwd: repositoryRoot, env: process.env, timeout: 30_000 },
    );
    expect(verifyCli.stdout).toContain(PINNED_SALES_CURRICULUM_GRAPH_SHA256);
  }, 120_000);
});
