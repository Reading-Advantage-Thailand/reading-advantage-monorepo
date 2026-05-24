import { randomUUID } from 'node:crypto';
import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { db, asc, eq, sql } from '@reading-advantage/db';
import {
  scienceStandardMastery,
  scienceStandards,
  users,
} from '@reading-advantage/db/schema';
import { clampMasteryLevel, recordStandardMastery } from './standard-mastery';

const TEST_PREFIX = 'sm-itest';

async function cleanup(): Promise<void> {
  await db.execute(
    sql`DELETE FROM science_standard_mastery WHERE student_id LIKE ${`${TEST_PREFIX}-%`}`
  );
  await db.execute(
    sql`DELETE FROM science_standards WHERE description = ${'Test standard'}`
  );
  await db.execute(
    sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`
  );
}

async function createStudent() {
  const id = `${TEST_PREFIX}-${randomUUID()}`;
  const [user] = await db
    .insert(users)
    .values({
      id,
      name: 'Test Student',
      username: id,
      displayUsername: `Student${id.slice(-6)}`,
      email: `${id}@example.com`,
      role: 'STUDENT',
    })
    .returning();
  return user;
}

async function createStandard() {
  const [standard] = await db
    .insert(scienceStandards)
    .values({
      framework: 'NGSS',
      code: `NGSS-${randomUUID().slice(0, 8)}`,
      description: 'Test standard',
      gradeLevel: 5,
    })
    .returning();
  return standard;
}

async function createDependencies() {
  const [student, standard] = await Promise.all([createStudent(), createStandard()]);
  return { student, standard };
}

async function findOneMastery(studentId: string, standardId: string) {
  const [row] = await db
    .select()
    .from(scienceStandardMastery)
    .where(
      sql`${scienceStandardMastery.studentId} = ${studentId} AND ${scienceStandardMastery.standardId} = ${standardId}`
    )
    .limit(1);
  return row;
}

describe('standardMastery persistence (integration)', () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it('creates a mastery record', async () => {
    const { student, standard } = await createDependencies();

    const record = await recordStandardMastery(db, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.75,
      evidenceDelta: 2,
      lastAssessedAt: new Date('2025-10-28T08:00:00Z'),
    });

    // Drizzle returns numeric/decimal as string per postgres-js convention.
    expect(Number(record.masteryLevel)).toBe(0.75);
    expect(record.evidenceCount).toBe(2);
  });

  it('enforces unique(studentId, standardId)', async () => {
    const { student, standard } = await createDependencies();

    await recordStandardMastery(db, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.5,
      lastAssessedAt: new Date(),
    });

    let caught: unknown;
    try {
      await db.insert(scienceStandardMastery).values({
        studentId: student.id,
        standardId: standard.id,
        masteryLevel: '0.40',
        evidenceCount: 1,
        lastAssessedAt: new Date(),
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeDefined();
    // postgres-js attaches the original PostgresError as `cause`.
    const cause = (caught as { cause?: { code?: string; constraint_name?: string } })
      .cause;
    expect(cause?.code).toBe('23505');
    expect(cause?.constraint_name).toBe(
      'science_standard_mastery_student_standard_unique'
    );
  });

  it('clamps masteryLevel to [0,1] and rounds to 2 decimals', async () => {
    const { student, standard } = await createDependencies();

    await recordStandardMastery(db, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 1.34,
      lastAssessedAt: new Date(),
    });

    let persisted = await findOneMastery(student.id, standard.id);
    expect(Number(persisted!.masteryLevel)).toBe(1);

    await recordStandardMastery(db, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: -0.2,
      lastAssessedAt: new Date(),
    });

    persisted = await findOneMastery(student.id, standard.id);
    expect(Number(persisted!.masteryLevel)).toBe(0);
  });

  it('rejects NaN mastery levels', () => {
    expect(() => clampMasteryLevel(Number.NaN)).toThrow(/masteryLevel/);
  });

  it('increments evidenceCount across upserts', async () => {
    const { student, standard } = await createDependencies();

    await recordStandardMastery(db, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.4,
      evidenceDelta: 2,
      lastAssessedAt: new Date(),
    });

    await recordStandardMastery(db, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.6,
      evidenceDelta: 3,
      lastAssessedAt: new Date(),
    });

    const persisted = await findOneMastery(student.id, standard.id);
    expect(persisted!.evidenceCount).toBe(5);
    expect(Number(persisted!.masteryLevel)).toBe(0.6);
  });

  it('cascades when student deleted', async () => {
    const { student, standard } = await createDependencies();

    await recordStandardMastery(db, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.65,
      lastAssessedAt: new Date(),
    });

    await db.delete(users).where(eq(users.id, student.id));

    const remaining = await findOneMastery(student.id, standard.id);
    expect(remaining).toBeUndefined();
  });

  it('cascades when standard deleted', async () => {
    const { student, standard } = await createDependencies();

    await recordStandardMastery(db, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.45,
      lastAssessedAt: new Date(),
    });

    await db.delete(scienceStandards).where(eq(scienceStandards.id, standard.id));

    const remaining = await findOneMastery(student.id, standard.id);
    expect(remaining).toBeUndefined();
  });

  it('queries student mastery ordered ascending', async () => {
    const { student } = await createDependencies();
    const standardA = await createStandard();
    const standardB = await createStandard();

    await recordStandardMastery(db, {
      studentId: student.id,
      standardId: standardA.id,
      masteryLevel: 0.9,
      lastAssessedAt: new Date(),
    });

    await recordStandardMastery(db, {
      studentId: student.id,
      standardId: standardB.id,
      masteryLevel: 0.3,
      lastAssessedAt: new Date(),
    });

    const rows = await db
      .select()
      .from(scienceStandardMastery)
      .where(eq(scienceStandardMastery.studentId, student.id))
      .orderBy(asc(scienceStandardMastery.masteryLevel));

    expect(rows).toHaveLength(2);
    expect(rows[0].standardId).toBe(standardB.id);
    expect(rows[1].standardId).toBe(standardA.id);
  });

  it('serializes concurrent writers via transaction (evidence accumulates)', async () => {
    const { student, standard } = await createDependencies();
    const masteryValues = [0.5, 0.55, 0.6, 0.65, 0.7];
    await Promise.all(
      masteryValues.map((value) =>
        recordStandardMastery(db, {
          studentId: student.id,
          standardId: standard.id,
          masteryLevel: value,
          lastAssessedAt: new Date('2025-10-28T08:00:00Z'),
        })
      )
    );

    const final = await findOneMastery(student.id, standard.id);
    expect(final!.evidenceCount).toBe(5);
    expect(masteryValues).toContain(Number(final!.masteryLevel));
  });
});
