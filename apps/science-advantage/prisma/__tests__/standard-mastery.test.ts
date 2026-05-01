import { randomUUID } from 'node:crypto';
import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { clampMasteryLevel, recordStandardMastery } from '@/lib/services/mastery/standard-mastery';

const prisma = new PrismaClient();

const createStudent = () =>
  prisma.user.create({
    data: {
      id: `student-${randomUUID()}`,
      name: 'Test Student',
      username: `student-${randomUUID()}`,
      displayUsername: `Student${Math.random().toString(16).slice(2, 8)}`,
      email: `student-${randomUUID()}@example.com`,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

const createStandard = () =>
  prisma.standard.create({
    data: {
      id: `standard-${randomUUID()}`,
      framework: 'NGSS',
      code: `NGSS-${Math.random().toString(16).slice(2, 6)}`,
      description: 'Test standard',
      gradeLevel: 5
    }
  });

const createDependencies = async () => {
  const [student, standard] = await Promise.all([createStudent(), createStandard()]);
  return { student, standard };
};

describe('standardMastery persistence', () => {
  beforeEach(async () => {
    await prisma.standardMastery.deleteMany();
    await prisma.standard.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.standardMastery.deleteMany();
    await prisma.standard.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  it('creates a mastery record', async () => {
    const { student, standard } = await createDependencies();

    const record = await recordStandardMastery(prisma, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.75,
      evidenceDelta: 2,
      lastAssessedAt: new Date('2025-10-28T08:00:00Z')
    });

    expect(record.masteryLevel.toNumber()).toBe(0.75);
    expect(record.evidenceCount).toBe(2);
  });

  it('enforces unique(studentId, standardId)', async () => {
    const { student, standard } = await createDependencies();

    await recordStandardMastery(prisma, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.5,
      lastAssessedAt: new Date()
    });

    await expect(
      prisma.standardMastery.create({
        data: {
          studentId: student.id,
          standardId: standard.id,
          masteryLevel: new Prisma.Decimal(0.4),
          evidenceCount: 1,
          lastAssessedAt: new Date()
        }
      })
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('clamps masteryLevel to [0,1] and rounds to 2 decimals', async () => {
    const { student, standard } = await createDependencies();

    await recordStandardMastery(prisma, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 1.34,
      lastAssessedAt: new Date()
    });

    let persisted = await prisma.standardMastery.findUniqueOrThrow({
      where: { studentId_standardId: { studentId: student.id, standardId: standard.id } }
    });

    expect(persisted.masteryLevel.toNumber()).toBe(1);

    await recordStandardMastery(prisma, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: -0.2,
      lastAssessedAt: new Date()
    });

    persisted = await prisma.standardMastery.findUniqueOrThrow({
      where: { studentId_standardId: { studentId: student.id, standardId: standard.id } }
    });

    expect(persisted.masteryLevel.toNumber()).toBe(0);
  });

  it('rejects NaN mastery levels', () => {
    expect(() => clampMasteryLevel(Number.NaN)).toThrow(/masteryLevel/);
  });

  it('updates masteryLevel inside transaction with concurrent writers', async () => {
    const { student, standard } = await createDependencies();
    const masteryValues = [0.5, 0.55, 0.6, 0.65, 0.7];
    await Promise.all(
      masteryValues.map((value) =>
        recordStandardMastery(prisma, {
          studentId: student.id,
          standardId: standard.id,
          masteryLevel: value,
          lastAssessedAt: new Date('2025-10-28T08:00:00Z')
        })
      )
    );

    const final = await prisma.standardMastery.findUniqueOrThrow({
      where: { studentId_standardId: { studentId: student.id, standardId: standard.id } }
    });

    expect(final.evidenceCount).toBe(5);
    expect(masteryValues).toContain(final.masteryLevel.toNumber());
  });

  it('cascades when student deleted', async () => {
    const { student, standard } = await createDependencies();

    await recordStandardMastery(prisma, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.65,
      lastAssessedAt: new Date()
    });

    await prisma.user.delete({ where: { id: student.id } });

    const count = await prisma.standardMastery.count();
    expect(count).toBe(0);
  });

  it('cascades when standard deleted', async () => {
    const { student, standard } = await createDependencies();

    await recordStandardMastery(prisma, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.45,
      lastAssessedAt: new Date()
    });

    await prisma.standard.delete({ where: { id: standard.id } });

    const count = await prisma.standardMastery.count();
    expect(count).toBe(0);
  });

  it('queries student mastery ordered by masteryLevel', async () => {
    const { student } = await createDependencies();
    const standardA = await createStandard();
    const standardB = await createStandard();

    await recordStandardMastery(prisma, {
      studentId: student.id,
      standardId: standardA.id,
      masteryLevel: 0.9,
      lastAssessedAt: new Date()
    });

    await recordStandardMastery(prisma, {
      studentId: student.id,
      standardId: standardB.id,
      masteryLevel: 0.3,
      lastAssessedAt: new Date()
    });

    const rows = await prisma.standardMastery.findMany({
      where: { studentId: student.id },
      orderBy: { masteryLevel: 'asc' }
    });

    expect(rows).toHaveLength(2);
    expect(rows[0].standardId).toBe(standardB.id);
    expect(rows[1].standardId).toBe(standardA.id);
  });

  it('increments evidenceCount atomically', async () => {
    const { student, standard } = await createDependencies();

    await recordStandardMastery(prisma, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.4,
      evidenceDelta: 2,
      lastAssessedAt: new Date()
    });

    await recordStandardMastery(prisma, {
      studentId: student.id,
      standardId: standard.id,
      masteryLevel: 0.6,
      evidenceDelta: 3,
      lastAssessedAt: new Date()
    });

    const persisted = await prisma.standardMastery.findUniqueOrThrow({
      where: { studentId_standardId: { studentId: student.id, standardId: standard.id } }
    });

    expect(persisted.evidenceCount).toBe(5);
    expect(persisted.masteryLevel.toNumber()).toBe(0.6);
  });
});
