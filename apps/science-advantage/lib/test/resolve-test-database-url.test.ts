import { describe, it, expect } from 'vitest';
import { resolveTestDatabaseUrl } from './resolve-test-database-url';

describe('resolveTestDatabaseUrl', () => {
  it('returns TEST_DATABASE_URL when set', () => {
    const result = resolveTestDatabaseUrl({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/science_advantage',
      TEST_DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/explicit_override_test',
    });
    expect(result).toBe('postgresql://postgres:postgres@localhost:5432/explicit_override_test');
  });

  it('appends _test to the DATABASE_URL pathname when no override', () => {
    const result = resolveTestDatabaseUrl({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/science_advantage',
    });
    expect(result).toBe('postgresql://postgres:postgres@localhost:5432/science_advantage_test');
  });

  it('preserves DATABASE_URL when it already ends with _test', () => {
    const result = resolveTestDatabaseUrl({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/science_advantage_test',
    });
    expect(result).toBe('postgresql://postgres:postgres@localhost:5432/science_advantage_test');
  });

  it('handles trailing slash in pathname', () => {
    const result = resolveTestDatabaseUrl({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/science_advantage/',
    });
    expect(result).toBe('postgresql://postgres:postgres@localhost:5432/science_advantage_test');
  });

  it('falls back to a built-in default when DATABASE_URL is missing', () => {
    const result = resolveTestDatabaseUrl({});
    expect(result).toMatch(/_test$/);
    expect(result).toContain('postgresql://');
  });

  it('falls back to suffix-append on a malformed URL', () => {
    const result = resolveTestDatabaseUrl({
      DATABASE_URL: 'not-a-url',
    });
    expect(result).toBe('not-a-url_test');
  });

  it('prefers TEST_DATABASE_URL over the _test convention', () => {
    const result = resolveTestDatabaseUrl({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/science_advantage_test',
      TEST_DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/different_test',
    });
    expect(result).toBe('postgresql://postgres:postgres@localhost:5432/different_test');
  });
});
