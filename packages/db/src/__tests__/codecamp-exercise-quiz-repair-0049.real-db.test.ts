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
  "../../drizzle/0049_codecamp_exercise_quiz_repair.sql",
);

/**
 * Applies the hotfix migration through its Drizzle statement boundaries.
 * @param client Scratch PostgreSQL client.
 * @returns Completion after every migration statement executes.
 */
async function applyMigration0049(
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
  "0049 Codecamp exercise/quiz identity repair (real PostgreSQL)",
  () => {
    it("restores both activity identities in place without changing learner progress or child ownership", async () => {
      const databaseName = `codecamp_0049_${randomUUID().replaceAll("-", "")}`;
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
          ) VALUES
            (
              '50000000-0000-4000-8000-000000000001', ${quizLessonId},
              'Where should business logic live?',
              '["In the tRPC router", "In domain functions", "In the database", "In the frontend"]'::jsonb,
              'In domain functions', 'Routers are thin wrappers that delegate to domain functions.', 1
            ),
            (
              '50000000-0000-4000-8000-000000000002', ${quizLessonId},
              'What does \`assertCan()\` do and where is it called?',
              '["Checks permissions, called first in every domain function", "Validates input, called in the router"]'::jsonb,
              'Checks permissions, called first in every domain function', 'It authorizes before mutations.', 2
            ),
            (
              '50000000-0000-4000-8000-000000000003', ${quizLessonId},
              'What makes tRPC ''type-safe''?',
              '["It uses TypeScript", "The frontend automatically infers types from the router definition"]'::jsonb,
              'The frontend automatically infers types from the router definition', 'The router is the shared type source.', 3
            ),
            (
              '50000000-0000-4000-8000-000000000004', ${quizLessonId},
              'When should you use Server Actions instead of tRPC?',
              '["Always", "Simple form submissions, progressive enhancement, single-consumer mutations"]'::jsonb,
              'Simple form submissions, progressive enhancement, single-consumer mutations', 'They suit simple single-consumer mutations.', 4
            ),
            (
              '50000000-0000-4000-8000-000000000005', ${quizLessonId},
              'What is the domain function signature?',
              '["(input) => result", "({ db, user, tenant, input }) => result"]'::jsonb,
              '({ db, user, tenant, input }) => result', 'The standard context includes db, user, tenant, and input.', 5
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
        const progressBeforeRepair = await readProgress(client);

        await applyMigration0049(client);

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
        await expect(readProgress(client)).resolves.toEqual(
          progressBeforeRepair,
        );
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
            question: "Where should business logic live?",
          },
          {
            lessonId: quizLessonId,
            question: "What does `assertCan()` do and where is it called?",
          },
          {
            lessonId: quizLessonId,
            question: "What makes tRPC 'type-safe'?",
          },
          {
            lessonId: quizLessonId,
            question: "When should you use Server Actions instead of tRPC?",
          },
          {
            lessonId: quizLessonId,
            question: "What is the domain function signature?",
          },
        ]);

        await applyMigration0049(client);
        await expect(readProgress(client)).resolves.toEqual(
          progressBeforeRepair,
        );

        // Prove the statement is atomic across modules, not merely that an
        // invalid later module is left alone: reintroduce the audited tRPC
        // corruption that 0049 would repair before it encounters HTML/CSS.
        await client`
          UPDATE codecamp_lessons
          SET title = 'tRPC & Server Actions Exercise + Quiz', type = 'quiz'
          WHERE id IN (${exerciseLessonId}, ${quizLessonId})
        `;
        await client`
          INSERT INTO codecamp_exercises (
            id, lesson_id, title, instructions, "order"
          ) VALUES (
            '40000000-0000-4000-8000-000000000003', ${quizLessonId},
            'Reintroduced redundant quiz exercise', 'Must roll back.', 1
          )
        `;

        const malformedModuleId = "10000000-0000-4000-8000-000000000002";
        const malformedExerciseLessonId =
          "20000000-0000-4000-8000-000000000004";
        const malformedQuizLessonId = "20000000-0000-4000-8000-000000000005";
        await client`
          INSERT INTO codecamp_modules (
            id, slug, title, description, "order", phase, status
          ) VALUES (
            ${malformedModuleId}, 'html-css', 'HTML & CSS',
            'Malformed repair candidate fixture.', 3, 'A', 'published'
          )
        `;
        await client`
          INSERT INTO codecamp_lessons (
            id, module_id, title, description, "order", type, content_json
          ) VALUES
            (
              ${malformedExerciseLessonId}, ${malformedModuleId},
              'HTML & CSS Exercise + Quiz', 'Malformed exercise candidate.',
              6, 'quiz', '{}'::jsonb
            ),
            (
              ${malformedQuizLessonId}, ${malformedModuleId},
              'HTML & CSS Exercise + Quiz', 'Malformed quiz candidate.',
              7, 'quiz', '{}'::jsonb
            )
        `;
        await client`
          INSERT INTO codecamp_exercises (
            id, lesson_id, title, instructions, "order"
          ) VALUES
            (
              '40000000-0000-4000-8000-000000000004',
              ${malformedExerciseLessonId}, 'First retained exercise', 'Malformed.', 1
            ),
            (
              '40000000-0000-4000-8000-000000000005',
              ${malformedExerciseLessonId}, 'Second retained exercise', 'Malformed.', 2
            ),
            (
              '40000000-0000-4000-8000-000000000006',
              ${malformedQuizLessonId}, 'Copied quiz exercise', 'Malformed.', 1
            )
        `;
        await client`
          INSERT INTO codecamp_quiz_questions (
            id, lesson_id, question, options_json, correct_answer, explanation, "order"
          ) VALUES
            ('50000000-0000-4000-8000-000000000006', ${malformedQuizLessonId}, 'Malformed question 1', '["a"]'::jsonb, 'a', 'Malformed.', 1),
            ('50000000-0000-4000-8000-000000000007', ${malformedQuizLessonId}, 'Malformed question 2', '["a"]'::jsonb, 'a', 'Malformed.', 2),
            ('50000000-0000-4000-8000-000000000008', ${malformedQuizLessonId}, 'Malformed question 3', '["a"]'::jsonb, 'a', 'Malformed.', 3),
            ('50000000-0000-4000-8000-000000000009', ${malformedQuizLessonId}, 'Malformed question 4', '["a"]'::jsonb, 'a', 'Malformed.', 4)
        `;
        await client`
          INSERT INTO codecamp_user_progress (
            id, user_id, module_id, lesson_id, status, score,
            completed_at, created_at, updated_at
          ) VALUES (
            '30000000-0000-4000-8000-000000000004', 'intern-two',
            ${malformedModuleId}, ${malformedQuizLessonId}, 'completed', 100,
            '2026-08-06T08:00:00.000000', '2026-08-05T08:00:00.000000',
            '2026-08-06T08:00:00.000000'
          )
        `;
        const malformedBefore = await Promise.all([
          client`
            SELECT id, module_id AS "moduleId", "order", type::text AS type, title
            FROM codecamp_lessons
            ORDER BY id
          `,
          readProgress(client),
          client`
            SELECT id, lesson_id AS "lessonId", title, "order"
            FROM codecamp_exercises
            ORDER BY id
          `,
          client`
            SELECT id, lesson_id AS "lessonId", question, "order"
            FROM codecamp_quiz_questions
            ORDER BY id
          `,
        ]);
        expect(malformedBefore[0]).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: exerciseLessonId,
              order: 5,
              type: "quiz",
              title: "tRPC & Server Actions Exercise + Quiz",
            }),
            expect.objectContaining({
              id: quizLessonId,
              order: 6,
              type: "quiz",
              title: "tRPC & Server Actions Exercise + Quiz",
            }),
          ]),
        );

        await expect(applyMigration0049(client)).rejects.toThrow();
        await expect(
          Promise.all([
            client`
              SELECT id, module_id AS "moduleId", "order", type::text AS type, title
              FROM codecamp_lessons
              ORDER BY id
            `,
            readProgress(client),
            client`
              SELECT id, lesson_id AS "lessonId", title, "order"
              FROM codecamp_exercises
              ORDER BY id
            `,
            client`
              SELECT id, lesson_id AS "lessonId", question, "order"
              FROM codecamp_quiz_questions
              ORDER BY id
            `,
          ]),
        ).resolves.toEqual(malformedBefore);

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
