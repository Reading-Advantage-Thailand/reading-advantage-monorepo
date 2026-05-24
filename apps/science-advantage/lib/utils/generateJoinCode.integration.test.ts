import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, sql } from '@reading-advantage/db';
import {
  scienceClasses,
  users,
} from '@reading-advantage/db/schema';

import {
  generateJoinCode,
  generateUniqueJoinCode,
} from './generateJoinCode';
import {
  JOIN_CODE_CHARSET,
  JOIN_CODE_LENGTH,
  isValidJoinCodeFormat,
} from './join-code-format';

const TEST_PREFIX = 'gjc-itest';

async function cleanupFixtures(): Promise<void> {
  await db.delete(scienceClasses);
  await db.execute(sql`DELETE FROM users WHERE id LIKE ${`${TEST_PREFIX}-%`}`);
}

async function seedTeacher(id: string) {
  const [u] = await db
    .insert(users)
    .values({
      id,
      name: id,
      username: id,
      displayUsername: id,
      email: `${id}@example.com`,
      role: 'TEACHER',
    })
    .returning();
  return u;
}

async function seedClass(teacherId: string, joinCode: string) {
  const [c] = await db
    .insert(scienceClasses)
    .values({
      name: `class-${joinCode}`,
      gradeLevel: 5,
      standardsAlignment: 'THAI',
      joinCode,
      teacherId,
    })
    .returning();
  return c;
}

describe('generateJoinCode - Integration', () => {
  beforeEach(async () => {
    await cleanupFixtures();
  });

  afterEach(async () => {
    await cleanupFixtures();
    vi.restoreAllMocks();
  });

  describe('generateJoinCode (pure)', () => {
    it('returns a code with the expected length', () => {
      const code = generateJoinCode();
      expect(code).toHaveLength(JOIN_CODE_LENGTH);
    });

    it('returns a code composed only of allowed charset characters', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateJoinCode();
        expect(isValidJoinCodeFormat(code)).toBe(true);
        for (const ch of code) {
          expect(JOIN_CODE_CHARSET.includes(ch)).toBe(true);
        }
      }
    });
  });

  describe('generateUniqueJoinCode (DB-backed)', () => {
    it('returns a valid unique code when no collisions exist', async () => {
      const code = await generateUniqueJoinCode(db);
      expect(code).toHaveLength(JOIN_CODE_LENGTH);
      expect(isValidJoinCodeFormat(code)).toBe(true);
    });

    it('retries past a collision and returns a non-colliding code', async () => {
      const teacher = await seedTeacher(`${TEST_PREFIX}-teacher-1`);
      const collidingCode = 'ABCDEF';
      const freshCode = 'GHJKLM';
      await seedClass(teacher.id, collidingCode);

      const randomSpy = vi.spyOn(Math, 'random');
      // First call: produce the colliding code char-by-char (CODE_LENGTH calls).
      // Second call: produce the fresh code.
      const charset = JOIN_CODE_CHARSET;
      const valuesForCode = (code: string): number[] =>
        code.split('').map((ch) => {
          const idx = charset.indexOf(ch);
          // Math.floor(random * charset.length) === idx
          // So random must be idx / charset.length (any value in [idx/L, (idx+1)/L))
          return idx / charset.length;
        });

      const queued = [
        ...valuesForCode(collidingCode),
        ...valuesForCode(freshCode),
      ];
      randomSpy.mockImplementation(() => {
        const next = queued.shift();
        if (next === undefined) {
          throw new Error('Math.random called more times than queued');
        }
        return next;
      });

      const result = await generateUniqueJoinCode(db);
      expect(result).toBe(freshCode);
    });

    it('throws after MAX_RETRIES consecutive collisions', async () => {
      const teacher = await seedTeacher(`${TEST_PREFIX}-teacher-2`);
      const collidingCode = 'PQRSTU';
      await seedClass(teacher.id, collidingCode);

      const charset = JOIN_CODE_CHARSET;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        // Always return the value that produces the first character of collidingCode...
        // Actually we need the full sequence — but we can rotate.
        return 0; // produces charset[0] = 'A' every time
      });

      // First insert a class with all-A code so the deterministic sequence collides every time.
      await db.delete(scienceClasses).where(sql`true`);
      const allA = charset[0].repeat(JOIN_CODE_LENGTH);
      await seedClass(teacher.id, allA);

      await expect(generateUniqueJoinCode(db)).rejects.toThrow(
        /Failed to generate unique join code/
      );
    });
  });
});
