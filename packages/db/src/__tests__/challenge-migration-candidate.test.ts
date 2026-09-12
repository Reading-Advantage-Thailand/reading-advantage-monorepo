import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const migrationRoot = resolve(process.cwd(), "drizzle");
const candidatePath = process.env.CHALLENGE_MIGRATION_SQL
  ?? resolve(migrationRoot, "0059_game_challenges.sql");
const snapshotPath = process.env.CHALLENGE_MIGRATION_SNAPSHOT
  ?? resolve(migrationRoot, "meta/0059_snapshot.json");

describe("0059 challenge migration candidate", () => {
  let client: PGlite;

  beforeAll(async () => {
    client = new PGlite();
    await client.exec(`
      CREATE TABLE schools (id uuid PRIMARY KEY);
      CREATE TABLE users (
        id text PRIMARY KEY,
        school_id uuid REFERENCES schools(id),
        CONSTRAINT users_school_id_id_unique UNIQUE (school_id, id)
      );
      CREATE TABLE classrooms (
        id uuid PRIMARY KEY,
        school_id uuid REFERENCES schools(id)
      );
      CREATE TABLE game_completions (
        id uuid PRIMARY KEY,
        school_id uuid NOT NULL REFERENCES schools(id),
        user_id text NOT NULL REFERENCES users(id),
        CONSTRAINT game_completions_school_user_id_unique UNIQUE (school_id, user_id, id)
      );
    `);
    await client.exec(await readFile(candidatePath, "utf8"));
  }, 30_000);

  afterAll(async () => client?.close());

  it("enforces challenge contribution ownership and uniqueness", async () => {
    await client.exec(`
      INSERT INTO schools (id) VALUES
        ('11111111-1111-4111-8111-111111111111'),
        ('22222222-2222-4222-8222-222222222222');
      INSERT INTO users (id, school_id) VALUES
        ('teacher-a', '11111111-1111-4111-8111-111111111111'),
        ('student-a', '11111111-1111-4111-8111-111111111111'),
        ('student-a2', '11111111-1111-4111-8111-111111111111'),
        ('student-b', '22222222-2222-4222-8222-222222222222');
      INSERT INTO classrooms (id, school_id) VALUES
        ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111');
      INSERT INTO game_challenge_definitions (
        id, school_id, class_id, created_by_user_id, title, game_id, game_version,
        content_mode, content_locale, content_json, seed, difficulty, modality_json,
        starts_at, expires_at, target, teacher_participation_enabled
      ) VALUES (
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '11111111-1111-4111-8111-111111111111',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'teacher-a', 'Class goal', 'wizard-vs-zombie', '1',
        'vocabulary', 'th', '{}', 7, 'easy', '{}', now(), now() + interval '1 day', 10, false
      );
      INSERT INTO game_challenge_runs (id, school_id, challenge_id, user_id, expires_at) VALUES (
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc', '11111111-1111-4111-8111-111111111111',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'student-a', now() + interval '1 hour'
      ), (
        '15151515-1515-4151-8151-151515151515', '11111111-1111-4111-8111-111111111111',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'student-a', now() + interval '1 hour'
      );
      INSERT INTO game_completions (id, school_id, user_id) VALUES (
        'dddddddd-dddd-4ddd-8ddd-dddddddddddd', '11111111-1111-4111-8111-111111111111', 'student-a'
      ), (
        '14141414-1414-4141-8141-141414141414', '11111111-1111-4111-8111-111111111111', 'student-a2'
      ), (
        '16161616-1616-4161-8161-161616161616', '11111111-1111-4111-8111-111111111111', 'student-a'
      );
      INSERT INTO game_challenge_contributions (
        id, school_id, challenge_id, run_id, user_id, completion_id
      ) VALUES (
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '11111111-1111-4111-8111-111111111111',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'student-a', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      );
    `);

    await expect(client.exec(`
      INSERT INTO game_challenge_contributions (
        id, school_id, challenge_id, run_id, user_id, completion_id
      ) VALUES (
        'ffffffff-ffff-4fff-8fff-ffffffffffff', '11111111-1111-4111-8111-111111111111',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'student-a', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      );
    `)).rejects.toThrow(/game_challenge_contributions_school_completion_unique/);

    await expect(client.exec(`
      INSERT INTO game_challenge_contributions (
        id, school_id, challenge_id, run_id, user_id, completion_id
      ) VALUES (
        '17171717-1717-4171-8171-171717171717', '11111111-1111-4111-8111-111111111111',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '15151515-1515-4151-8151-151515151515',
        'student-a', '16161616-1616-4161-8161-161616161616'
      );
    `)).rejects.toThrow(/game_challenge_contributions_school_challenge_user_unique/);

    await expect(client.exec(`
      INSERT INTO game_challenge_contributions (
        id, school_id, challenge_id, run_id, user_id, completion_id
      ) VALUES (
        '12121212-1212-4121-8121-121212121212', '11111111-1111-4111-8111-111111111111',
        'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'student-a2', '14141414-1414-4141-8141-141414141414'
      );
    `)).rejects.toThrow(/game_challenge_contributions_run_fk/);

    await expect(client.exec(`
      INSERT INTO game_challenge_definitions (
        id, school_id, class_id, created_by_user_id, title, game_id, game_version,
        content_mode, content_locale, content_json, seed, difficulty, modality_json,
        starts_at, expires_at, target, teacher_participation_enabled
      ) VALUES (
        '13131313-1313-4131-8131-131313131313', '22222222-2222-4222-8222-222222222222',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'teacher-a', 'Invalid', 'wizard-vs-zombie', '1',
        'vocabulary', 'th', '{}', 8, 'easy', '{}', now(), now() + interval '1 day', 10, false
      );
    `)).rejects.toThrow(/game_challenge_definitions_creator_fk/);
  }, 30_000);

  it("links the final migration journal and preserves the prior snapshot", async () => {
    const previous = JSON.parse(await readFile(resolve(migrationRoot, "meta/0058_snapshot.json"), "utf8"));
    const current = JSON.parse(await readFile(snapshotPath, "utf8"));
    const journal = JSON.parse(await readFile(resolve(migrationRoot, "meta/_journal.json"), "utf8"));
    const lastEntry = journal.entries.at(-1);
    const priorEntry = journal.entries.at(-2);

    expect(lastEntry).toMatchObject({ idx: 59, tag: "0059_game_challenges" });
    expect(lastEntry.when).toBeGreaterThan(priorEntry.when);
    expect(current.id).not.toBe(previous.id);
    expect(current.prevId).toBe(previous.id);
    expect(Object.keys(current.tables).sort()).toEqual([
      ...Object.keys(previous.tables),
      "public.game_challenge_contributions",
      "public.game_challenge_definitions",
      "public.game_challenge_runs",
    ].sort());
    for (const [name, table] of Object.entries(previous.tables)) {
      expect(current.tables[name]).toEqual(table);
    }
    for (const key of Object.keys(previous)) {
      if (key === "id" || key === "prevId" || key === "tables") continue;
      expect(current[key]).toEqual(previous[key]);
    }
  });

  it("scopes creation keys while allowing nullable legacy keys", async () => {
    await client.exec(`
      INSERT INTO schools (id) VALUES
        ('33333333-3333-4333-8333-333333333333'),
        ('44444444-4444-4444-8444-444444444444');
      INSERT INTO users (id, school_id) VALUES
        ('creator-c1', '33333333-3333-4333-8333-333333333333'),
        ('creator-c2', '33333333-3333-4333-8333-333333333333'),
        ('creator-d1', '44444444-4444-4444-8444-444444444444');
      INSERT INTO classrooms (id, school_id) VALUES
        ('55555555-5555-4555-8555-555555555551', '33333333-3333-4333-8333-333333333333'),
        ('55555555-5555-4555-8555-555555555552', '44444444-4444-4444-8444-444444444444');
      INSERT INTO game_challenge_definitions (
        id, school_id, class_id, created_by_user_id, creation_key, title, game_id, game_version,
        content_mode, content_locale, content_json, seed, difficulty, modality_json,
        starts_at, expires_at, target, teacher_participation_enabled
      ) VALUES
        (
          '66666666-6666-4666-8666-666666666661', '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555551', 'creator-c1', NULL, 'Legacy one', 'dragon-flight', '1',
          'vocabulary', 'th', '{}', 1, 'easy', '{}', now(), now() + interval '1 day', 1, false
        ),
        (
          '66666666-6666-4666-8666-666666666662', '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555551', 'creator-c1', NULL, 'Legacy two', 'dragon-flight', '1',
          'vocabulary', 'th', '{}', 2, 'easy', '{}', now(), now() + interval '1 day', 1, false
        ),
        (
          '66666666-6666-4666-8666-666666666663', '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555551', 'creator-c1', '77777777-7777-4777-8777-777777777777', 'Keyed one', 'dragon-flight', '1',
          'vocabulary', 'th', '{}', 3, 'easy', '{}', now(), now() + interval '1 day', 1, false
        ),
        (
          '66666666-6666-4666-8666-666666666664', '33333333-3333-4333-8333-333333333333',
          '55555555-5555-4555-8555-555555555551', 'creator-c2', '77777777-7777-4777-8777-777777777777', 'Other creator', 'dragon-flight', '1',
          'vocabulary', 'th', '{}', 4, 'easy', '{}', now(), now() + interval '1 day', 1, false
        ),
        (
          '66666666-6666-4666-8666-666666666665', '44444444-4444-4444-8444-444444444444',
          '55555555-5555-4555-8555-555555555552', 'creator-d1', '77777777-7777-4777-8777-777777777777', 'Other school', 'dragon-flight', '1',
          'vocabulary', 'th', '{}', 5, 'easy', '{}', now(), now() + interval '1 day', 1, false
        );
    `);

    const legacy = await client.query<{ count: number }>(`
      SELECT count(*)::int AS count
      FROM game_challenge_definitions
      WHERE school_id = '33333333-3333-4333-8333-333333333333'
        AND created_by_user_id = 'creator-c1'
        AND creation_key IS NULL
    `);
    expect(legacy.rows).toEqual([{ count: 2 }]);

    await expect(client.exec(`
      INSERT INTO game_challenge_definitions (
        id, school_id, class_id, created_by_user_id, creation_key, title, game_id, game_version,
        content_mode, content_locale, content_json, seed, difficulty, modality_json,
        starts_at, expires_at, target, teacher_participation_enabled
      ) VALUES (
        '66666666-6666-4666-8666-666666666666', '33333333-3333-4333-8333-333333333333',
        '55555555-5555-4555-8555-555555555551', 'creator-c1', '77777777-7777-4777-8777-777777777777', 'Duplicate key', 'dragon-flight', '1',
        'vocabulary', 'th', '{}', 6, 'easy', '{}', now(), now() + interval '1 day', 1, false
      );
    `)).rejects.toThrow(/game_challenge_definitions_creator_creation_key_unique/);
  }, 30_000);
});
