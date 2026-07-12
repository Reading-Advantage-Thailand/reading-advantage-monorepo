import { describe, expect, it } from "vitest";

import {
  AuditDatasetSchema,
  validateReferentialIntegrity,
} from "../audit-schema";

const evidence = {
  id: "evidence:catalog",
  kind: "source" as const,
  path: "apps/advantage-games/src/lib/gameCards.ts",
  revision: "HEAD",
  confidence: "high" as const,
};

const completeDataset = {
  version: "apk-audit.v1" as const,
  evidence: [evidence],
  games: [
    {
      id: "game:example",
      slug: "example",
      title: "Example",
      inputMode: "vocabulary" as const,
      catalogState: "playable" as const,
      routeState: "present" as const,
      confidence: "high" as const,
      evidenceIds: [evidence.id],
      sceneIds: ["scene:example:main"],
    },
  ],
  scenes: [
    {
      id: "scene:example:main",
      gameId: "game:example",
      name: "main",
      evidenceIds: [evidence.id],
    },
  ],
  mechanics: [
    {
      id: "mechanic:example:core",
      gameId: "game:example",
      sceneIds: ["scene:example:main"],
      learningLoop: "Select the correct answer.",
      retainedBehavior: ["Correct-answer progression"],
      redesignableBehavior: ["Renderer"],
      evidenceIds: [evidence.id],
    },
  ],
  capabilities: [
    {
      id: "capability:education:progression",
      name: "Educational progression",
      domain: "education",
      disposition: "standardize" as const,
      consumerSceneIds: ["scene:example:main"],
      owner: "@reading-advantage/advantage-play-kit",
      extensionBoundary: "Game-specific answer consequences remain bespoke.",
      minimumEvidence: ["unit-test"],
      evidenceIds: [evidence.id],
    },
  ],
  responsiveProfiles: [
    {
      id: "responsive:example",
      gameId: "game:example",
      sceneIds: ["scene:example:main"],
      compact: {
        strategy: ["reflow" as const],
        inputModes: ["touch" as const],
      },
      wide: {
        strategy: ["panel" as const],
        inputModes: ["keyboard" as const, "pointer" as const],
      },
      evidenceIds: [evidence.id],
    },
  ],
  assets: [
    {
      id: "asset:ui:primary-prompt",
      family: "ui",
      semanticRole: "primary-prompt",
      consumerSceneIds: ["scene:example:main"],
      capabilityIds: ["capability:education:progression"],
      profileUsage: ["compact" as const, "wide" as const],
      disposition: "replace" as const,
      evidenceIds: [evidence.id],
    },
  ],
  discrepancies: [],
};

describe("APK audit schema and referential integrity", () => {
  it("accepts a fully mapped game and scene", () => {
    const parsed = AuditDatasetSchema.parse(completeDataset);
    expect(validateReferentialIntegrity(parsed)).toEqual([]);
  });

  it("rejects an omitted responsive profile", () => {
    const parsed = AuditDatasetSchema.parse({
      ...completeDataset,
      responsiveProfiles: [],
    });
    expect(validateReferentialIntegrity(parsed)).toContain(
      "game:example has no responsive profile",
    );
  });

  it("rejects a standardized capability without consumers", () => {
    const parsed = AuditDatasetSchema.parse({
      ...completeDataset,
      capabilities: [
        { ...completeDataset.capabilities[0], consumerSceneIds: [] },
      ],
    });
    expect(validateReferentialIntegrity(parsed)).toContain(
      "capability:education:progression is standardize without source consumers",
    );
  });

  it("rejects orphan asset and broken evidence references", () => {
    const parsed = AuditDatasetSchema.parse({
      ...completeDataset,
      assets: [
        {
          ...completeDataset.assets[0],
          consumerSceneIds: ["scene:missing:main"],
          evidenceIds: ["evidence:missing"],
        },
      ],
    });
    expect(validateReferentialIntegrity(parsed)).toEqual(
      expect.arrayContaining([
        "asset:ui:primary-prompt references missing scene scene:missing:main",
        "asset:ui:primary-prompt references missing evidence evidence:missing",
      ]),
    );
  });
});
