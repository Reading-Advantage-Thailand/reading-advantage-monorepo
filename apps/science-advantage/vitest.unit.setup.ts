/**
 * Minimal setup file for unit tests that don't require database access.
 * The default config loads this file after its integration setup.
 * Keep this file free of database operations.
 */
import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });

  Element.prototype.scrollIntoView ??= () => undefined;
}

delete process.env.AI_RECOMMENDER_MODEL;
delete process.env.AI_RECOMMENDER_MODEL_PRIMARY;
