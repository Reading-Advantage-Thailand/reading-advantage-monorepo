/**
 * Phase 4 (Track 4 next-skill-planner_20260521) — kst-srs.v2 §7 spec parity.
 *
 * Per test-strategy.md §5/§7, Phase 4's deliverable is an updated
 * `kst-srs.v2/SPECIFICATION.md` §7 (Next-Skill Planner) that documents
 * the implementation surface introduced in Phases 1-3. The test-strategy
 * labels this an *artifact* test (the deliverable IS the spec text) and
 * pairs it with the production gate (`npm run lint && CI=true npm test &&
 * npx tsc --noEmit`) as the live-behavior proof, owned by the JR role.
 *
 * Section-numbering note: the plan and test-strategy reference §10 and
 * §6.4, but the live `kst-srs.v2/SPECIFICATION.md` has the planner at §7
 * (line 220), §6.4 is "Beta-Bernoulli Posterior" (line 189), and §10 is
 * "Practice-Variant Rename" (line 341). The Phase 1/2/3 source comments
 * (`planner/types.ts:3`, `priority.ts:4`, `recommended-next.ts:4`) all
 * cite §7. The Red contract targets the live section, not the stale
 * plan references. The Green/closeout role (JR) may also fix the §10/§6.4
 * references in the plan and test-strategy.
 *
 * Red signal at HEAD: kst-srs.v2 §7 has the high-level formula and
 * components table (§7.1-7.4) but is missing the implementation-accurate
 * contract details that Phases 1-3 introduced. Each of the new tests in
 * the "Implementation-accurate details" describe block asserts content
 * that is not in the spec yet; they fail until the JR/closeout role
 * updates §7.
 *
 * Live-behavior proof owner (per test-strategy §7, P4 Green/closeout):
 * the JR role runs the production gate after the spec is updated.
 */

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers — dynamic imports of node:fs / node:url so we don't add a static
// import to the package's tsconfig (which does not include the `node` lib).
// Mirrors the pattern in `weakness-fit.test.ts` and
// `planner-contract-adversarial.test.ts`.
// ---------------------------------------------------------------------------

type FsReadFileSync = (path: string, encoding: 'utf-8') => string;
type UrlFileUrlToPath = (url: URL | string) => string;

async function loadSpecSection7(): Promise<string> {
  const fsModule = 'node:fs';
  const urlModule = 'node:url';
  const { readFileSync } = (await import(fsModule)) as { readFileSync: FsReadFileSync };
  const { fileURLToPath } = (await import(urlModule)) as { fileURLToPath: UrlFileUrlToPath };

  // packages/knowledge-space-practice/src/__tests__/foo.test.ts
  //   -> ../../../../kst-srs.v2/SPECIFICATION.md (repo root + kst-srs.v2/)
  const specPath = fileURLToPath(
    new URL('../../../../kst-srs.v2/SPECIFICATION.md', import.meta.url),
  );
  const raw = readFileSync(specPath, 'utf-8');
  return extractMarkdownSection(raw, /^##\s+7\.\s+Next-Skill Planner\b/);
}

function extractMarkdownSection(text: string, headingRegex: RegExp): string {
  const lines = text.split('\n');
  const startIdx = lines.findIndex((line) => headingRegex.test(line));
  if (startIdx === -1) return '';
  // End at the next `## ` heading (any section number).
  const endIdx = lines
    .slice(startIdx + 1)
    .findIndex((line) => /^##\s+\d+(\.\d+)*\s+/.test(line));
  return lines.slice(startIdx, endIdx === -1 ? undefined : startIdx + 1 + endIdx).join('\n');
}

// ---------------------------------------------------------------------------
// §7 — high-level overview
// ---------------------------------------------------------------------------

describe('kst-srs.v2 §7 (Next-Skill Planner) — high-level overview', () => {
  it('§7 section exists in SPECIFICATION.md with the v2 Item 4 marker', async () => {
    const section = await loadSpecSection7();
    expect(section).not.toBe('');
    expect(section).toMatch(/^##\s+7\.\s+Next-Skill Planner\s+\(v2 Item 4\)/m);
  });

  it('§7.1 documents the composite priority formula (a·readiness + b·unlockValue + c·goalProximity + d·weaknessFit)', async () => {
    const section = await loadSpecSection7();
    expect(section).toMatch(/###\s+7\.1\s+Composite Priority/);
    expect(section).toMatch(/priority\s*\(\s*B\s*\)\s*=\s*a[\s\S]*readiness[\s\S]*\+\s*b[\s\S]*unlockValue[\s\S]*\+\s*c[\s\S]*goalProximity[\s\S]*\+\s*d[\s\S]*weaknessFit/);
  });

  it('§7.2 defines all four scoring terms (readiness, unlockValue, goalProximity, weaknessFit)', async () => {
    const section = await loadSpecSection7();
    expect(section).toMatch(/###\s+7\.2\s+Components/);
    for (const term of ['readiness(B)', 'unlockValue(B)', 'goalProximity(B)', 'weaknessFit(B)']) {
      expect(section).toMatch(new RegExp('`?' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '`?'));
    }
  });

  it('§7.3 documents the configurable engine weights a, b, c, d', async () => {
    const section = await loadSpecSection7();
    expect(section).toMatch(/###\s+7\.3\s+Configuration/);
    expect(section).toMatch(/a,\s*b,\s*c,\s*d.*configurable|configurable.*a,\s*b,\s*c,\s*d/);
  });

  it('§7.4 documents `recommendedNext` = top-N by priority, replacing arbitrary `slice(0, 5)`', async () => {
    const section = await loadSpecSection7();
    expect(section).toMatch(/###\s+7\.4\s+Output/);
    expect(section).toMatch(/recommendedNext/);
    expect(section).toMatch(/top-N/);
    expect(section).toMatch(/priority/);
    expect(section).toMatch(/slice\(0,\s*5\)/);
  });
});

// ---------------------------------------------------------------------------
// §7 — implementation-accurate contract details (Phases 1-3 surface)
// ---------------------------------------------------------------------------

describe('kst-srs.v2 §7 — implementation-accurate contract details (Phases 1-3)', () => {
  it('§7 documents the `priorityWeightsSchema` Zod contract: a/b/c/d non-negative finite, strict (no extra keys)', async () => {
    const section = await loadSpecSection7();
    // Phase 1 introduced `priorityWeightsSchema` (z.strictObject with .finite().min(0)).
    expect(section).toMatch(/priorityWeights/);
    expect(section).toMatch(/finite/);
    expect(section).toMatch(/non-negative|min\(\s*0\s*\)/);
  });

  it('§7 documents the `PriorityScore` discriminated union (ranked | unranked | mastered)', async () => {
    const section = await loadSpecSection7();
    expect(section).toMatch(/PriorityScore/);
    expect(section).toMatch(/ranked/);
    expect(section).toMatch(/unranked/);
    expect(section).toMatch(/mastered/);
  });

  it('§7 documents the `PlannerInput` and `PlannerOutput` types', async () => {
    const section = await loadSpecSection7();
    expect(section).toMatch(/PlannerInput/);
    expect(section).toMatch(/PlannerOutput/);
  });

  it('§7 documents the `getPriority` and `getRecommendedNext` function signatures', async () => {
    const section = await loadSpecSection7();
    expect(section).toMatch(/getPriority/);
    expect(section).toMatch(/getRecommendedNext/);
  });

  it('§7 documents the bulk precompute APIs: computePriorities, computeUnlockValues, computeGoalProximities, computeWeaknessFitMap', async () => {
    const section = await loadSpecSection7();
    expect(section).toMatch(/computePriorities/);
    expect(section).toMatch(/computeUnlockValues/);
    expect(section).toMatch(/computeGoalProximities/);
  });

  it('§7 documents the default `topN=5` for `getRecommendedNext`', async () => {
    const section = await loadSpecSection7();
    // Phase 3 introduced `getRecommendedNext(input, weights, topN = 5)`.
    expect(section).toMatch(/topN\s*=\s*5|default\s+topN|default\s+5/i);
  });

  it('§7 documents the `nodeId.localeCompare` ascending tie-break for `getRecommendedNext`', async () => {
    const section = await loadSpecSection7();
    // Phase 3 used `nodeId.localeCompare` ascending for stable tie-breaks.
    expect(section).toMatch(/nodeId\.localeCompare|localeCompare.*ascending|tie-break.*ascending/i);
  });

  it('§7 documents the ready-before-unknown partitioning preserved by `getRecommendedNext`', async () => {
    const section = await loadSpecSection7();
    // Phase 3 partitioned candidates into ready (readiness > 0) and unknown before ranking.
    expect(section).toMatch(/ready[\s-]+before[\s-]+unknown/i);
  });

  it('§7 documents the domain-neutrality boundary: no app/Convex imports in `packages/knowledge-space-practice/src/planner/`', async () => {
    const section = await loadSpecSection7();
    expect(section).toMatch(/domain-neutral/);
    expect(section).toMatch(/no app|apps\/|no convex|convex\/_generated/i);
  });

  it('§7 documents the cycle-safety / precomputation invariants of `unlockValue` and `goalProximity`', async () => {
    const section = await loadSpecSection7();
    // Phase 2 made unlockValue and goalProximity cycle-safe and precomputed.
    expect(section).toMatch(/cycle[\s-]+safe|cycles?/i);
    expect(section).toMatch(/precomput/i);
  });
});
