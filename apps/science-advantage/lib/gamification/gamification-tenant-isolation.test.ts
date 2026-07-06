import { describe, it, expect, vi } from 'vitest';

vi.mock('server-only');

import type { Tenant, UserContext } from '@reading-advantage/auth';
import { AuthError } from '@reading-advantage/auth';
import { createTenantDB } from '@reading-advantage/domain';
import { createMockDb } from '../../../../packages/domain/src/__tests__/mock-db.js';
import { buildTenantIsolationHarness } from '../../../../packages/domain/src/testing/tenant-isolation-harness.js';

/**
 * Phase 1 Red tests for ST-1: gamification writes must route through
 * createTenantDB + assertCan so a user cannot award XP, update a streak,
 * or write badges across schools.
 *
 * These tests assume the target contract:
 *   awardXp({ db, user, tenant, input: { profileId, amount } })
 *   updateStreakForProfile({ db, user, tenant, input: { profileId, currentTime } })
 *   checkBadgeConditions({ db, user, tenant, input: { userId, triggerEvent } })
 *
 * At baseline the functions accept positional args and do not accept user,
 * tenant, or assertCan, so every assertion that checks for the authz call or
 * the cross-tenant rejection fails.
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

function gamificationProfileRow(overrides: {
  id: string;
  schoolId: string;
  userId: string;
  xp?: number;
  level?: number;
  streak?: number;
  lastActiveAt?: Date | null;
}) {
  const now = new Date();
  return {
    id: overrides.id,
    userId: overrides.userId,
    schoolId: overrides.schoolId,
    xp: overrides.xp ?? 0,
    level: overrides.level ?? 1,
    streak: overrides.streak ?? 0,
    lastActiveAt: overrides.lastActiveAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

// Mutable mock so each test can inject its own return values. The source
// modules import a singleton `db` from `@reading-advantage/db`; we replace
// that singleton with a getter that reads from mutableMockDb.
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

vi.mock('@reading-advantage/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@reading-advantage/auth')>();
  return {
    ...actual,
    assertCan: vi.fn((user: UserContext, permission: string, tenant: Tenant) => {
      // Minimal tenant-aware mock: reject cross-tenant, allow same-tenant.
      // After Green the real implementation will call the real assertCan.
      if (tenant.schoolId !== user.schoolId) {
        throw new actual.AuthError(
          `User ${user.id} (${user.role}) lacks permission: ${permission}`,
          'FORBIDDEN',
        );
      }
    }),
  };
});

import { assertCan } from '@reading-advantage/auth';
import { awardXp } from './xp';
import { updateStreakForProfile } from './streak';
import { checkBadgeConditions } from './badges';

describe('ST-1 gamification tenant isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('awardXp', () => {
    it('awards XP for a same-tenant caller and calls assertCan', async () => {
      mutableMockDb = createMockDb({
        selectResults: [
          gamificationProfileRow({
            id: 'profile-a',
            schoolId: schoolA.schoolId,
            userId: 'student-a',
            xp: 50,
          }),
        ],
        updateReturning: [
          gamificationProfileRow({
            id: 'profile-a',
            schoolId: schoolA.schoolId,
            userId: 'student-a',
            xp: 150,
          }),
        ],
      });
      const tenantDb = createTenantDB(mutableMockDb, schoolA);
      const user = makeUser('student-a', schoolA.schoolId);

      const result = await (awardXp as any)({
        db: tenantDb,
        user,
        tenant: schoolA,
        input: { profileId: 'profile-a', amount: 100 },
      });

      expect(result.xp).toBe(150);
      expect(assertCan).toHaveBeenCalledWith(user, 'progress:record', schoolA);
    });

    it('rejects a cross-tenant XP award (fails before createTenantDB + assertCan)', async () => {
      mutableMockDb = createMockDb({
        selectResults: [
          gamificationProfileRow({
            id: 'profile-a',
            schoolId: schoolA.schoolId,
            userId: 'student-a',
            xp: 50,
          }),
        ],
        updateReturning: [
          gamificationProfileRow({
            id: 'profile-a',
            schoolId: schoolA.schoolId,
            userId: 'student-a',
            xp: 150,
          }),
        ],
      });
      const tenantDb = createTenantDB(mutableMockDb, schoolA);
      const attacker = makeUser('student-b', schoolB.schoolId);

      await expect(
        (awardXp as any)({
          db: tenantDb,
          user: attacker,
          tenant: schoolB,
          input: { profileId: 'profile-a', amount: 100 },
        }),
      ).rejects.toThrow(AuthError);
    });

    it('does not mutate schoolB rows when schoolA caller awards XP (A4 both-directions)', async () => {
      // Falsification: remove createTenantDB wrapping and this test passes
      // because the raw db will update any row selected by id.
      const schoolAProfile = gamificationProfileRow({
        id: 'profile-a',
        schoolId: schoolA.schoolId,
        userId: 'student-a',
        xp: 0,
      });
      mutableMockDb = createMockDb({
        selectResults: [schoolAProfile],
        updateReturning: [
          gamificationProfileRow({
            id: 'profile-a',
            schoolId: schoolA.schoolId,
            userId: 'student-a',
            xp: 100,
          }),
        ],
      });
      const tenantDb = createTenantDB(mutableMockDb, schoolA);
      const user = makeUser('student-a', schoolA.schoolId);

      const result = await (awardXp as any)({
        db: tenantDb,
        user,
        tenant: schoolA,
        input: { profileId: 'profile-a', amount: 100 },
      });

      expect(result.xp).toBe(100);
      expect(assertCan).toHaveBeenCalledWith(user, 'progress:record', schoolA);
    });
  });

  describe('updateStreakForProfile', () => {
    it('updates streak for a same-tenant caller and calls assertCan', async () => {
      mutableMockDb = createMockDb({
        selectResults: [
          gamificationProfileRow({
            id: 'profile-a',
            schoolId: schoolA.schoolId,
            userId: 'student-a',
            streak: 1,
            lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          }),
        ],
        updateReturning: [
          gamificationProfileRow({
            id: 'profile-a',
            schoolId: schoolA.schoolId,
            userId: 'student-a',
            streak: 2,
            lastActiveAt: new Date(),
          }),
        ],
      });
      const tenantDb = createTenantDB(mutableMockDb, schoolA);
      const user = makeUser('student-a', schoolA.schoolId);

      const result = await (updateStreakForProfile as any)({
        db: tenantDb,
        user,
        tenant: schoolA,
        input: { profileId: 'profile-a', currentTime: new Date() },
      });

      expect(result.streak).toBe(2);
      expect(assertCan).toHaveBeenCalledWith(user, 'progress:record', schoolA);
    });

    it('rejects a cross-tenant streak update (fails before createTenantDB + assertCan)', async () => {
      mutableMockDb = createMockDb({
        selectResults: [
          gamificationProfileRow({
            id: 'profile-a',
            schoolId: schoolA.schoolId,
            userId: 'student-a',
            streak: 1,
            lastActiveAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          }),
        ],
      });
      const tenantDb = createTenantDB(mutableMockDb, schoolA);
      const attacker = makeUser('student-b', schoolB.schoolId);

      await expect(
        (updateStreakForProfile as any)({
          db: tenantDb,
          user: attacker,
          tenant: schoolB,
          input: { profileId: 'profile-a', currentTime: new Date() },
        }),
      ).rejects.toThrow(AuthError);
    });
  });

  describe('checkBadgeConditions', () => {
    it('returns unlocked badges for a same-tenant caller and calls assertCan', async () => {
      mutableMockDb = createMockDb({
        selectResults: [[], [], []],
        insertReturning: [
          {
            id: 'achievement-1',
            userId: 'student-a',
            badgeType: 'FIRST_STEPS',
            unlockedAt: new Date(),
            schoolId: schoolA.schoolId,
          },
        ],
      });
      const tenantDb = createTenantDB(mutableMockDb, schoolA);
      const user = makeUser('student-a', schoolA.schoolId);

      const result = await (checkBadgeConditions as any)({
        db: tenantDb,
        user,
        tenant: schoolA,
        input: { userId: 'student-a', triggerEvent: 'LESSON_COMPLETED' as const },
      });

      expect(result.achievements).toBeDefined();
      expect(assertCan).toHaveBeenCalledWith(user, 'progress:record', schoolA);
    });

    it('rejects a cross-tenant badge write (fails before createTenantDB + assertCan)', async () => {
      mutableMockDb = createMockDb({
        selectResults: [[], [], []],
      });
      const tenantDb = createTenantDB(mutableMockDb, schoolA);
      const attacker = makeUser('student-b', schoolB.schoolId);

      await expect(
        (checkBadgeConditions as any)({
          db: tenantDb,
          user: attacker,
          tenant: schoolB,
          input: { userId: 'student-a', triggerEvent: 'LESSON_COMPLETED' as const },
        }),
      ).rejects.toThrow(AuthError);
    });
  });
});
