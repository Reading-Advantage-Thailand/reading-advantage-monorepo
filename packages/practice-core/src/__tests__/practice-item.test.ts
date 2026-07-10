/**
 * Phase 1 — Contract & Schema (Track 7: Practice-Variant Rename)
 *
 * FR1: Rename `problemFamilyId → variantKey`, `ProblemFamily → PracticeVariant`
 *      across `practice-core`.
 * FR2: Single-variant default — when `variantKey` is omitted, it must collapse
 *      to a single-variant per objective default (a domain that does not
 *      subdivide uses `variantKey = objectiveId`).
 *
 * This test is the Red-phase proof that the current `practice-item` contract
 * still uses `problemFamilyId`. It is expected to fail at HEAD with Zod parse
 * errors and missing field assertions.
 *
 * Strategy: `test-strategy.md` §7 row "P1". Targeted Red command:
 *   `npx vitest run packages/practice-core/src/__tests__/practice-item.test.ts -t "variantKey"`
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { practiceItemSchema, type PracticeItem } from '../practice/practice-item.js';

describe('practiceItemSchema (variantKey rename)', () => {
  it('parses an item with the renamed variantKey field', () => {
    const parsed = practiceItemSchema.parse({
      practiceItemId: 'pi_001',
      activityId: 'act_001',
      variantKey: 'variant:graphing-explorer:quadratic-transformations',
      variantLabel: 'Set A',
    });

    expect(parsed.variantKey).toBe(
      'variant:graphing-explorer:quadratic-transformations',
    );
  });

  it('exposes variantKey on the parsed object (not problemFamilyId)', () => {
    const parsed = practiceItemSchema.parse({
      practiceItemId: 'pi_002',
      activityId: 'act_002',
      variantKey: 'variant:k1',
      variantLabel: 'Set A',
    });

    const keys = Object.keys(parsed).sort();
    expect(keys).toContain('variantKey');
    expect(keys).not.toContain('problemFamilyId');
  });

  it('rejects the legacy problemFamilyId field after rename', () => {
    // After FR1, problemFamilyId must no longer be a valid schema field.
    // Zod's default object behavior is to strip unknown keys, but the
    // post-rename schema must require `variantKey` and reject input that
    // supplies `problemFamilyId` (the new schema has no such field, so
    // omitting variantKey must fail validation).
    expect(() =>
      practiceItemSchema.parse({
        practiceItemId: 'pi_003',
        activityId: 'act_003',
        problemFamilyId: 'family:legacy',
        variantLabel: 'Set A',
      }),
    ).toThrow();
  });

  it('PracticeItem type carries variantKey, not problemFamilyId', () => {
    // Compile-time contract assertion. The type system must report an error
    // if `variantKey` is missing on `PracticeItem` after the rename.
    const item: PracticeItem = {
      practiceItemId: 'pi_004',
      activityId: 'act_004',
      variantKey: 'variant:k2',
      variantLabel: 'Set A',
    };

    expect(item.variantKey).toBe('variant:k2');
    // @ts-expect-error — problemFamilyId must NOT exist on PracticeItem after FR1.
    const _legacy: string = item.problemFamilyId;
    expect(_legacy).toBeUndefined();
  });
});

describe('practiceItemSchema (FR2 single-variant default)', () => {
  /**
   * Per FR2: "a domain that does not subdivide uses a single variant per
   * objective (`variantKey = objectiveId`)". The default must apply when the
   * caller omits `variantKey`, mirroring the practice.v1 single-variant
   * collapse for non-subdividing domains.
   *
   * The Red proof: omitting `variantKey` from a valid input currently throws
   * a Zod required-field error. The post-Green parse must succeed and
   * produce a `variantKey` value that matches the supplied `objectiveId`.
   */
  it('defaults variantKey to objectiveId when omitted (FR2)', () => {
    type Input = z.input<typeof practiceItemSchema> & { objectiveId?: string };

    const parsed = practiceItemSchema.parse({
      practiceItemId: 'pi_default_001',
      activityId: 'act_default_001',
      objectiveId: 'obj-ccss-hsa-rei-b4',
      variantLabel: 'Set A',
    } as Input);

    expect(parsed.variantKey).toBe('obj-ccss-hsa-rei-b4');
  });

  it('preserves an explicit variantKey over the objectiveId default (FR2)', () => {
    type Input = z.input<typeof practiceItemSchema> & { objectiveId?: string };

    const parsed = practiceItemSchema.parse({
      practiceItemId: 'pi_default_002',
      activityId: 'act_default_002',
      objectiveId: 'obj-ccss-hsa-rei-b4',
      variantKey: 'variant:subdivision-A',
      variantLabel: 'Set A',
    } as Input);

    expect(parsed.variantKey).toBe('variant:subdivision-A');
  });
});
