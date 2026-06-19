/**
 * Minimal setup file for unit tests that don't require database access.
 * The integration / default configs use `vitest.integration.setup.ts`
 * (env wiring only) plus `vitest.integration.global-setup.ts` (one-shot
 * drizzle-kit migrate). Keep this file DB-free.
 */
import '@testing-library/jest-dom/vitest';

delete process.env.AI_RECOMMENDER_MODEL;
delete process.env.AI_RECOMMENDER_MODEL_PRIMARY;
