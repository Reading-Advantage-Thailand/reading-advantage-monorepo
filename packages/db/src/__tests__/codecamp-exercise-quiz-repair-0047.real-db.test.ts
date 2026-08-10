// @vitest-environment node
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import postgres from "postgres";
import { describe, expect, it } from "vitest";

const pgTestUrl = process.env.PG_TEST_URL;
const describeRealPostgres = pgTestUrl ? describe : describe.skip;
const migrationPath = resolve(
  import.meta.dirname,
  "../../drizzle/0047_codecamp_exercise_quiz_repair.sql",
);

/**
 * Applies the hotfix migration through its Drizzle statement boundaries.
 * @param client Scratch PostgreSQL client.
 * @returns Completion after every migration statement executes.
 */
async function applyMigration0047(
  client: ReturnType<typeof postgres>,
): Promise<void> {
  const source = readFileSync(migrationPath, "utf8");
  for (const statement of source.split("--> statement-breakpoint")) {
    if (statement.trim()) await client.unsafe(statement);
  }
}

interface PersistedProgress {
  readonly id: string;
  readonly userId: string;
  readonly moduleId: string;
  readonly lessonId: string;
  readonly status: string;
  readonly score: number;
  readonly completedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/**
 * Reads progress in an exact, timezone-independent format for preservation assertions.
 * @param client Scratch PostgreSQL client.
 * @returns Every persisted progress row ordered by primary key.
 */
async function readProgress(
  client: ReturnType<typeof postgres>,
): Promise<PersistedProgress[]> {
  return client<PersistedProgress[]>`
    SELECT
      id,
      user_id AS "userId",
      module_id AS "moduleId",
      lesson_id AS "lessonId",
      status::text AS status,
      score,
      to_char(completed_at, 'YYYY-MM-DD"T"HH24:MI:SS.US') AS "completedAt",
      to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.US') AS "createdAt",
      to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.US') AS "updatedAt"
    FROM codecamp_user_progress
    ORDER BY id
  `;
}

describeRealPostgres(
  "0047 Codecamp exercise/quiz identity repair (real PostgreSQL)",
  () => {
    it("restores both activity identities in place without changing learner progress or child ownership", async () => {
      const databaseName = `codecamp_0047_${randomUUID().replaceAll("-", "")}`;
      const admin = postgres(pgTestUrl!, { max: 1 });
      const scratchUrl = new URL(pgTestUrl!);
      scratchUrl.pathname = `/${databaseName}`;
      await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
      const client = postgres(scratchUrl.toString(), { max: 1 });

      const moduleId = "10000000-0000-4000-8000-000000000001";
      const exerciseLessonId = "20000000-0000-4000-8000-000000000001";
      const quizLessonId = "20000000-0000-4000-8000-000000000002";
      const originalProgress: PersistedProgress[] = [
        {
          id: "30000000-0000-4000-8000-000000000001",
          userId: "intern-one",
          moduleId,
          lessonId: exerciseLessonId,
          status: "not_started",
          score: 0,
          completedAt: null,
          createdAt: "2026-08-01T09:00:00.000000",
          updatedAt: "2026-08-02T10:00:00.000000",
        },
        {
          id: "30000000-0000-4000-8000-000000000002",
          userId: "intern-one",
          moduleId,
          lessonId: quizLessonId,
          status: "completed",
          score: 100,
          completedAt: "2026-08-03T11:00:00.000000",
          createdAt: "2026-08-02T08:00:00.000000",
          updatedAt: "2026-08-03T11:00:00.000000",
        },
        {
          id: "30000000-0000-4000-8000-000000000003",
          userId: "intern-two",
          moduleId,
          lessonId: exerciseLessonId,
          status: "in_progress",
          score: 40,
          completedAt: null,
          createdAt: "2026-08-04T09:00:00.000000",
          updatedAt: "2026-08-05T12:00:00.000000",
        },
      ];

      try {
        await client.unsafe(`
          CREATE TYPE codecamp_lesson_type AS ENUM ('theory', 'exercise', 'quiz');
          CREATE TYPE codecamp_progress_status AS ENUM ('not_started', 'in_progress', 'completed');
          CREATE TABLE users (id text PRIMARY KEY);
          CREATE TABLE codecamp_modules (
            id uuid PRIMARY KEY,
            slug text NOT NULL UNIQUE,
            title text NOT NULL,
            description text NOT NULL,
            "order" integer NOT NULL,
            phase text NOT NULL DEFAULT 'C',
            status text NOT NULL DEFAULT 'published',
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
          );
          CREATE TABLE codecamp_lessons (
            id uuid PRIMARY KEY,
            module_id uuid NOT NULL REFERENCES codecamp_modules(id) ON DELETE CASCADE,
            title text NOT NULL,
            description text NOT NULL,
            "order" integer NOT NULL,
            type codecamp_lesson_type NOT NULL,
            content_json jsonb NOT NULL,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
          );
          CREATE TABLE codecamp_exercises (
            id uuid PRIMARY KEY,
            lesson_id uuid NOT NULL REFERENCES codecamp_lessons(id) ON DELETE CASCADE,
            title text NOT NULL,
            instructions text NOT NULL,
            starter_code text,
            expected_output text,
            hints_json jsonb NOT NULL DEFAULT '[]'::jsonb,
            "order" integer NOT NULL,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
          );
          CREATE TABLE codecamp_quiz_questions (
            id uuid PRIMARY KEY,
            lesson_id uuid NOT NULL REFERENCES codecamp_lessons(id) ON DELETE CASCADE,
            question text NOT NULL,
            options_json jsonb NOT NULL,
            correct_answer text NOT NULL,
            explanation text NOT NULL,
            "order" integer NOT NULL,
            created_at timestamp NOT NULL DEFAULT now(),
            updated_at timestamp NOT NULL DEFAULT now()
          );
          CREATE TABLE codecamp_user_progress (
            id uuid PRIMARY KEY,
            user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            module_id uuid NOT NULL REFERENCES codecamp_modules(id) ON DELETE CASCADE,
            lesson_id uuid NOT NULL REFERENCES codecamp_lessons(id) ON DELETE CASCADE,
            status codecamp_progress_status NOT NULL,
            score integer NOT NULL,
            completed_at timestamp,
            created_at timestamp NOT NULL,
            updated_at timestamp NOT NULL,
            CONSTRAINT codecamp_user_progress_user_lesson_unique
              UNIQUE (user_id, lesson_id)
          );
        `);

        await client`
          INSERT INTO users (id) VALUES ('intern-one'), ('intern-two')
        `;
        await client`
          INSERT INTO codecamp_modules (
            id, slug, title, description, "order", phase, status
          ) VALUES (
            ${moduleId}, 'trpc-server-actions', 'tRPC & Server Actions',
            'Build type-safe APIs.', 12, 'C', 'published'
          )
        `;

        // The exercise was backfilled first and then incorrectly rewritten as
        // the combined quiz. The original quiz identity still exists at order 6.
        await client`
          INSERT INTO codecamp_lessons (
            id, module_id, title, description, "order", type, content_json
          ) VALUES
            (
              ${exerciseLessonId}, ${moduleId},
              'tRPC & Server Actions Exercise + Quiz',
              'Build a Blog API with tRPC and test your API knowledge.',
              5, 'quiz', '{"instructions":"exercise projection"}'::jsonb
            ),
            (
              ${quizLessonId}, ${moduleId},
              'tRPC & Server Actions Exercise + Quiz',
              'Build a Blog API with tRPC and test your API knowledge.',
              6, 'quiz', '{"instructions":"quiz projection"}'::jsonb
            )
        `;
        await client`
          INSERT INTO codecamp_exercises (
            id, lesson_id, title, instructions, "order"
          ) VALUES
            (
              '40000000-0000-4000-8000-000000000001',
              ${exerciseLessonId}, 'Build a Blog API with tRPC',
              'Build the exercise.', 1
            ),
            (
              '40000000-0000-4000-8000-000000000002',
              ${quizLessonId}, 'Copied exercise that must not remain on quiz',
              'This copied child is corruption.', 1
            )
        `;
        await client`
          INSERT INTO codecamp_quiz_questions (
            id, lesson_id, question, options_json, correct_answer, explanation, "order"
          ) VALUES (
            '50000000-0000-4000-8000-000000000001',
            ${quizLessonId}, 'Which layer validates transport input?',
            '["router", "database"]'::jsonb, 'router', 'The router validates input.', 1
          )
        `;
        for (const progress of originalProgress) {
          await client`
            INSERT INTO codecamp_user_progress (
              id, user_id, module_id, lesson_id, status, score,
              completed_at, created_at, updated_at
            ) VALUES (
              ${progress.id}, ${progress.userId}, ${progress.moduleId},
              ${progress.lessonId}, ${progress.status}, ${progress.score},
              ${progress.completedAt}, ${progress.createdAt}, ${progress.updatedAt}
            )
          `;
        }

        await applyMigration0047(client);

        await expect(client<
          {
            id: string;
            order: number;
            type: string;
            title: string;
          }[]
        >`
          SELECT id, "order", type::text AS type, title
          FROM codecamp_lessons
          WHERE module_id = ${moduleId}
          ORDER BY "order"
        `).resolves.toEqual([
          {
            id: exerciseLessonId,
            order: 5,
            type: "exercise",
            title: "tRPC & Server Actions Exercise",
          },
          {
            id: quizLessonId,
            order: 6,
            type: "quiz",
            title: "tRPC & Server Actions Quiz",
          },
        ]);
        await expect(readProgress(client)).resolves.toEqual(originalProgress);
        await expect(client<
          {
            lessonId: string;
            title: string;
          }[]
        >`
          SELECT lesson_id AS "lessonId", title
          FROM codecamp_exercises
          ORDER BY lesson_id, "order"
        `).resolves.toEqual([
          {
            lessonId: exerciseLessonId,
            title: "Build a Blog API with tRPC",
          },
        ]);
        await expect(client<
          {
            lessonId: string;
            question: string;
          }[]
        >`
          SELECT lesson_id AS "lessonId", question
          FROM codecamp_quiz_questions
          ORDER BY lesson_id, "order"
        `).resolves.toEqual([
          {
            lessonId: quizLessonId,
            question: "Which layer validates transport input?",
          },
        ]);

        await applyMigration0047(client);
        await expect(readProgress(client)).resolves.toEqual(originalProgress);
        await expect(client`
          INSERT INTO codecamp_lessons (
            id, module_id, title, description, "order", type, content_json
          ) VALUES (
            '20000000-0000-4000-8000-000000000003', ${moduleId},
            'Duplicate position', 'Must be rejected.', 5, 'exercise', '{}'::jsonb
          )
        `).rejects.toMatchObject({ code: "23505" });
      } finally {
        await client.end({ timeout: 5 });
        await admin.unsafe(
          `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`,
        );
        await admin.end({ timeout: 5 });
      }
    }, 60_000);
  },
);
