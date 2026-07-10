import { describe, expectTypeOf, it } from "vitest";

import type {
  GameCompletionInput,
  GameResults,
  HostCompletionContext,
  SentenceInput,
  VocabularyInput,
  VocabularyItem,
} from "../index.js";

describe("public educational contract types", () => {
  it("keeps the established item and array shapes", () => {
    expectTypeOf<VocabularyItem>().toEqualTypeOf<{
      term: string;
      translation: string;
    }>();
    expectTypeOf<VocabularyInput>().toEqualTypeOf<VocabularyItem[]>();
    expectTypeOf<SentenceInput>().toEqualTypeOf<VocabularyItem[]>();
  });

  it("keeps GameResults at exactly five fields", () => {
    expectTypeOf<GameResults>().toEqualTypeOf<{
      accuracy: number;
      xp: number;
      score: number;
      correctAnswers: number;
      totalAttempts: number;
    }>();
  });

  it("keeps host completion context separate from cartridge results", () => {
    type HostHasUserId = "userId" extends keyof HostCompletionContext ? true : false;
    type HostHasSchoolId = "schoolId" extends keyof HostCompletionContext ? true : false;
    type CompletionHasDisplayXp = "xp" extends keyof GameCompletionInput ? true : false;
    type CompletionHasAuthoritativeXp = "xpEarned" extends keyof GameCompletionInput
      ? true
      : false;

    expectTypeOf<HostHasUserId>().toEqualTypeOf<false>();
    expectTypeOf<HostHasSchoolId>().toEqualTypeOf<false>();
    expectTypeOf<CompletionHasDisplayXp>().toEqualTypeOf<false>();
    expectTypeOf<CompletionHasAuthoritativeXp>().toEqualTypeOf<false>();
  });
});
