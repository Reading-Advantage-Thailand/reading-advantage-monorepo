import { describe, expect, it } from "vitest";

import {
  ACCEPTED_STANDARD_PACK_BINDING,
  cartridgeManifestSchema,
  validateCartridgeManifest,
} from "../cartridge-manifest.js";

describe("cartridge manifest schema", () => {
  const validManifest = {
    schemaVersion: 1,
    id: "exemplar-vocab-match",
    title: "Exemplar Vocabulary Match",
    description: "A representative cartridge built entirely through public APK APIs.",
    version: "0.1.0",
    runtimeApiVersion: "1.0.0",
    inputMode: "vocabulary",
    capabilities: ["capability:nonempty-content-precondition", "capability:language-target-progression"],
    standardPackBinding: ACCEPTED_STANDARD_PACK_BINDING,
    semanticAssetRequirements: [],
    attributionRegistration: {
      requiredCredit: "Pixel art assets by ElvGames",
      placement: "end-screen",
    },
    selectedUnionMaterialization: "accepted-cartridge-selected-union-only",
    qcRegistration: { route: "/qc" },
  };

  const validTutorial = {
    schemaVersion: 1,
    id: "exemplar-vocab-match-tutorial",
    title: "Exemplar Vocabulary Match tutorial",
    seed: 42,
    labels: {
      progress: "Tutorial progress",
      pause: "Pause tutorial",
      resume: "Resume tutorial",
      advance: "Next step",
      replay: "Replay tutorial",
      skip: "Skip tutorial",
    },
    targets: [{ id: "control:answer-choice", kind: "control" }],
    actions: [{ id: "action:highlight-answer", deterministic: true, consequence: "neutral" }],
    steps: [{
      id: "step:notice-answer",
      title: "Find the answer controls",
      explanation: "Notice the answer choices before making a selection.",
      targetId: "control:answer-choice",
      actionId: "action:highlight-answer",
      timing: { leadInMs: 0, demonstrationMs: 800, lingerMs: 250 },
    }],
    lifecycle: {
      pause: "freeze-current-step",
      advance: "sequential",
      replay: "restart-with-same-seed",
      skip: { enabled: true, to: "countdown" },
      complete: { to: "playing" },
      productionEffects: {
        emitGameResults: false,
        persistProgress: false,
        awardAuthoritativeXp: false,
        writeLeaderboard: false,
        applyFailureConsequences: false,
      },
    },
  } as const;

  it("accepts a manifest that pins the accepted standard-pack release", () => {
    const manifest = validateCartridgeManifest(validManifest);
    expect(manifest.id).toBe("exemplar-vocab-match");
    expect(manifest.standardPackBinding.version).toBe("2026.07.23");
  });

  it("accepts an optional strict tutorial definition without making it mandatory for existing cartridges", () => {
    const withoutTutorial = validateCartridgeManifest(validManifest);
    const withTutorial = validateCartridgeManifest({ ...validManifest, tutorial: validTutorial });

    expect(withoutTutorial.tutorial).toBeUndefined();
    expect(withTutorial.tutorial).toMatchObject({
      id: "exemplar-vocab-match-tutorial",
      lifecycle: { complete: { to: "playing" } },
    });
  });

  it("prefixes nested tutorial validation errors with the manifest tutorial path", () => {
    expect(() => validateCartridgeManifest({
      ...validManifest,
      tutorial: {
        ...validTutorial,
        labels: { ...validTutorial.labels, progress: " " },
      },
    })).toThrow(/tutorial\.labels\.progress/i);
  });

  it("rejects a manifest that does not pin the accepted standard-pack release", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        standardPackBinding: {
          version: "2026.07.22",
          catalogDigest: "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
          sourceReceiptDigest: "93562cc3070a4907d06d6196a2c5d917a07c4b487cf4be031805d60fdc75eea9",
        },
      }),
    ).toThrow(/accepted release/i);
  });

  it("rejects a manifest listing a capability outside the accepted registry", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        capabilities: ["capability:title-specific-boss-fight"],
      }),
    ).toThrow(/validation failed|capability/i);
  });

  it("rejects a manifest with missing attribution registration", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        attributionRegistration: undefined,
      }),
    ).toThrow(/attribution/i);
  });

  it("rejects a manifest whose attribution credit does not match the accepted text", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        attributionRegistration: {
          requiredCredit: "Art by Someone Else",
          placement: "end-screen",
        },
      }),
    ).toThrow(/ElvGames/i);
  });

  it("rejects a manifest with a non-selected-union materialization policy", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        selectedUnionMaterialization: "full-catalog-load",
      }),
    ).toThrow(/selected-union/i);
  });

  it("rejects semantic asset requirements that look like physical paths", () => {
    expect(() =>
      validateCartridgeManifest({
        ...validManifest,
        semanticAssetRequirements: ["ui/16x16/icons/coin.png"],
      }),
    ).toThrow(/semantic/i);
  });

  it("accepts semantic asset requirements that are semantic keys", () => {
    const manifest = validateCartridgeManifest({
      ...validManifest,
      semanticAssetRequirements: ["ui/16x16/icons/coin"],
    });
    expect(manifest.semanticAssetRequirements).toContain("ui/16x16/icons/coin");
  });

  it("exposes the frozen accepted standard-pack binding for cartridges to pin", () => {
    expect(ACCEPTED_STANDARD_PACK_BINDING.version).toBe("2026.07.23");
    expect(ACCEPTED_STANDARD_PACK_BINDING.catalogDigest).toBe(
      "ac801baee31d3b410050d03f8e9cb672940e3bf24a917df7233a7785f90a8087",
    );
    expect(Object.isFrozen(ACCEPTED_STANDARD_PACK_BINDING)).toBe(true);
  });

  it("parses with Zod and rejects unknown extra fields", () => {
    expect(
      cartridgeManifestSchema.safeParse({
        ...validManifest,
        unexpectedField: true,
      }).success,
    ).toBe(false);
  });
});
