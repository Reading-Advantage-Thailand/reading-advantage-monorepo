/**
 * Adversarial closure tests for `housekeeping_batch_20260603` Phase 9
 * (Add `commitlint` Config — F-1301).
 *
 * The Phase 9 contract (per
 * `measure/tracks/housekeeping_batch_20260603/plan.md` Phase 9 and
 * `spec.md` FR-9):
 *   1. Add `@commitlint/cli` + `@commitlint/config-conventional` +
 *      `husky` to the monorepo root `devDependencies` (and run the
 *      husky prepare step so `.husky/` is initialized).
 *   2. Create `commitlint.config.js` at the monorepo root that extends
 *      `@commitlint/config-conventional` and overrides the
 *      `subject-pattern` rule so non-chore commit subjects MUST include
 *      a `track_id: <name>_<YYYYMMDD>` reference.
 *   3. Wire the config into a `commit-msg` husky hook at
 *      `.husky/commit-msg` so every new commit is validated.
 *   4. Reject: `git commit -m "feat(science): add a new feature"` (no
 *      track ID) — must be rejected (commitlint exits non-zero).
 *   5. Accept: `git commit -m "feat(science): add a new feature (track_id: mytrack_20260603)"` — accepted (exit 0).
 *   6. Document in root `AGENTS.md` that the rule applies to new
 *      commits; historical commits are not affected.
 *
 * Background / pre-state at HEAD (commit `b94f900a` + Phase 6/7/8
 * Green commits; `git log --oneline | head -5` to confirm):
 *   - `commitlint.config.js` does NOT exist at the monorepo root
 *     (verified `ls commitlint.config.js` → No such file or directory).
 *   - `.husky/` directory does NOT exist (no husky initialized).
 *   - Root `package.json` does NOT include `@commitlint/cli`,
 *     `@commitlint/config-conventional`, or `husky` in
 *     `devDependencies` (verified `grep -n "@commitlint\|husky"
 *     package.json` → no output).
 *   - Root `AGENTS.md` does NOT mention commitlint or track_id (only
 *     a Measure-style `track_id` mention in the track-reference doc,
 *     which is a different concept).
 *   - No `prepare` script in root `package.json` for husky.
 *   - `build-graph search "commitlint"` and `build-graph search "husky"`
 *     return no results — confirms Phase 9 is purely additive (no
 *     symbol blast radius from prior phases).
 *
 * Test strategy / scope decisions:
 *   - Section 1 pins the `commitlint.config.js` file presence.
 *   - Section 2 pins the config's content shape: extends
 *     `@commitlint/config-conventional`, defines a `subject-pattern`
 *     rule, and the level/applicability tuple is `[2, 'always', …]`
 *     (commitlint rule format: level 2 = error, applicability
 *     `always` = enforce on every commit).
 *   - Section 3 extracts the `subject-pattern` regex literal from the
 *     config file (text-scraped, not `require`d) and asserts the
 *     STATIC behavior: a message without a track_id does NOT match,
 *     while a message with `track_id: foo_20260603` DOES match.
 *     This is the live-behavior proof that works WITHOUT the
 *     commitlint binary being installed (the contract is in the
 *     regex, not the tool). If the Implementer uses the literal
 *     regex from plan.md (which has `?` quantifiers making the
 *     track-id capture group optional), §3.2 will FAIL, forcing them
 *     to tighten the regex. See §3.2 commentary below.
 *   - Section 4 pins the husky `commit-msg` hook: file exists, is
 *     executable (mode bit check), and invokes commitlint on the
 *     staged commit message (`$1` or `${1}` arg).
 *   - Section 5 pins the root `package.json` devDependencies:
 *     `@commitlint/cli`, `@commitlint/config-conventional`, `husky`,
 *     plus a `prepare` script so `husky init` is reproducible.
 *   - Section 6 pins the root `AGENTS.md` note documenting the
 *     new-commits-only scope.
 *   - Section 7 is an OPTIONAL live-behavior gate: if the commitlint
 *     binary is present (via `pnpm exec commitlint` or
 *     `./node_modules/.bin/commitlint`), it shells out and verifies
 *     that the actual tool rejects a no-track-id message and accepts
 *     a with-track-id message. This is the bounded-live proof from
 *     test-strategy.md Phase 9. The test SKIPS (not fails) when the
 *     binary is absent — the static §3.2 + §3.3 contract is
 *     sufficient to prove the implementer wired it correctly, and
 *     the full live run is owned by Phase 11 final acceptance.
 *
 * Fake-harness policy: this test does NOT introduce a fake
 * commitlint binary. The live-behavior section uses the real
 * `pnpm exec commitlint` (or `./node_modules/.bin/commitlint`) only
 * when the binary exists on disk; otherwise the static regex
 * extraction in §3 is the authoritative gate. No mock test can
 * accidentally run a broader suite.
 *
 * Test fixtures: NONE on disk. All inputs are inline commit-message
 * strings; the test is hermetic. No files are created or modified.
 *
 * Run via the unit config (no DB):
 *
 *   cd apps/science-advantage && \
 *     /opt/codex-desktop/resources/node-runtime/bin/node \
 *       ./node_modules/vitest/vitest.mjs run \
 *         --config vitest.unit.config.ts \
 *         lib/__tests__/housekeeping-phase9-commitlint-config.test.ts
 *
 * See: measure/tracks/housekeeping_batch_20260603/plan.md (Phase 9)
 *      measure/tracks/housekeeping_batch_20260603/test-strategy.md
 *      measure/audit-reports/science-advantage_20260603/findings.md
 *        (F-1301)
 *      apps/science-advantage/lib/__tests__/housekeeping-phase8-adr-directory.test.ts
 *        (precedent for shell-out + content-presence tests)
 */
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import { describe, it, expect } from 'vitest';

const MONOREPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim();
const COMMITLINT_CONFIG = path.join(MONOREPO_ROOT, 'commitlint.config.js');
const COMMITLINT_CONFIG_ALT_CJS = path.join(
  MONOREPO_ROOT,
  'commitlint.config.cjs',
);
const HUSKY_COMMIT_MSG = path.join(MONOREPO_ROOT, '.husky/commit-msg');
const ROOT_PACKAGE_JSON = path.join(MONOREPO_ROOT, 'package.json');
const ROOT_AGENTS_MD = path.join(MONOREPO_ROOT, 'AGENTS.md');

/**
 * Run a command from the monorepo root. Returns stdout/stderr/status.
 * Throws on spawn errors; callers inspect `status` for non-zero exits.
 */
function runCaptured(
  command: string,
  args: string[]
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, {
    cwd: MONOREPO_ROOT,
    encoding: 'utf-8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * Read the commitlint config file. Accepts either `commitlint.config.js`
 * (preferred; matches plan.md task 2) or `commitlint.config.cjs` (an
 * acceptable alternative for projects that standardize on `.cjs`).
 * Throws when neither exists.
 */
async function readCommitlintConfig(): Promise<string> {
  for (const candidate of [COMMITLINT_CONFIG, COMMITLINT_CONFIG_ALT_CJS]) {
    try {
      return await fsp.readFile(candidate, 'utf-8');
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    `commitlint config not found at ${COMMITLINT_CONFIG} (or .cjs alt)`,
  );
}

/**
 * Extract the `subject-pattern` regex literal from the config file
 * text. The expected shape is:
 *
 *   'subject-pattern': [2, 'always', /<regex>/],
 *
 * The regex literal is scraped as the substring between the last
 * `/` opening delimiter and the closing `/` flag-less delimiter that
 * precedes the `]` (or `,` for non-final entries). We deliberately
 * use a non-greedy match scoped to the rule's value-array slice so
 * we don't capture slashes from unrelated parts of the file.
 *
 * Returns a `RegExp` reconstructed via `new RegExp(source)` (no flags
 * since commitlint's `subject-pattern` rule is unanchored-multiline
 * agnostic and the plan.md example uses no flags).
 *
 * Throws when no regex literal is found in the `subject-pattern`
 * rule's value tuple.
 */
function extractSubjectPatternRegex(configText: string): RegExp {
  // Locate the subject-pattern key and the opening `[` of its value
  // array, then the matching `]`. We use a simple bracket-counter
  // pass starting from the first `[` after `subject-pattern`.
  const keyMatch = configText.match(/['"]?subject-pattern['"]?\s*:\s*\[/);
  if (!keyMatch || keyMatch.index === undefined) {
    throw new Error(
      `commitlint config does not contain a 'subject-pattern' rule`,
    );
  }
  const arrayStart = keyMatch.index + keyMatch[0].length;
  let depth = 1;
  let arrayEnd = -1;
  for (let i = arrayStart; i < configText.length; i += 1) {
    const ch = configText[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) {
    throw new Error(
      `commitlint config 'subject-pattern' rule has unbalanced brackets`,
    );
  }
  const valueSlice = configText.slice(arrayStart, arrayEnd);

  // Pull the regex literal — last `/.../` substring in the value
  // slice that does not contain an unescaped `/` inside a character
  // class. We anchor on the first `/` of the regex body.
  const regexMatch = valueSlice.match(/\/((?:\\\/|[^/\n])+)\/([gimsuy]*)/);
  if (!regexMatch) {
    throw new Error(
      `commitlint config 'subject-pattern' rule value is not a regex literal: ${valueSlice}`,
    );
  }
  const [, source, flags] = regexMatch;
  return new RegExp(source, flags);
}

describe('housekeeping_batch_20260603 / Phase 9 — Add `commitlint` Config (F-1301)', () => {
  describe('§1 — `commitlint.config.js` exists at the monorepo root', () => {
    /**
     * FR-9 / Phase 9 task 2: the config file must live at the
     * monorepo root so commitlint's default resolution finds it.
     * At HEAD the file is absent (target absent). The test pins
     * the file's presence — either `.js` (preferred per plan.md)
     * or `.cjs` (acceptable alternative for CJS-strict projects).
     */
    it('§1.1 — commitlint.config.js (or .cjs) exists at the monorepo root', async () => {
      let stat: fs.Stats | null = null;
      let foundPath: string | null = null;
      for (const candidate of [COMMITLINT_CONFIG, COMMITLINT_CONFIG_ALT_CJS]) {
        try {
          stat = await fsp.stat(candidate);
          foundPath = candidate;
          break;
        } catch {
          // try next candidate
        }
      }
      if (!stat || !foundPath) {
        throw new Error(
          `expected commitlint config to exist at ${COMMITLINT_CONFIG} (or .cjs alt); stat failed (target absent at HEAD)`,
        );
      }
      expect(stat.isFile()).toBe(true);
    });
  });

  describe('§2 — `commitlint.config.js` extends config-conventional and defines a `subject-pattern` rule', () => {
    /**
     * FR-9 / Phase 9 task 2 content pins:
     *   - The config `extends` `@commitlint/config-conventional` so the
     *     standard type-enum / scope rules still apply.
     *   - The config defines a `subject-pattern` rule in the shape
     *     `[<level>, 'always', <regex>]`. Level 2 = error;
     *     applicability `always` = enforce on every commit.
     *
     * These assertions guard against the Implementer shipping a
     * config that drops the conventional base (which would regress
     * the repo's commit-message discipline) or accidentally setting
     * the rule to `never` / `0` (which would make it a no-op).
     */
    it('§2.1 — extends `@commitlint/config-conventional`', async () => {
      const text = await readCommitlintConfig();
      expect(
        text,
        `expected commitlint config to extend @commitlint/config-conventional`,
      ).toMatch(/extends\s*:\s*\[[^\]]*['"]@commitlint\/config-conventional['"]/);
    });

    it('§2.2 — defines a `subject-pattern` rule at level 2 with applicability `always`', async () => {
      const text = await readCommitlintConfig();
      const ruleMatch = text.match(
        /['"]?subject-pattern['"]?\s*:\s*\[\s*(\d+)\s*,\s*['"]([^'"]+)['"]\s*,/,
      );
      expect(
        ruleMatch,
        `expected commitlint config to define 'subject-pattern' as [level, applicability, regex]; got no match in:\n${text}`,
      ).not.toBeNull();
      if (!ruleMatch) return;
      const [, level, applicability] = ruleMatch;
      expect(
        Number(level),
        `expected subject-pattern level to be 2 (error); got ${level}`,
      ).toBe(2);
      expect(
        applicability,
        `expected subject-pattern applicability to be 'always'; got '${applicability}'`,
      ).toBe('always');
    });
  });

  describe('§3 — extracted `subject-pattern` regex enforces track-id on non-chore commits', () => {
    /**
     * FR-9 / Phase 9 task 2 + tasks 4–5: the static proof that the
     * rule actually rejects a no-track-id message and accepts a
     * with-track-id message. We extract the regex literal from the
     * config text and apply it directly in JS — no commitlint
     * binary required.
     *
     * The plan.md example regex has `?` quantifiers on the
     * track-id group, which would make the rule permissive (both
     * messages would match). The Implementer MUST tighten the regex
     * (e.g., remove the `?` on the final capture group, or add a
     * mandatory terminator) so:
     *   - `feat(science): add a new feature` → does NOT match.
     *   - `feat(science): add a new feature (track_id: mytrack_20260603)` → DOES match.
     *
     * If the literal plan.md regex is shipped verbatim, §3.2 will
     * fail (the no-track-id message will incorrectly match), forcing
     * the Implementer to tighten the rule.
     */
    it('§3.1 — config file exposes an extractable subject-pattern regex', async () => {
      const text = await readCommitlintConfig();
      let regex: RegExp;
      try {
        regex = extractSubjectPatternRegex(text);
      } catch (err) {
        throw new Error(
          `failed to extract subject-pattern regex: ${(err as Error).message}`,
        );
      }
      expect(regex).toBeInstanceOf(RegExp);
    });

    it('§3.2 — subject-pattern regex REJECTS a non-chore commit without track_id', async () => {
      const text = await readCommitlintConfig();
      const regex = extractSubjectPatternRegex(text);
      const noTrackId = 'feat(science): add a new feature';
      const matches = regex.test(noTrackId);
      expect(
        matches,
        `expected subject-pattern regex to REJECT '${noTrackId}' (no track_id); ` +
          `it matched. The Implementer must tighten the regex so the track-id capture is mandatory for non-chore commits. ` +
          `Regex source: ${regex.source}`,
      ).toBe(false);
    });

    it('§3.3 — subject-pattern regex ACCEPTS a non-chore commit WITH track_id', async () => {
      const text = await readCommitlintConfig();
      const regex = extractSubjectPatternRegex(text);
      const withTrackId =
        'feat(science): add a new feature (track_id: mytrack_20260603)';
      const matches = regex.test(withTrackId);
      expect(
        matches,
        `expected subject-pattern regex to ACCEPT '${withTrackId}'; it did not match. ` +
          `Regex source: ${regex.source}`,
      ).toBe(true);
    });

    it('§3.4 — subject-pattern regex still accepts the ten conventional types', async () => {
      const text = await readCommitlintConfig();
      const regex = extractSubjectPatternRegex(text);
      // Each conventional type, with the plan.md's required track_id suffix
      const samples = [
        'feat(science): new feature (track_id: mytrack_20260603)',
        'fix(science): bug fix (track_id: mytrack_20260603)',
        'chore(measure): cleanup (track_id: mytrack_20260603)',
        'docs(science): doc edit (track_id: mytrack_20260603)',
        'refactor(science): rewrite (track_id: mytrack_20260603)',
        'test(science): add tests (track_id: mytrack_20260603)',
        'perf(science): speed up (track_id: mytrack_20260603)',
        'build(science): bump deps (track_id: mytrack_20260603)',
        'ci(science): tweak workflow (track_id: mytrack_20260603)',
        'style(science): prettier (track_id: mytrack_20260603)',
      ];
      for (const sample of samples) {
        expect(
          regex.test(sample),
          `expected subject-pattern regex to ACCEPT '${sample}'; it did not match. ` +
            `Regex source: ${regex.source}`,
        ).toBe(true);
      }
    });

    it('§3.5 — subject-pattern regex ALLOWS a chore commit WITHOUT track_id', async () => {
      const text = await readCommitlintConfig();
      const regex = extractSubjectPatternRegex(text);
      const choreNoTrackId = 'chore(root): update tooling';
      expect(
        regex.test(choreNoTrackId),
        `expected subject-pattern regex to ALLOW '${choreNoTrackId}' (chore is exempt per FR-9); ` +
          `it did not match. Regex source: ${regex.source}`,
      ).toBe(true);
    });
  });

  describe('§4 — `.husky/commit-msg` hook exists, is executable, and invokes commitlint', () => {
    /**
     * FR-9 / Phase 9 task 3: wire commitlint into a husky
     * `commit-msg` hook at `.husky/commit-msg`. The hook must:
     *   - exist as a regular file at `<monorepo-root>/.husky/commit-msg`.
     *   - be executable (owner-execute bit set; matches the precedent
     *     set by `scripts/ci/check-graph-db.sh` mode 100755).
     *   - invoke commitlint on the staged commit-message file. The
     *     convention is either:
     *       `pnpm exec commitlint --edit "$1"`, or
     *       `npx --no -- commitlint --edit ${1}`, or
     *       `./node_modules/.bin/commitlint --edit "$1"`.
     *     All three forms are accepted by this assertion; the
     *     Implementer may choose based on tooling preference.
     */
    it('§4.1 — `.husky/commit-msg` exists as a regular file', async () => {
      let stat: fs.Stats;
      try {
        stat = await fsp.stat(HUSKY_COMMIT_MSG);
      } catch {
        throw new Error(
          `expected ${HUSKY_COMMIT_MSG} to exist; stat failed (target absent at HEAD)`,
        );
      }
      expect(stat.isFile()).toBe(true);
    });

    it('§4.2 — `.husky/commit-msg` has the owner-execute bit set (mode & 0o100)', async () => {
      let stat: fs.Stats;
      try {
        stat = await fsp.stat(HUSKY_COMMIT_MSG);
      } catch {
        throw new Error(
          `expected ${HUSKY_COMMIT_MSG} to exist (cannot stat mode of missing file)`,
        );
      }
      const ownerExec = (stat.mode & 0o100) !== 0;
      expect(
        ownerExec,
        `expected ${HUSKY_COMMIT_MSG} to be executable (mode=${stat.mode.toString(8)}; expected owner-execute bit set, mirroring scripts/ci/check-graph-db.sh which is mode 100755)`,
      ).toBe(true);
    });

    it('§4.3 — `.husky/commit-msg` invokes commitlint on the commit message file', async () => {
      const contents = await fsp.readFile(HUSKY_COMMIT_MSG, 'utf-8');
      const invokesCommitlint =
        /\bcommitlint\b/.test(contents) &&
        /--edit\b|\$\{?1\}?|--file\b/.test(contents);
      expect(
        invokesCommitlint,
        `expected ${HUSKY_COMMIT_MSG} to invoke commitlint on the commit message file ` +
          `(matched patterns: 'commitlint' + '--edit' OR '$1' OR '--file'). ` +
          `Hook contents:\n${contents}`,
      ).toBe(true);
    });
  });

  describe('§5 — root `package.json` lists commitlint + husky and has a `prepare` script', () => {
    /**
     * FR-9 / Phase 9 task 1: the monorepo root `package.json` must
     * include the commitlint + husky devDependencies so the tool is
     * installable via `pnpm install`, AND must have a `prepare`
     * script so `husky init` is reproducible on a fresh clone (the
     * standard husky v9+ convention is `"prepare": "husky"`).
     *
     * This pins the install contract; the live install + husky init
     * is the Implementer's responsibility.
     */
    it('§5.1 — root package.json includes @commitlint/cli in devDependencies', async () => {
      const pkg = JSON.parse(await fsp.readFile(ROOT_PACKAGE_JSON, 'utf-8'));
      const devDeps = pkg.devDependencies ?? {};
      expect(
        Object.keys(devDeps),
        `expected root package.json devDependencies to include '@commitlint/cli'`,
      ).toContain('@commitlint/cli');
    });

    it('§5.2 — root package.json includes @commitlint/config-conventional in devDependencies', async () => {
      const pkg = JSON.parse(await fsp.readFile(ROOT_PACKAGE_JSON, 'utf-8'));
      const devDeps = pkg.devDependencies ?? {};
      expect(
        Object.keys(devDeps),
        `expected root package.json devDependencies to include '@commitlint/config-conventional'`,
      ).toContain('@commitlint/config-conventional');
    });

    it('§5.3 — root package.json includes husky in devDependencies', async () => {
      const pkg = JSON.parse(await fsp.readFile(ROOT_PACKAGE_JSON, 'utf-8'));
      const devDeps = pkg.devDependencies ?? {};
      expect(
        Object.keys(devDeps),
        `expected root package.json devDependencies to include 'husky'`,
      ).toContain('husky');
    });

    it('§5.4 — root package.json has a `prepare` script invoking husky', async () => {
      const pkg = JSON.parse(await fsp.readFile(ROOT_PACKAGE_JSON, 'utf-8'));
      const prepare = pkg.scripts?.prepare;
      expect(
        prepare,
        `expected root package.json to define a 'prepare' script invoking husky (the v9+ convention); got: ${JSON.stringify(prepare)}`,
      ).toMatch(/\bhusky\b/);
    });
  });

  describe('§6 — root `AGENTS.md` documents the new-commits-only scope of the rule', () => {
    /**
     * FR-9 / Phase 9 task 6: per test-strategy.md cross-phase edge
     * case #3 ("commitlint must NOT validate historical commits"),
     * the AGENTS.md must explicitly state the rule applies to new
     * commits and historical commits are not affected. This is a
     * contributor-facing guard so future readers do not assume a
     * retroactive sweep is needed.
     */
    it('§6.1 — root AGENTS.md mentions commitlint and the new-commits-only scope', async () => {
      const contents = await fsp.readFile(ROOT_AGENTS_MD, 'utf-8');
      const mentionsCommitlint = /\bcommitlint\b/i.test(contents);
      const mentionsNewCommits = /\bnew commits\b/i.test(contents);
      const mentionsHistorical = /\bhistorical commits?\b/i.test(contents);
      expect(
        mentionsCommitlint,
        `expected root AGENTS.md to mention 'commitlint'; not found`,
      ).toBe(true);
      expect(
        mentionsNewCommits || mentionsHistorical,
        `expected root AGENTS.md to clarify that the rule applies to NEW commits only ` +
          `(either 'new commits' or 'historical commits' phrasing); not found`,
      ).toBe(true);
    });
  });

  describe('§7 — optional live-behavior gate (skipped when commitlint binary is absent)', () => {
    /**
     * FR-9 / Phase 9 tasks 4–5 live proof (bounded per test-strategy.md
     * Phase 9 "Live-Proof Plan" row): run the actual `commitlint` CLI
     * on two canned commit-message strings:
     *   - echo "feat(science): no track ref" | pnpm exec commitlint
     *     → must exit non-zero (rejected).
     *   - echo "feat(science): x (track_id: housekeeping_batch_20260603)" | pnpm exec commitlint
     *     → must exit 0 (accepted).
     *
     * This section is OPTIONAL: when the binary is absent (which is
     * the state at HEAD, before the Implementer installs commitlint),
     * the whole describe is reported as `skipped` via `describe.runIf`.
     * The static §3 contract is sufficient to prove the Implementer
     * wired the regex correctly, so a skipped live gate is not a
     * false Red pass — it is a deliberate "no fake harness" design
     * choice (per test-strategy.md §Fake Harness Policy).
     *
     * Binary lookup order (matches the conventions in this repo):
     *   1. `./node_modules/.bin/commitlint` (preferred).
     *   2. `apps/science-advantage/node_modules/.bin/commitlint` (alt workspace install).
     *   3. `pnpm exec commitlint` (fallback; only if pnpm is on PATH).
     *
     * The test does NOT add the commitlint binary to the test
     * environment — the Implementer is responsible for installing
     * it. The static §3 proof is the authoritative Red→Green
     * contract; §7 is a belt-and-suspenders gate that activates only
     * after installation.
     */
    const localBinary = path.join(
      MONOREPO_ROOT,
      'node_modules/.bin/commitlint',
    );
    const localBinaryAlt = path.join(
      MONOREPO_ROOT,
      'apps/science-advantage/node_modules/.bin/commitlint',
    );

    function resolveCommitlintInvocation():
      | { command: string; argsPrefix: string[] }
      | null {
      // Check both common install locations for the binary.
      for (const candidate of [localBinary, localBinaryAlt]) {
        try {
          const stat = fs.statSync(candidate);
          if (stat.isFile()) {
            return { command: candidate, argsPrefix: [] };
          }
        } catch {
          // try next
        }
      }
      // Fall back to pnpm exec — but only if pnpm is on PATH (this
      // host lacks pnpm; the test must not fail just because pnpm
      // is missing).
      try {
        const which = runCaptured('which', ['pnpm']);
        if (which.status === 0) {
          return { command: 'pnpm', argsPrefix: ['exec', 'commitlint'] };
        }
      } catch {
        // which itself is unavailable; fall through to skip.
      }
      return null;
    }

    function runCommitlintOnMessage(message: string): {
      status: number;
      stdout: string;
      stderr: string;
    } {
      const inv = resolveCommitlintInvocation();
      if (!inv) {
        throw new Error(
          `commitlint binary not available; cannot run live-behavior gate`,
        );
      }
      // commitlint v19 reads the message from stdin when no file/edit
      // flag is provided; the deprecated `--stdin` flag is no longer
      // accepted. Pass the message via `input` only.
      const result = spawnSync(inv.command, inv.argsPrefix, {
        cwd: MONOREPO_ROOT,
        encoding: 'utf-8',
        input: message,
        maxBuffer: 16 * 1024 * 1024,
      });
      if (result.error) throw result.error;
      return {
        status: result.status ?? -1,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
      };
    }

    // Decide at registration time whether the live-behavior gate
    // is runnable. When the binary is absent, the whole describe
    // is skipped (reported as "skipped" by vitest, NOT "passed")
    // so the Red→Green signal is unambiguous.
    const commitlintBinaryAvailable = resolveCommitlintInvocation() !== null;

    describe.runIf(commitlintBinaryAvailable)(
      '§7 — live commitlint CLI behavior (requires binary on disk)',
      () => {
        it('§7.1 — live commitlint REJECTS a non-chore commit without track_id', () => {
          const noTrackId = 'feat(science): no track ref';
          const result = runCommitlintOnMessage(noTrackId);
          expect(
            result.status,
            `expected commitlint to REJECT '${noTrackId}' (exit non-zero); ` +
              `got exit ${result.status}.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
          ).not.toBe(0);
        });

        it('§7.2 — live commitlint ACCEPTS a non-chore commit WITH track_id', () => {
          const withTrackId =
            'feat(science): x (track_id: housekeeping_batch_20260603)';
          const result = runCommitlintOnMessage(withTrackId);
          expect(
            result.status,
            `expected commitlint to ACCEPT '${withTrackId}' (exit 0); ` +
              `got exit ${result.status}.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
          ).toBe(0);
        });
      },
    );
  });
});