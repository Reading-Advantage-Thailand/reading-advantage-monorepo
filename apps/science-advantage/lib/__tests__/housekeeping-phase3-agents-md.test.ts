/**
 * Adversarial closure tests for `housekeeping_batch_20260603` Phase 3
 * (Update `apps/science-advantage/AGENTS.md` — F-1102).
 *
 * The Phase 3 contract (per `measure/tracks/housekeeping_batch_20260603/plan.md`):
 *   1. Remove all references to `prisma`, `next-auth`, `npx prisma …`,
 *      `npm install`, `npm run …` from `apps/science-advantage/AGENTS.md`.
 *   2. Add a header note: "This file documents app-specific deviations
 *      from the monorepo `AGENTS.md`. For shared conventions (auth,
 *      packages, CI), see the monorepo root."
 *   3. Update the test section to reference `pnpm test` (not `npm run test`).
 *      **Already satisfied at HEAD** — the Testing Guidelines section
 *      (line 40) already uses `pnpm test`. No Red test for this task;
 *      documented in `plan.md` Phase 3 §3 as "already satisfied at HEAD".
 *   4. Verify the file is consistent with the actual `package.json` scripts
 *      (no references to scripts that do not exist).
 *
 * Coordination note with Phase 1 (F-205):
 *   The Phase 1 regression-guard note (line 3, captured in
 *   `housekeeping-phase1-relocate-prisma.test.ts` §5.2) intentionally
 *   references the legacy `prisma/` path to forbid its re-emergence.
 *   The Phase 3 contract says "remove all `prisma` references", but
 *   removing `prisma` from line 3 would break the Phase 1 §5.2 test.
 *   This test file therefore pins the contract as: "only the Phase-1
 *   regression-guard note may reference `prisma`; every other reference
 *   in the body of the file is a Phase-3 violation." The implementer
 *   should leave line 3 untouched and clean up lines 26, 32, 36, 70.
 *
 * The SUT is the AGENTS.md file (text artifact, no DB, no server).
 * Tests shell out to `rg` for ground truth and to `fs.readFile` for
 * content assertions. Tests are unit-level — no DB, no Next.js server.
 *
 * See: measure/tracks/housekeeping_batch_20260603/plan.md (Phase 3)
 *      measure/tracks/housekeeping_batch_20260603/test-strategy.md
 *      apps/science-advantage/lib/__tests__/housekeeping-phase1-relocate-prisma.test.ts
 */
import fsp from 'fs/promises';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { describe, it, expect } from 'vitest';

const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();
const APP_DIR = path.join(MONOREPO_ROOT, 'apps/science-advantage');
const AGENTS_MD = path.join(APP_DIR, 'AGENTS.md');
const PACKAGE_JSON = path.join(APP_DIR, 'package.json');

function runCaptured(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    cwd: MONOREPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  // `rg` returns exit 1 on no matches (a "success" in audit terms —
  // the rule is satisfied). We allow 0/1; everything else throws.
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `Command failed (${result.status}): ${command} ${args.join(' ')}\n${result.stderr}`,
    );
  }
  return (result.stdout ?? '').trim();
}

function rgHits(pattern: string, pathArg: string, extraArgs: string[] = []): string[] {
  const out = runCaptured('rg', ['-n', pattern, pathArg, ...extraArgs]);
  if (out === '') return [];
  return out.split('\n').filter((l) => l.length > 0);
}

describe('housekeeping_batch_20260603 / Phase 3 — Update apps/science-advantage/AGENTS.md (F-1102)', () => {
  describe('§1 — No prisma references in the body of AGENTS.md (regression-guard note at line 3 is allowed)', () => {
    /**
     * The Phase 1 regression-guard note (line 3) intentionally contains
     * the word `prisma` to forbid re-emergence of the legacy directory.
     * The Phase 1 test pins its presence. Phase 3 must clean up every
     * OTHER prisma reference in the file.
     */
    it('§1.1 — the only line in AGENTS.md that references `prisma` is the Phase-1 regression-guard note (line 3)', async () => {
      const contents = await fsp.readFile(AGENTS_MD, 'utf-8');
      const lines = contents.split('\n');
      // The regression-guard note occupies one or more consecutive
      // blockquote lines starting with `> **Regression guard`. Find
      // the start line and the end line (last blockquote line in the
      // contiguous run) and exclude that range.
      let guardStart = -1;
      let guardEnd = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trimStart().startsWith('> **Regression guard')) {
          guardStart = i;
          let j = i;
          while (j < lines.length && lines[j].trimStart().startsWith('>')) j++;
          guardEnd = j - 1;
          break;
        }
      }
      expect(
        guardStart,
        'Phase 1 regression-guard note must still be present (Phase 1 §5.2 contract)',
      ).toBeGreaterThanOrEqual(0);
      const bodyLines = [...lines.slice(0, guardStart), ...lines.slice(guardEnd + 1)];
      const body = bodyLines.join('\n');
      const bodyHits = body.match(/\bprisma\b/gi) ?? [];
      expect(
        bodyHits.length,
        `body of AGENTS.md should contain 0 \`prisma\` references (regression-guard is allowed on line ${guardStart + 1}); found ${bodyHits.length}: ${bodyHits.join(', ')}`,
      ).toBe(0);
    });

    it('§1.2 — `rg -n "prisma" apps/science-advantage/AGENTS.md` returns exactly 1 line (the regression-guard note)', () => {
      // The targeted Red command from test-strategy.md
      // (`rg -n 'prisma|next-auth|npx prisma|npm install' ...`) is
      // broader than the F-1102 contract. The narrower check here
      // pins the prisma-only count so the regression-guard note
      // does not get caught in the cross-cutting "remove prisma"
      // sweep.
      const lines = rgHits('prisma', AGENTS_MD);
      expect(
        lines.length,
        `expected exactly 1 prisma reference in AGENTS.md (the regression-guard note); got ${lines.length}: ${lines.join(', ')}`,
      ).toBe(1);
      expect(lines[0], 'the surviving prisma reference must be on line 3').toMatch(/^3:/);
      expect(lines[0], 'the surviving prisma reference must be the regression-guard note').toMatch(
        /Regression guard/,
      );
    });
  });

  describe('§2 — No next-auth / NextAuth references in AGENTS.md', () => {
    /**
     * Spec FR-2 / F-1102: "Remove all references to … `next-auth` …".
     * The current file references "NextAuth" (case-insensitive match) on
     * line 78 in the "Environment & Security Tips" section. The monorepo
     * is on a first-party username/password auth adapter; the NextAuth
     * reference is stale.
     */
    it('§2.1 — `rg -ni "next-auth|NextAuth" apps/science-advantage/AGENTS.md` returns 0 matches', () => {
      const lines = rgHits('next-auth|NextAuth', AGENTS_MD, ['-i']);
      expect(
        lines,
        `expected 0 next-auth/NextAuth references in AGENTS.md; found ${lines.length}: ${lines.join(', ')}`,
      ).toEqual([]);
    });
  });

  describe('§3 — No `npx prisma` references in AGENTS.md', () => {
    /**
     * Spec FR-2 / F-1102: "Remove all references to `npx prisma …`".
     * The current file references `npx prisma generate`, `npx prisma db
     * push`, and `npx prisma db seed` on line 32. Drizzle is the
     * source of truth; no Prisma CLI commands belong in app docs.
     */
    it('§3.1 — `rg -n "npx prisma" apps/science-advantage/AGENTS.md` returns 0 matches', () => {
      const lines = rgHits('npx prisma', AGENTS_MD);
      expect(
        lines,
        `expected 0 \`npx prisma\` references in AGENTS.md; found ${lines.length}: ${lines.join(', ')}`,
      ).toEqual([]);
    });
  });

  describe('§4 — No `npm install` references in AGENTS.md', () => {
    /**
     * Spec FR-2 / F-1102: "Remove all references to `npm install`".
     * The monorepo uses pnpm; `npm install` is the wrong tool.
     */
    it('§4.1 — `rg -n "npm install" apps/science-advantage/AGENTS.md` returns 0 matches', () => {
      const lines = rgHits('npm install', AGENTS_MD);
      expect(
        lines,
        `expected 0 \`npm install\` references in AGENTS.md; found ${lines.length}: ${lines.join(', ')}`,
      ).toEqual([]);
    });
  });

  describe('§5 — No `npm run` references in AGENTS.md', () => {
    /**
     * Spec FR-2 / F-1102: "Remove all references to `npm run …`".
     * The monorepo uses pnpm; `npm run <script>` is the wrong tool.
     */
    it('§5.1 — `rg -n "npm run" apps/science-advantage/AGENTS.md` returns 0 matches', () => {
      const lines = rgHits('npm run', AGENTS_MD);
      expect(
        lines,
        `expected 0 \`npm run\` references in AGENTS.md; found ${lines.length}: ${lines.join(', ')}`,
      ).toEqual([]);
    });
  });

  describe('§6 — Deviation header note is present', () => {
    /**
     * Spec FR-2 / F-1102: "Add a header note: 'This file documents
     * app-specific deviations from the monorepo `AGENTS.md`. For
     * shared conventions (auth, packages, CI), see the monorepo root.'"
     */
    it('§6.1 — AGENTS.md contains the deviation-from-monorepo header note', async () => {
      const contents = await fsp.readFile(AGENTS_MD, 'utf-8');
      // The header note is a blockquote that appears in the first 30
      // lines of the file (above the existing section headings). Pin
      // the exact phrasing required by the spec.
      const head = contents.slice(0, contents.indexOf('\n## ') === -1 ? 4000 : 4000);
      expect(
        head,
        'AGENTS.md should contain the deviation-from-monorepo header note (spec FR-2 / F-1102)',
      ).toMatch(/app-specific deviations from the monorepo `?AGENTS\.md`?/);
      expect(head, 'header note should reference the monorepo root').toMatch(/monorepo root/);
    });

    it('§6.2 — the deviation note is in a blockquote and appears before the first `##` heading', async () => {
      const contents = await fsp.readFile(AGENTS_MD, 'utf-8');
      // Find the first `##` heading.
      const firstHeading = contents.indexOf('\n## ');
      expect(firstHeading, 'AGENTS.md should contain at least one `##` heading').toBeGreaterThan(-1);
      // The note should be a blockquote (starts with `>`) and located
      // before the first heading.
      const head = contents.slice(0, firstHeading);
      const noteLine = head
        .split('\n')
        .find((l) => /app-specific deviations from the monorepo/.test(l));
      expect(
        noteLine,
        'deviation note must appear before the first `##` heading',
      ).toBeDefined();
      expect(
        noteLine!.trimStart().startsWith('>'),
        'deviation note must be a blockquote (start with `>`)',
      ).toBe(true);
    });
  });

  describe('§7 — File is consistent with actual package.json scripts', () => {
    /**
     * Spec FR-2 / F-1102: "Verify the file is consistent with the actual
     * `package.json` scripts." The current file references
     * `npm run deploy:staging` and `npm run deploy:production`, neither
     * of which exist in `apps/science-advantage/package.json`. Pin the
     * contract: no script reference in AGENTS.md may name a script that
     * does not exist in package.json.
     */
    it('§7.1 — every `pnpm <script>` or `npm run <script>` reference in AGENTS.md names an actual package.json script', async () => {
      const pkgRaw = await fsp.readFile(PACKAGE_JSON, 'utf-8');
      const pkg = JSON.parse(pkgRaw) as {
        scripts?: Record<string, string>;
      };
      const scripts = new Set(Object.keys(pkg.scripts ?? {}));

      const contents = await fsp.readFile(AGENTS_MD, 'utf-8');
      // Collect all `pnpm <script>` and `npm run <script>` invocations
      // (case-insensitive, word-boundary). Exclude `pnpm install`,
      // `pnpm exec`, `pnpm add`, `pnpm --filter`, and `pnpm -F` —
      // these are workspace-level commands, not script names.
      const invocationRegex = /\b(?:pnpm\s+(?!install\b|exec\b|add\b|--filter\b|-F\b)([\w:-]+)|npm\s+run\s+([\w:-]+))\b/g;
      const bad: string[] = [];
      let m: RegExpExecArray | null;
      while ((m = invocationRegex.exec(contents)) !== null) {
        const script = m[1] ?? m[2];
        if (!script) continue;
        if (scripts.has(script)) continue;
        bad.push(`${m[0]} (not in package.json scripts)`);
      }
      expect(
        bad,
        `AGENTS.md references scripts not in package.json: ${bad.join('; ')}`,
      ).toEqual([]);
    });

    it('§7.2 — no reference to `deploy:staging` or `deploy:production` (scripts do not exist in package.json)', () => {
      const lines = rgHits('deploy:staging|deploy:production', AGENTS_MD);
      expect(
        lines,
        `expected 0 references to deploy:staging/deploy:production; found ${lines.length}: ${lines.join(', ')}`,
      ).toEqual([]);
    });
  });

  describe('§8 — Phase 1 regression-guard note is preserved (cross-track coordination)', () => {
    /**
     * Cross-track coordination: Phase 1 (F-205) pins the regression-guard
     * note via `housekeeping-phase1-relocate-prisma.test.ts` §5.2. Phase
     * 3 must preserve that note. The §1 tests above already pin the
     * single-line allowance; this section pins the exact phrasing.
     */
    it('§8.1 — line 3 still contains the F-205 regression-guard note (Phase 1 §5.2 contract)', async () => {
      const contents = await fsp.readFile(AGENTS_MD, 'utf-8');
      expect(
        contents,
        'Phase 1 regression-guard note must be preserved (Phase 1 §5.2)',
      ).toMatch(/Regression guard.*prisma.*must not exist/s);
    });
  });
});
