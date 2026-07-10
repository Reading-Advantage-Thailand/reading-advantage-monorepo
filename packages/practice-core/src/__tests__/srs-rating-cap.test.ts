// Phase 2 (Track 6 misconception-loop_20260521) — computeBaseRating rating-cap
// Red tests.
//
// kst-srs.v2 §8.4 + spec.md FR2: a detected misconception **caps** the rating
// at `Hard` by default and forces `Again` only when the misconception is marked
// **severe`. Severity is the canonical accessor in
// `packages/knowledge-space-practice/src/misconception-loop.ts`
// (`getMisconceptionSeverity`, defaulted to `'minor'`) and is consumed by
// `computeBaseRating` as a per-tag map. This file is the truth-table live
// behavior proof: parameterized over `(misconception?, severe?, hints?,
// incorrect?) → rating`.
//
// Per `test-strategy.md` §5 (P2), this file is the in-package truth table.
// Per `test-strategy.md` §7 the Red command is:
//
//   npx vitest run -t "rating cap" --root packages/practice-core
//
// The `it` titles all start with "rating cap —" so that filter resolves only
// the new test cases. The existing `computeBaseRating` describe block (which
// still documents the v1 "Again on any misconception tag" behavior) is
// intentionally left untouched — its tests are scheduled to be reconciled
// during the Green phase per test-strategy §6.
//
// Red expectations:
//   1. `computeBaseRating` does NOT yet accept a second `options` argument.
//   2. The current v1 implementation always returns `Again` for any part with
//      a non-empty `misconceptionTags` array.
//
// Both facts together mean the new truth-table assertions below FAIL at HEAD
// for the right reason: the new severity-aware contract is missing, and the
// current "Again for any tag" rule contradicts the new "Hard cap" rows.
//
// The `rateWith` helper below uses a single, narrowly-scoped `as never` cast
// to forward the not-yet-existing `options` argument. This is deliberate:
// esbuild (vitest's transformer) does not enforce TS types at runtime, so the
// cast lets the test exercise the new contract today while keeping the file
// TS-clean for `tsc --noEmit` once Green extends the signature (the cast
// becomes a no-op cast and is then removed by the Implementer in the same
// commit that lands the new signature).

import { describe, it, expect } from 'vitest';
import { computeBaseRating, type SrsRating } from '../practice/srs-rating.js';

type Severity = 'minor' | 'severe';
type SeverityByTag = Readonly<Record<string, Severity>>;
type ComputeBaseRatingOptions = { severityByTag?: SeverityByTag };

// Helper: forward `options` to the planned Phase 2 signature. The cast is
// scoped to this helper only so the rest of the test file is type-safe.
function rateWith(
  parts: Parameters<typeof computeBaseRating>[0],
  options?: ComputeBaseRatingOptions,
): SrsRating {
  // Cast to a loose fn signature so we can forward the not-yet-existing
  // second argument. Use `unknown` rather than `never` to keep the call
  // expression callable.
  const loose = computeBaseRating as unknown as (
    parts: Parameters<typeof computeBaseRating>[0],
    options?: ComputeBaseRatingOptions,
  ) => SrsRating;
  return loose(parts, options);
}

// Local tag alphabet reused across truth-table cases. Intentionally
// IM3-shaped (per `apps/integrated-math-3/__tests__/lib/practice/
// misconception-content.fixtures.ts` taxonomy) so a future cross-package
// parity assertion can be added without re-tagging.
const TAG_SIGN_ERROR = 'math.im3.misconception.sign-error';
const TAG_LINEAR = 'math.im3.misconception.linear-misuse';
const UNKNOWN_TAG = 'math.im3.misconception.unknown';

describe('computeBaseRating — rating cap (Phase 2, kst-srs.v2 §8.4, spec FR2)', () => {
  // -------------------------------------------------------------------------
  // 1. Cap-at-Hard (minor misconception) — the new default.
  // -------------------------------------------------------------------------

  it('rating cap — caps at Hard when a minor misconception is tagged and the part is correct', () => {
    const rating = rateWith(
      [
        {
          isCorrect: true,
          hintsUsed: 0,
          revealStepsSeen: 0,
          misconceptionTags: [TAG_SIGN_ERROR],
        },
      ],
      { severityByTag: { [TAG_SIGN_ERROR]: 'minor' } },
    );
    expect(rating).toBe('Hard');
  });

  it('rating cap — caps at Hard for a minor misconception even when hints were also used (cap is the floor)', () => {
    const rating = rateWith(
      [
        {
          isCorrect: true,
          hintsUsed: 1,
          revealStepsSeen: 0,
          misconceptionTags: [TAG_LINEAR],
        },
      ],
      { severityByTag: { [TAG_LINEAR]: 'minor' } },
    );
    expect(rating).toBe('Hard');
  });

  it('rating cap — defaults a tag with no severityByTag entry to "minor" and caps at Hard', () => {
    // The default-severity invariant must mirror `getMisconceptionSeverity`:
    // missing metadata = 'minor' = cap. An empty `severityByTag` must not
    // regress to the v1 "Again for any tag" behavior.
    const rating = rateWith(
      [
        {
          isCorrect: true,
          hintsUsed: 0,
          revealStepsSeen: 0,
          misconceptionTags: [UNKNOWN_TAG],
        },
      ],
      { severityByTag: {} },
    );
    expect(rating).toBe('Hard');
  });

  it('rating cap — caps at Hard when the second part of a multi-part question has a minor tag', () => {
    const rating = rateWith(
      [
        { isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] },
        {
          isCorrect: true,
          hintsUsed: 0,
          revealStepsSeen: 0,
          misconceptionTags: [TAG_SIGN_ERROR],
        },
      ],
      { severityByTag: { [TAG_SIGN_ERROR]: 'minor' } },
    );
    expect(rating).toBe('Hard');
  });

  // -------------------------------------------------------------------------
  // 2. Again for severe misconception — preserve the v1 force-Again path.
  // -------------------------------------------------------------------------

  it('rating cap — forces Again when a severe misconception is tagged and the part is correct', () => {
    const rating = rateWith(
      [
        {
          isCorrect: true,
          hintsUsed: 0,
          revealStepsSeen: 0,
          misconceptionTags: [TAG_SIGN_ERROR],
        },
      ],
      { severityByTag: { [TAG_SIGN_ERROR]: 'severe' } },
    );
    expect(rating).toBe('Again');
  });

  it('rating cap — severe wins over hints (Again, not Hard)', () => {
    const rating = rateWith(
      [
        {
          isCorrect: true,
          hintsUsed: 2,
          revealStepsSeen: 1,
          misconceptionTags: [TAG_LINEAR],
        },
      ],
      { severityByTag: { [TAG_LINEAR]: 'severe' } },
    );
    expect(rating).toBe('Again');
  });

  it('rating cap — any severe tag forces Again, even when other tags in the same part are minor', () => {
    // A part may carry multiple tags. The "any severe" rule means one
    // severe tag in the tag list dominates the whole part.
    const rating = rateWith(
      [
        {
          isCorrect: true,
          hintsUsed: 0,
          revealStepsSeen: 0,
          misconceptionTags: [TAG_SIGN_ERROR, TAG_LINEAR],
        },
      ],
      { severityByTag: { [TAG_SIGN_ERROR]: 'minor', [TAG_LINEAR]: 'severe' } },
    );
    expect(rating).toBe('Again');
  });

  // -------------------------------------------------------------------------
  // 3. Precedence: incorrect > severe > minor > hints.
  // -------------------------------------------------------------------------

  it('rating cap — incorrect part wins over severe misconception (Again)', () => {
    const rating = rateWith(
      [
        {
          isCorrect: false,
          hintsUsed: 0,
          revealStepsSeen: 0,
          misconceptionTags: [TAG_SIGN_ERROR],
        },
      ],
      { severityByTag: { [TAG_SIGN_ERROR]: 'severe' } },
    );
    expect(rating).toBe('Again');
  });

  it('rating cap — incorrect part wins over minor misconception (Again)', () => {
    const rating = rateWith(
      [
        {
          isCorrect: false,
          hintsUsed: 0,
          revealStepsSeen: 0,
          misconceptionTags: [TAG_SIGN_ERROR],
        },
      ],
      { severityByTag: { [TAG_SIGN_ERROR]: 'minor' } },
    );
    expect(rating).toBe('Again');
  });

  // -------------------------------------------------------------------------
  // 4. No-misconception baseline regressions.
  // -------------------------------------------------------------------------

  it('rating cap — Good when correct, no aids, and no misconceptions', () => {
    const rating = rateWith(
      [
        { isCorrect: true, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] },
      ],
      { severityByTag: {} },
    );
    expect(rating).toBe('Good');
  });

  it('rating cap — Hard when correct and hints used (no misconceptions)', () => {
    const rating = rateWith(
      [
        { isCorrect: true, hintsUsed: 1, revealStepsSeen: 0, misconceptionTags: [] },
      ],
      { severityByTag: {} },
    );
    expect(rating).toBe('Hard');
  });

  it('rating cap — Again when parts array is empty (conservative default unchanged)', () => {
    // The empty-parts contract predates Phase 2 and must not regress.
    expect(rateWith([], { severityByTag: {} })).toBe('Again');
  });

  it('rating cap — Again when no correctness data and no misconceptions (conservative default unchanged)', () => {
    expect(
      rateWith(
        [{ isCorrect: undefined, hintsUsed: 0, revealStepsSeen: 0, misconceptionTags: [] }],
        { severityByTag: {} },
      ),
    ).toBe('Again');
  });

  // -------------------------------------------------------------------------
  // 5. Parameterized truth table — the live-behavior proof.
  // -------------------------------------------------------------------------

  // The full truth table per test-strategy §5. Each row runs as a named
  // test so the failure report pinpoints the missing rule.
  const TRUTH_TABLE: ReadonlyArray<{
    name: string;
    isCorrect: boolean;
    hintsUsed: number;
    misconceptionTag: string | null;
    severity: Severity | null;
    expected: SrsRating;
  }> = [
    { name: 'correct, no aids, no misconception', isCorrect: true, hintsUsed: 0, misconceptionTag: null, severity: null, expected: 'Good' },
    { name: 'correct, hints, no misconception', isCorrect: true, hintsUsed: 1, misconceptionTag: null, severity: null, expected: 'Hard' },
    { name: 'correct, no aids, minor misconception (cap)', isCorrect: true, hintsUsed: 0, misconceptionTag: TAG_SIGN_ERROR, severity: 'minor', expected: 'Hard' },
    { name: 'correct, hints, minor misconception (cap = floor)', isCorrect: true, hintsUsed: 1, misconceptionTag: TAG_SIGN_ERROR, severity: 'minor', expected: 'Hard' },
    { name: 'correct, no aids, severe misconception (Again)', isCorrect: true, hintsUsed: 0, misconceptionTag: TAG_SIGN_ERROR, severity: 'severe', expected: 'Again' },
    { name: 'correct, hints, severe misconception (severe > hints)', isCorrect: true, hintsUsed: 2, misconceptionTag: TAG_LINEAR, severity: 'severe', expected: 'Again' },
    { name: 'incorrect, no misconception', isCorrect: false, hintsUsed: 0, misconceptionTag: null, severity: null, expected: 'Again' },
    { name: 'incorrect, minor misconception (incorrect > cap)', isCorrect: false, hintsUsed: 0, misconceptionTag: TAG_SIGN_ERROR, severity: 'minor', expected: 'Again' },
    { name: 'incorrect, severe misconception (incorrect > Again)', isCorrect: false, hintsUsed: 0, misconceptionTag: TAG_SIGN_ERROR, severity: 'severe', expected: 'Again' },
  ];

  for (const row of TRUTH_TABLE) {
    it(`rating cap — truth table: ${row.name} → ${row.expected}`, () => {
      const part = {
        isCorrect: row.isCorrect,
        hintsUsed: row.hintsUsed,
        revealStepsSeen: 0,
        ...(row.misconceptionTag
          ? { misconceptionTags: [row.misconceptionTag] as string[] }
          : { misconceptionTags: [] as string[] }),
      };
      const severityByTag: SeverityByTag | undefined =
        row.misconceptionTag && row.severity
          ? { [row.misconceptionTag]: row.severity }
          : {};

      const rating = rateWith([part], { severityByTag });
      expect(rating).toBe(row.expected);
    });
  }

  // -------------------------------------------------------------------------
  // 6. Purity guard — the function must remain pure (no Convex/I/O leakage).
  // -------------------------------------------------------------------------

  it('rating cap — computeBaseRating is referentially transparent (same input → same output)', () => {
    const parts = [
      {
        isCorrect: true,
        hintsUsed: 0,
        revealStepsSeen: 0,
        misconceptionTags: [TAG_SIGN_ERROR],
      },
    ];
    const options: ComputeBaseRatingOptions = { severityByTag: { [TAG_SIGN_ERROR]: 'minor' } };

    const first = rateWith(parts, options);
    const second = rateWith(parts, options);
    expect(first).toBe(second);
  });

  it('rating cap — computeBaseRating does not mutate the parts array', () => {
    const parts = [
      {
        isCorrect: true,
        hintsUsed: 0,
        revealStepsSeen: 0,
        misconceptionTags: [TAG_SIGN_ERROR],
      },
    ];
    const snapshot = JSON.parse(JSON.stringify(parts));
    rateWith(parts, { severityByTag: { [TAG_SIGN_ERROR]: 'minor' } });
    expect(parts).toEqual(snapshot);
  });
});
