import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('Password Hashing and Verification', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'samePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      // bcrypt includes a random salt, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string password', async () => {
      const password = '';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle long passwords', async () => {
      const password = 'a'.repeat(100);
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should handle special characters in password', async () => {
      const password = 'P@ssw0rd!#$%^&*()';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(0);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'correctPassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'correctPassword123';
      const wrongPassword = 'wrongPassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should reject password with wrong case', async () => {
      const password = 'Password123';
      const wrongPassword = 'password123';

      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should reject empty password against valid hash', async () => {
      const password = 'validPassword123';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('', hash);
      expect(isValid).toBe(false);
    });

    it('should handle empty password verification if hash is for empty password', async () => {
      const password = '';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('', hash);
      expect(isValid).toBe(true);
    });

    it('should reject password against invalid hash format', async () => {
      const password = 'testPassword123';
      const invalidHash = 'not-a-valid-bcrypt-hash';

      const isValid = await verifyPassword(password, invalidHash);
      expect(isValid).toBe(false);
    });

    it('should handle special characters verification', async () => {
      const password = 'P@ssw0rd!#$%^&*()';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });
  });

  describe('Security Properties', () => {
    it('should produce hash of expected bcrypt format', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);

      // bcrypt hashes start with $2a$ or $2b$ and are 60 characters long
      expect(hash).toMatch(/^\$2[ab]\$/);
      expect(hash.length).toBe(60);
    });

    it('should be computationally expensive (reasonable time)', async () => {
      const password = 'testPassword123';

      const start = Date.now();
      await hashPassword(password);
      const duration = Date.now() - start;

      // Should take at least a few milliseconds (bcrypt is intentionally slow)
      // but not more than 1 second for reasonable SALT_ROUNDS
      expect(duration).toBeGreaterThan(10);
      expect(duration).toBeLessThan(1000);
    });

    it('should verify multiple passwords independently', async () => {
      const password1 = 'password1';
      const password2 = 'password2';
      const hash1 = await hashPassword(password1);
      const hash2 = await hashPassword(password2);

      expect(await verifyPassword(password1, hash1)).toBe(true);
      expect(await verifyPassword(password2, hash2)).toBe(true);
      expect(await verifyPassword(password1, hash2)).toBe(false);
      expect(await verifyPassword(password2, hash1)).toBe(false);
    });
  });
});
