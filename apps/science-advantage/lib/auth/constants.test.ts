import { describe, it, expect } from 'vitest';
import { ROLE_HIERARCHY, ROLE_ROUTES } from './constants';

describe('Auth Constants', () => {
  describe('ROLE_HIERARCHY', () => {
    it('should define a strict hierarchy for all roles', () => {
      expect(ROLE_HIERARCHY.STUDENT).toBeLessThan(ROLE_HIERARCHY.TEACHER);
      expect(ROLE_HIERARCHY.TEACHER).toBeLessThan(ROLE_HIERARCHY.ADMIN);
      expect(ROLE_HIERARCHY.ADMIN).toBeLessThan(ROLE_HIERARCHY.SYSTEM);
    });
  });

  describe('ROLE_ROUTES', () => {
    it('should map each role to its default route', () => {
      expect(ROLE_ROUTES.STUDENT).toBe('/student');
      expect(ROLE_ROUTES.TEACHER).toBe('/teacher');
      expect(ROLE_ROUTES.ADMIN).toBe('/admin');
      expect(ROLE_ROUTES.SYSTEM).toBe('/system');
    });
  });
});
