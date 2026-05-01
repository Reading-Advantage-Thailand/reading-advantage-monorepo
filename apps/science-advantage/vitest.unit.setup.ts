/**
 * Minimal setup file for unit tests that don't require database access.
 * This avoids the Prisma db push that occurs in vitest.setup.ts.
 */
import '@testing-library/jest-dom/vitest';
