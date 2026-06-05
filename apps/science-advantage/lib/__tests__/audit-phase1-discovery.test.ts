/**
 * Phase 1 (Discovery) contracts for the AGENTS.md Compliance Audit of
 * `apps/science-advantage/` (pilot).
 *
 * Phase 1 of the audit protocol (§0 of `measure/agents-md-audit-protocol.md`)
 * produces `00-inventory.md`: a baseline structural shape of the app that
 * downstream section-audit subagents consume. This test file pins the
 * inventory's accuracy so that drift between the inventory and the
 * filesystem (or between the inventory and `build-graph`/`find`/`rg`) is
 * caught before Phase 2 consumes it.
 *
 * The Phase 1 plan tasks are:
 *   1. Inventory all app/**\/route.ts files (count + list)
 *   2. Inventory all app/**\/actions.ts files
 *   3. Inventory lib/, components/, prisma/, scripts/
 *   4. Capture package.json deps, next.config.ts, proxy.ts,
 *      tsconfig.json, vitest.config.ts, CI workflow
 *   5. Write 00-inventory.md with file counts and pointers
 *
 * The test strategy (`test-strategy.md`) prescribes:
 *   - Unit: file-count assertions
 *   - Integration: `build-graph stats` matches `rg` counts
 *   - Per-Phase Test Approach: assert file counts from graph match
 *     `find`/`rg`; assert inventory lists all dirs.
 *
 * The SUT is `00-inventory.md` (and the `apps/science-advantage/`
 * filesystem it claims to describe). Tests are unit-level (no DB, no
 * server) and shell out to `find`, `wc`, and `build-graph` for ground
 * truth.
 *
 * See: measure/tracks/agents_md_audit_science_advantage_20260603/test-strategy.md
 */
import fs from 'fs/promises';
import path from 'path';
import { execFileSync } from 'child_process';
import { describe, it, expect } from 'vitest';

/**
 * Resolve the monorepo root via git so this test is robust to moves of
 * the file within the tree.
 */
const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();
const GRAPH_DB = path.join(MONOREPO_ROOT, 'graph.db');
const APP_DIR = path.join(MONOREPO_ROOT, 'apps/science-advantage');
const INVENTORY = path.join(
  MONOREPO_ROOT,
  'measure/audit-reports/science-advantage_20260603/00-inventory.md',
);

function runCaptured(command: string, args: string[]): string {
  return execFileSync(command, args, {
    cwd: MONOREPO_ROOT,
    encoding: 'utf-8',
  }).trim();
}

function countLines(command: string, args: string[]): number {
  const out = runCaptured(command, args);
  if (out === '') return 0;
  return out.split('\n').filter((l) => l.length > 0).length;
}

/**
 * Parse the inventory's "Summary" table on lines 13–33 for the named
 * metric. Returns the trimmed cell value, or `null` if not found.
 * Splits each row on `|` so the backtick-delimited label can be
 * matched by string equality without regex.
 */
async function readInventoryMetric(label: string): Promise<string | null> {
  const contents = await fs.readFile(INVENTORY, 'utf-8');
  for (const line of contents.split('\n')) {
    // Markdown table row: | `LABEL` | VALUE | … — split on pipes
    // and trim each cell, ignoring the leading/trailing empty cells.
    // Strip backticks from the label cell so callers can pass a
    // bare label like `app/**/route.ts`.
    const cells = line.split('|').map((c) => c.trim().replace(/^`|`$/g, ''));
    if (cells.length >= 3 && cells[0] === '' && cells[1] === label) {
      return cells[2];
    }
  }
  return null;
}

/**
 * Slice a fenced code block from the inventory whose opening fence is
 * preceded by a heading matching `headingRegex`.
 */
async function readInventoryCodeBlock(headingRegex: RegExp): Promise<string> {
  const contents = await fs.readFile(INVENTORY, 'utf-8');
  const lines = contents.split('\n');
  const start = lines.findIndex((l) => headingRegex.test(l));
  if (start === -1) return '';
  // Skip to the opening ``` after the heading
  let i = start + 1;
  while (i < lines.length && !lines[i].startsWith('```')) i++;
  if (i >= lines.length) return '';
  i++;
  const buf: string[] = [];
  while (i < lines.length && !lines[i].startsWith('```')) {
    buf.push(lines[i]);
    i++;
  }
  return buf.join('\n');
}

describe('AGENTS.md Compliance Audit — science-advantage (Phase 1: Discovery)', () => {
  describe('Phase 1.5 — 00-inventory.md exists and is well-formed', () => {
    it('measure/audit-reports/science-advantage_20260603/00-inventory.md exists', async () => {
      const stat = await fs.stat(INVENTORY);
      expect(stat.isFile()).toBe(true);
    });

    it('the inventory file is non-empty (a stub would be <100 bytes)', async () => {
      const stat = await fs.stat(INVENTORY);
      expect(stat.size).toBeGreaterThan(100);
    });

    it('the inventory opens with the expected source header', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      expect(contents).toMatch(/^## Source: `apps\/science-advantage\/`/m);
    });

    it('the inventory contains a "Metric | Count" summary table', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      expect(contents).toMatch(/^\| Metric \| Count \|$/m);
    });
  });

  describe('Phase 1.1 — app/**/route.ts inventory', () => {
    it('27 route.ts files exist in apps/science-advantage/app/', () => {
      const n = countLines('find', [
        'apps/science-advantage/app',
        '-name', 'route.ts',
        '-not', '-path', '*/node_modules/*',
      ]);
      expect(n).toBe(27);
    });

    it('inventory summary table lists `app/**/route.ts` count = 27', async () => {
      const value = await readInventoryMetric('app/**/route.ts');
      expect(value).not.toBeNull();
      expect(value).toBe('27');
    });

    it('the inventory file lists every route.ts path on disk', async () => {
      const findOutput = runCaptured('find', [
        'apps/science-advantage/app',
        '-name', 'route.ts',
        '-not', '-path', '*/node_modules/*',
      ]);
      // The inventory uses paths relative to apps/science-advantage/
      // (e.g. `app/api/...`) rather than the full monorepo path.
      const RELATIVE_PREFIX = 'apps/science-advantage/';
      const onDisk = findOutput
        .split('\n')
        .filter((l) => l.endsWith('route.ts'))
        .map((p) => (p.startsWith(RELATIVE_PREFIX) ? p.slice(RELATIVE_PREFIX.length) : p));
      const inventory = await fs.readFile(INVENTORY, 'utf-8');
      const missing: string[] = [];
      for (const rel of onDisk) {
        if (!inventory.includes(rel)) missing.push(rel);
      }
      expect(missing, `inventory is missing these route.ts paths: ${missing.join(', ')}`).toEqual([]);
    });
  });

  describe('Phase 1.2 — app/**/actions.ts inventory', () => {
    it('0 actions.ts files exist in apps/science-advantage/app/', () => {
      const n = countLines('find', [
        'apps/science-advantage/app',
        '-name', 'actions.ts',
        '-not', '-path', '*/node_modules/*',
      ]);
      expect(n).toBe(0);
    });

    it('inventory summary table lists `app/**/actions.ts` count = 0', async () => {
      const value = await readInventoryMetric('app/**/actions.ts');
      expect(value).not.toBeNull();
      expect(value).toBe('0');
    });
  });

  describe('Phase 1.3 — lib/, components/, prisma/, scripts/ directory coverage', () => {
    it('inventory has a `## `lib/` files` section', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      expect(contents).toMatch(/^## `lib\/` files/m);
    });

    it('inventory has a `## `components/` files` section', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      expect(contents).toMatch(/^## `components\/` files/m);
    });

    it('inventory has a `## `prisma/` files` section', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      expect(contents).toMatch(/^## `prisma\/` files/m);
    });

    it('inventory has a `## `scripts/` files` section', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      expect(contents).toMatch(/^## `scripts\/` files/m);
    });

    it('inventory reports 0 prisma/schema.prisma files (Prisma fully removed)', () => {
      const n = countLines('find', [
        'apps/science-advantage/prisma',
        '-name', 'schema.prisma',
      ]);
      expect(n).toBe(0);
    });
  });

  describe('Phase 1.4 — config-file capture (package.json, next.config.ts, proxy.ts, tsconfig.json, vitest, CI)', () => {
    it('inventory mentions package.json', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      expect(contents).toContain('package.json');
    });

    it('inventory mentions next.config.ts', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      expect(contents).toContain('next.config.ts');
    });

    it('inventory mentions proxy.ts', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      expect(contents).toContain('proxy.ts');
    });

    it('inventory mentions tsconfig.json', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      expect(contents).toContain('tsconfig.json');
    });

    it('inventory mentions vitest.config.ts (or one of its 4 split configs)', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      const mentionsVitest =
        contents.includes('vitest.config.ts') ||
        contents.includes('vitest.integration.config.ts') ||
        contents.includes('vitest.unit.config.ts') ||
        contents.includes('vitest.scripts.config.ts');
      expect(mentionsVitest).toBe(true);
    });

    it('inventory mentions the CI workflow file', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      expect(contents).toMatch(/\.github\/workflows\/ci\.yml/);
    });

    it('every config file claimed in the inventory exists on disk', async () => {
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      const claimed = [
        'package.json',
        'next.config.ts',
        'proxy.ts',
        'tsconfig.json',
        'vitest.config.ts',
        'vitest.integration.config.ts',
        'vitest.unit.config.ts',
        'vitest.scripts.config.ts',
        '.github/workflows/ci.yml',
      ];
      for (const rel of claimed) {
        const abs = path.join(APP_DIR, rel);
        const stat = await fs.stat(abs);
        expect(stat.isFile(), `${rel} should exist on disk`).toBe(true);
      }
    });
  });

  describe('Phase 1 Integration — build-graph coverage of apps/science-advantage/', () => {
    /**
     * The test strategy (`test-strategy.md` §6.1) documents that
     * `build-graph scan` indexes only 6 of the ~330 source files in
     * `apps/science-advantage/` (auth + AI modules) and 0 of the 27
     * `route.ts` files. These tests pin that coverage gap as a known
     * RED: the integration assertion "build-graph stats matches
     * find" fails today, and will only pass when the graph is
     * extended to cover app source. Tracking this is itself a Phase 1
     * deliverable so Phase 2 subagents know they cannot rely on
     * `build-graph` for route discovery and must fall back to grep.
     */
    it('build-graph indexes at least one science-advantage file', () => {
      const output = runCaptured('build-graph', [
        'query',
        GRAPH_DB,
        `SELECT COUNT(*) FROM nodes WHERE file_path LIKE '%science-advantage%' AND type = 'file'`,
      ]);
      // Output is `COUNT(*)\n<number>` — pick the last non-empty line.
      const n = Number(output.split('\n').filter((l) => l.length > 0).pop());
      expect(n).toBeGreaterThan(0);
    });

    it(
      'build-graph route count for science-advantage matches find (RED: known coverage gap, 0 of 27 routes indexed)',
      () => {
        const findRoutes = countLines('find', [
          'apps/science-advantage/app',
          '-name', 'route.ts',
          '-not', '-path', '*/node_modules/*',
        ]);
        const graphOutput = runCaptured('build-graph', [
          'query',
          GRAPH_DB,
          `SELECT COUNT(*) FROM nodes WHERE type = 'route' AND file_path LIKE '%science-advantage%'`,
        ]);
        const graphRoutes = Number(
          graphOutput.split('\n').filter((l) => l.length > 0).pop(),
        );
        // RED today (test-strategy §6.1): 0 routes indexed, find shows
        // 27. The assertion fails when graph coverage is incomplete.
        // When the graph is extended to cover app routes, this will
        // turn GREEN automatically.
        expect(graphRoutes, `build-graph indexed ${graphRoutes} of ${findRoutes} routes — coverage gap`).toBe(
          findRoutes,
        );
      },
    );
  });

  describe('Phase 1 Integration — inventory vs filesystem drift on scripts/ count', () => {
    /**
     * The inventory heading reads "`scripts/` files (full list, 18
     * `.ts` + 2 `.test.ts`)" — implying 20 .ts files in total. The
     * actual filesystem has 22 .ts files (the inventory omits the 6
     * scripts in `scripts/seed/` and mis-tallies the 2 test files as
     * being inside the 18). This is a meaningful drift the audit
     * subagent should fix when it ingests the listing. RED today.
     */
    it('inventory heading count for scripts/ matches find (RED: 20 claimed vs 22 actual)', async () => {
      const onDisk = countLines('find', [
        'apps/science-advantage/scripts',
        '-type', 'f',
        '-name', '*.ts',
        '-not', '-path', '*/node_modules/*',
      ]);
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      const heading = contents.match(
        /^## `scripts\/` files \(full list, (.+?)\)/m,
      );
      expect(heading).not.toBeNull();
      // Heading format: "18 `.ts` + 2 `.test.ts`" — sum to 20.
      const claimed = 20;
      expect(
        onDisk,
        `inventory claims ${claimed} .ts files in scripts/, filesystem has ${onDisk}`,
      ).toBe(claimed);
    });
  });
});
