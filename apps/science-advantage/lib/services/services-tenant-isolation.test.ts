import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only');

import type { Tenant, UserContext } from '@reading-advantage/auth';
import { AuthError } from '@reading-advantage/auth';
import { createTenantDB } from '@reading-advantage/domain';
import { createMockDb } from '../../../../packages/domain/src/__tests__/mock-db.js';
import { buildTenantIsolationHarness } from '../../../../packages/domain/src/testing/tenant-isolation-harness.js';

/**
 * Phase 1 Red tests for ST-2: lib/services/** reads must accept user context +
 * tenant and route through createTenantDB + assertCan. A caller without a
 * user context or from a foreign tenant must not be able to read classes,
 * enrolled classes, or mastery data.
 *
 * Target contract:
 *   getClassDetailWithCurriculum({ db, user, tenant, input: { classId } })
 *   getStudentEnrolledClasses({ db, user, tenant, input: { studentId } })
 *   processMasteryRun({ db, user, tenant, input: { attemptId, studentId } })
 *
 * At baseline these functions accept positional / raw-db args and do not
 * enforce authz/tenant scoping, so every negative assertion below fails.
 */

const harness = buildTenantIsolationHarness();
const schoolA = harness.tenants[0];
const schoolB = harness.tenants[1];

function makeUser(userId: string, schoolId: string): UserContext {
  return {
    id: userId,
    username: userId,
    name: `Student ${userId}`,
    role: 'STUDENT',
    schoolId,
    xp: 0,
    level: 1,
    cefrLevel: 'A1',
  };
}

let mutableMockDb = createMockDb();

vi.mock('@reading-advantage/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@reading-advantage/db')>();
  return {
    ...actual,
    get db() {
      return mutableMockDb;
    },
  };
});

import {
  getClassDetailWithCurriculum,
  getStudentEnrolledClasses,
  processMasteryRun,
} from '.';

describe('ST-2 services auth and tenant scoping', () => {
  beforeEach(() => {
    mutableMockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('getClassDetailWithCurriculum', () => {
    it('throws when called without a user context (fails before assertCan)', async () => {
      const tenantDb = createTenantDB(mutableMockDb, schoolA);

      await expect(
        (getClassDetailWithCurriculum as any)({
          db: tenantDb,
          tenant: schoolA,
          input: { classId: 'class-a' },
        }),
      ).rejects.toThrow();
    });

    it('throws for a foreign-tenant caller (fails before createTenantDB + assertCan)', async () => {
      mutableMockDb = createMockDb({
        selectResults: [
          {
            id: 'class-a',
            name: 'Class A',
            gradeLevel: 4,
            standardsAlignment: 'NGSS',
            joinCode: 'code-a',
            teacherId: 'teacher-a',
            schoolId: schoolA.schoolId,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });
      const tenantDb = createTenantDB(mutableMockDb, schoolA);
      const attacker = makeUser('student-b', schoolB.schoolId);

      await expect(
        (getClassDetailWithCurriculum as any)({
          db: tenantDb,
          user: attacker,
          tenant: schoolB,
          input: { classId: 'class-a' },
        }),
      ).rejects.toThrow(AuthError);
    });
  });

  describe('getStudentEnrolledClasses', () => {
    it('throws when called without a user context (fails before assertCan)', async () => {
      const tenantDb = createTenantDB(mutableMockDb, schoolA);

      await expect(
        (getStudentEnrolledClasses as any)({
          db: tenantDb,
          tenant: schoolA,
          input: { studentId: 'student-a' },
        }),
      ).rejects.toThrow();
    });

    it('throws for a foreign-tenant caller (fails before createTenantDB + assertCan)', async () => {
      mutableMockDb = createMockDb({
        selectResults: [
          {
            id: 'class-a',
            name: 'Class A',
            gradeLevel: 4,
            teacherId: 'teacher-a',
            teacherName: 'Teacher A',
            createdAt: new Date(),
          },
        ],
      });
      const tenantDb = createTenantDB(mutableMockDb, schoolA);
      const attacker = makeUser('student-b', schoolB.schoolId);

      await expect(
        (getStudentEnrolledClasses as any)({
          db: tenantDb,
          user: attacker,
          tenant: schoolB,
          input: { studentId: 'student-a' },
        }),
      ).rejects.toThrow(AuthError);
    });
  });

  describe('processMasteryRun', () => {
    it('throws when called without a user context (fails before assertCan)', async () => {
      const tenantDb = createTenantDB(mutableMockDb, schoolA);

      await expect(
        (processMasteryRun as any)({
          db: tenantDb,
          tenant: schoolA,
          input: { attemptId: 'attempt-a', studentId: 'student-a' },
        }),
      ).rejects.toThrow();
    });

    it('throws for a foreign-tenant caller (fails before createTenantDB + assertCan)', async () => {
      mutableMockDb = createMockDb({
        selectResults: [
          {
            attemptId: 'attempt-a',
            schoolId: schoolA.schoolId,
            status: 'PENDING',
          },
        ],
      });
      const tenantDb = createTenantDB(mutableMockDb, schoolA);
      const attacker = makeUser('student-b', schoolB.schoolId);

      await expect(
        (processMasteryRun as any)({
          db: tenantDb,
          user: attacker,
          tenant: schoolB,
          input: { attemptId: 'attempt-a', studentId: 'student-a' },
        }),
      ).rejects.toThrow(AuthError);
    });
  });
});
