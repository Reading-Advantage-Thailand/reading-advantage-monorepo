import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const salesKnowledgeInitialization = vi.hoisted(() => vi.fn());

vi.mock('@reading-advantage/sales-knowledge', () => {
  salesKnowledgeInitialization();
  throw new Error('Sales knowledge must not initialize for narrow Domain imports.');
});

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(TEST_DIR, '../..');
const ROOT_DOMAIN_IMPORT = /\b(?:import|export)\s+(?:[^;]*?\bfrom\s+)?['"]@reading-advantage\/domain['"]|\bimport\s*\(\s*['"]@reading-advantage\/domain['"]\s*\)/g;
const SOURCE_FILE = /\.tsx?$/;
const TEST_FILE = /(?:\.test|\.integration\.test|\.spec)\.tsx?$/;

/**
 * Collects production TypeScript files below one directory.
 * @param directory The directory to scan.
 * @param files The mutable result list for recursive calls.
 * @returns The production TypeScript file paths.
 */
function productionFiles(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) productionFiles(path, files);
    else if (SOURCE_FILE.test(entry.name) && !TEST_FILE.test(entry.name)) files.push(path);
  }
  return files;
}

/**
 * Finds root Domain import statements in source text.
 * @param source The source text to inspect.
 * @returns The matching import statements.
 */
function rootDomainImports(source: string): string[] {
  return source.match(ROOT_DOMAIN_IMPORT) ?? [];
}

describe('Domain subpath isolation', () => {
  it('loads tenant and teacher APIs without initializing Sales knowledge', async () => {
    const [dbContract, teachers] = await Promise.all([
      import('@reading-advantage/domain/db-contract'),
      import('@reading-advantage/domain/teachers'),
    ]);

    expect(dbContract.createTenantDB).toBeTypeOf('function');
    expect(teachers.getTeacherClasses).toBeTypeOf('function');
    expect(teachers.getTeacherClassesWithCounts).toBeTypeOf('function');
    expect(salesKnowledgeInitialization).not.toHaveBeenCalled();
  });

  it('keeps root Domain imports out of app and lib production files', () => {
    const fixture = readFileSync(join(TEST_DIR, 'fixtures/domain-root-import-counterexample.txt'), 'utf8');
    expect(rootDomainImports(fixture)).toHaveLength(1);

    const hits = [join(APP_ROOT, 'app'), join(APP_ROOT, 'lib')]
      .flatMap((directory) => productionFiles(directory))
      .flatMap((file) =>
        rootDomainImports(readFileSync(file, 'utf8')).map(
          (statement) => `${relative(APP_ROOT, file)}: ${statement.replace(/\s+/g, ' ').trim()}`,
        ),
      );

    expect(hits).toEqual([]);
  });
});
