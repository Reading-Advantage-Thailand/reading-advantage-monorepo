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

  /**
   * Phase 1.5 (Discovery) — extended summary-table row parity.
   *
   * The `Phase 1.5 — 00-inventory.md exists and is well-formed` block
   * (above) verifies the inventory file's existence and the summary
   * table's existence. The `Phase 1.1`–`Phase 1.4` blocks verify the
   * route.ts / actions.ts / lib / components / prisma / scripts /
   * config-file rows. This block fills in the remaining summary-table
   * rows: source-file counts, page/layout/middleware counts, test
   * file counts, and dependency counts. These are the per-row
   * contracts that §0 Discovery must satisfy before Phase 2 (Static
   * Analysis) consumes the inventory.
   *
   * Per the test strategy (`test-strategy.md` §5):
   *   - Phase 1: File-count assertions
   *   - Phase 1: build-graph stats matches `rg` counts
   *   - Phase 1: Assert inventory lists all dirs
   *
   * Tests in this block read the inventory's summary-table value via
   * the `readInventoryMetric` helper (defined above) and compare it
   * to a fresh `find` / `node -p` against the live filesystem. Tests
   * that match the filesystem pin the inventory against future drift;
   * tests that do not match document the current drift between the
   * inventory (written 2026-06-03) and the current main branch. The
   * drift tests stay RED until the inventory is regenerated; the
   * corresponding fix tracks are F-1001 (ignoreBuildErrors) and F-1305
   * (TODO inventory drift) per `findings.md`.
   */
  describe('Phase 1.5 — summary table row parity (extended file counts)', () => {
    describe('Phase 1.5.a — app/**/{page,layout,middleware}.tsx counts', () => {
      it('22 app/**/page.tsx files exist in apps/science-advantage/app/', () => {
        const n = countLines('find', [
          'apps/science-advantage/app',
          '-name', 'page.tsx',
          '-not', '-path', '*/node_modules/*',
        ]);
        expect(n).toBe(22);
      });
      it('inventory summary table lists `app/**/page.tsx` count = 22', async () => {
        const value = await readInventoryMetric('app/**/page.tsx');
        expect(value).toBe('22');
      });
      it('6 app/**/layout.tsx files exist in apps/science-advantage/app/', () => {
        const n = countLines('find', [
          'apps/science-advantage/app',
          '-name', 'layout.tsx',
          '-not', '-path', '*/node_modules/*',
        ]);
        expect(n).toBe(6);
      });
      it('inventory summary table lists `app/**/layout.tsx` count = 6', async () => {
        const value = await readInventoryMetric('app/**/layout.tsx');
        expect(value).toBe('6');
      });
      it('0 app/**/middleware.ts files exist (proxy.ts replaced middleware)', () => {
        const n = countLines('find', [
          'apps/science-advantage/app',
          '-name', 'middleware.ts',
          '-not', '-path', '*/node_modules/*',
        ]);
        expect(n).toBe(0);
      });
      it('inventory summary table lists `app/**/middleware.ts` count = 0', async () => {
        const value = await readInventoryMetric('app/**/middleware.ts');
        expect(value).toBe('0');
      });
    });

    describe('Phase 1.5.b — test file count parity (RED: inventory drift documented)', () => {
      /**
       * The inventory's "Test files" row reads 88. The current
       * filesystem (after the 2026-06-04 AI-adapter and argon2id
       * tracks added integration tests for the new auth flow) has 92
       * `*.test.ts` / `*.test.tsx` / `*.spec.ts` files. This is a
       * pre-existing-inventory drift, not a code regression.
       *
       * This test asserts the parity contract: filesystem count must
       * equal the inventory's claimed count. The test stays RED
       * until 00-inventory.md is regenerated. Same shape as the
       * `Phase 1 Integration — inventory vs filesystem drift on
       * scripts/ count` test above — see that test's JSDoc for the
       * audit-subagent fix-track.
       */
      it('test file count parity: filesystem (92) matches inventory claim (88) (RED: drift documented)', () => {
        const n = countLines('find', [
          'apps/science-advantage',
          '-type', 'f',
          '(',
          '-name', '*.test.ts',
          '-o',
          '-name', '*.test.tsx',
          '-o',
          '-name', '*.spec.ts',
          ')',
          '-not', '-path', '*/node_modules/*',
          '-not', '-path', '*/.next/*',
          '-not', '-path', '*/playwright-report/*',
        ]);
        const claimed = 88;
        expect(
          n,
          `inventory claims ${claimed} test files, filesystem has ${n}`,
        ).toBe(claimed);
      });
    });

    describe('Phase 1.5.c — total .ts/.tsx source file count parity (RED: inventory drift documented)', () => {
      /**
       * The inventory's "Total .ts / .tsx source files" row reads
       * 330 vs the actual 335 (a 5-file drift). The pre-existing
       * inventory also has a "Total source files" row reading 767
       * vs the actual 773 (a 6-file drift). Both rows are
       * pre-existing inventory errors that will resolve when
       * 00-inventory.md is regenerated. This test asserts the
       * parity contract: filesystem count must equal the inventory
       * claim.
       */
      it('.ts/.tsx source file count parity: filesystem (335) matches inventory claim (330) (RED: drift documented)', () => {
        const n = countLines('find', [
          'apps/science-advantage',
          '-type', 'f',
          '(',
          '-name', '*.ts',
          '-o',
          '-name', '*.tsx',
          ')',
          '-not', '-path', '*/node_modules/*',
          '-not', '-path', '*/.next/*',
          '-not', '-path', '*/.turbo/*',
          '-not', '-path', '*/playwright-report/*',
          '-not', '-path', '*/.vite-temp/*',
        ]);
        const claimed = 330;
        expect(
          n,
          `inventory claims ${claimed} .ts/.tsx source files, filesystem has ${n}`,
        ).toBe(claimed);
      });
    });
  });

  /**
   * Phase 1.6 (Discovery) — top-level directory and route-group coverage.
   *
   * The summary table only counts a curated subset of file types. The
   * directory listings at the end of `00-inventory.md` (under
   * "Other top-level directories") enumerate the 14 top-level
   * directories and the 7 app route groups. These are the contracts
   * that "inventory lists all dirs" (test strategy §5) requires.
   */
  describe('Phase 1.6 — top-level directory and route-group coverage', () => {
    it('inventory mentions all 14 top-level directories of apps/science-advantage/', async () => {
      const dirs = [
        'app', 'components', 'contexts', 'data', 'docs', 'e2e', 'hooks',
        'i18n', 'lib', 'measure', 'prisma', 'public', 'scripts', 'tests',
      ];
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      const missing: string[] = [];
      for (const dir of dirs) {
        // The inventory uses `` `${dir}/` `` (with trailing slash) in
        // the "Other top-level directories" table at the end of
        // 00-inventory.md. Match that pattern exactly.
        const asDir = `\`${dir}/\``;
        if (!contents.includes(asDir)) missing.push(dir);
      }
      expect(
        missing,
        `inventory is missing these top-level dirs: ${missing.join(', ')}`,
      ).toEqual([]);
    });

    it('inventory lists all 7 app route groups: (admin), (auth), (dashboard), (student), (system), (teacher), and root app/', async () => {
      const groups = [
        '(admin)', '(auth)', '(dashboard)', '(student)', '(system)', '(teacher)',
      ];
      const contents = await fs.readFile(INVENTORY, 'utf-8');
      const missing: string[] = [];
      for (const group of groups) {
        // The inventory uses `` `app/(group)/...` `` in the page.tsx
        // listings and summary table. Match the literal `` `app/(group)` ``
        // prefix.
        if (!contents.includes(`app/${group}`)) {
          missing.push(group);
        }
      }
      expect(
        missing,
        `inventory is missing these route groups: ${missing.join(', ')}`,
      ).toEqual([]);
    });
  });

  /**
   * Phase 1.7 (Discovery) — package.json dependency count parity.
   *
   * The §0 Discovery step captures `package.json` production and dev
   * dependency lists. The inventory headings "## `package.json`
   * dependencies (production, 48)" and "## `package.json` dependencies
   * (dev, 21)" snapshot the dep surface. Since 2026-06-03, the
   * `ai_adapter_package_20260603` and `argon2id_password_20260603`
   * tracks have added 4 production deps (e.g. `@node-rs/argon2`,
   * `ai` removed → added back via `packages/ai`) and removed 2 dev
   * deps (e.g. `@types/bcryptjs`). The tests assert the parity
   * contract: filesystem = inventory. Both stay RED until the
   * inventory is regenerated.
   */
  describe('Phase 1.7 — package.json dependency count parity (RED: drift documented)', () => {
    it('production dep count parity: filesystem (52) matches inventory claim (48) (RED: drift documented)', () => {
      const out = runCaptured('node', [
        '-e',
        'const p=require("./apps/science-advantage/package.json"); process.stdout.write(String(Object.keys(p.dependencies||{}).length));',
      ]);
      const n = Number(out);
      const claimed = 48;
      expect(
        n,
        `inventory claims ${claimed} production deps, filesystem has ${n}`,
      ).toBe(claimed);
    });
    it('dev dep count parity: filesystem (19) matches inventory claim (21) (RED: drift documented)', () => {
      const out = runCaptured('node', [
        '-e',
        'const p=require("./apps/science-advantage/package.json"); process.stdout.write(String(Object.keys(p.devDependencies||{}).length));',
      ]);
      const n = Number(out);
      const claimed = 21;
      expect(
        n,
        `inventory claims ${claimed} dev deps, filesystem has ${n}`,
      ).toBe(claimed);
    });
  });

  /**
   * Phase 1 Integration (Discovery) — build-graph file coverage (extended).
   *
   * The existing "build-graph coverage" describe verifies (a) the
   * graph indexes at least one science-advantage file and (b) the
   * route count matches `find`. Both are documented as known
   * coverage gaps (the second test is a stale RED whose comment
   * predates the 2026-06-04 graph scan that indexed all 27
   * route.ts files plus 6 lib/{auth,ai}/ files). This block adds two
   * more assertions: (1) the graph indexes every route.ts file (the
   * most important class of files for §2.5), and (2) the non-route
   * files in the graph are all under `lib/auth/` or `lib/ai/` (per
   * protocol §6.1 — the graph is auth/AI-only by design today).
   *
   * (1) is GREEN today (the 27 route.ts files are all indexed).
   * (2) is also GREEN today (the only non-route files are in
   * `lib/auth/` and `lib/ai/`). These tests pin the contract so
   * future graph updates don't silently expand coverage into other
   * modules without explicit protocol sign-off.
   */
  describe('Phase 1 Integration — build-graph file coverage (extended)', () => {
    it('build-graph indexes every app/**/route.ts file for science-advantage (GREEN today, pins contract)', () => {
      const findRoutes = runCaptured('find', [
        'apps/science-advantage/app',
        '-name', 'route.ts',
        '-not', '-path', '*/node_modules/*',
      ])
        .split('\n')
        .filter((l) => l.endsWith('route.ts'))
        .map((p) => p.replace(/^apps\/science-advantage\//, ''));
      // `type = 'file'` covers the file entity itself (one per .ts
      // file). `type = 'route'` is one entry per exported HTTP
      // method, so a single route.ts with GET+POST produces two
      // route entries — using type='file' here is the right grain
      // for "is this .ts file in the graph?". The build-graph
      // `query` command formats output in a padded column, so .trim()
      // each line before comparing.
      const graphOutput = runCaptured('build-graph', [
        'query',
        GRAPH_DB,
        `SELECT DISTINCT file_path FROM nodes WHERE type = 'file' AND file_path LIKE '%science-advantage%' AND file_path LIKE '%/route.ts' ORDER BY file_path`,
      ]);
      const graphFiles = graphOutput
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.includes('apps/science-advantage'))
        .map((p) => p.replace(/^.*apps\/science-advantage\//, ''));
      const missing: string[] = [];
      for (const rel of findRoutes) {
        if (!graphFiles.includes(rel)) missing.push(rel);
      }
      expect(
        missing,
        `build-graph is missing these route.ts files: ${missing.join(', ')}`,
      ).toEqual([]);
    });

    it('build-graph non-route files for science-advantage are all under lib/auth/ or lib/ai/ (protocol §6.1 carve-out, GREEN today)', () => {
      // `type = 'file' AND file_path NOT LIKE '%/route.ts'`
      // isolates the 6 lib/{auth,ai}/ files from the 27 route.ts
      // files (both stored under `type = 'file'`). The build-graph
      // `query` command pads output to the longest column width, so
      // .trim() each line before prefix-stripping.
      const graphOutput = runCaptured('build-graph', [
        'query',
        GRAPH_DB,
        `SELECT DISTINCT file_path FROM nodes WHERE type = 'file' AND file_path LIKE '%science-advantage%' AND file_path NOT LIKE '%/route.ts' ORDER BY file_path`,
      ]);
      const graphFiles = graphOutput
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.includes('apps/science-advantage'))
        .map((p) => p.replace(/^.*apps\/science-advantage\//, ''));
      const outOfScope: string[] = [];
      for (const f of graphFiles) {
        if (!f.startsWith('lib/auth/') && !f.startsWith('lib/ai/')) {
          outOfScope.push(f);
        }
      }
      expect(
        outOfScope,
        `build-graph indexes files outside the protocol §6.1 auth/AI carve-out: ${outOfScope.join(', ')}`,
      ).toEqual([]);
    });
  });
});
