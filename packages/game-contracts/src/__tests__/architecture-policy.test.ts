import { describe, expect, it } from "vitest";

import { scanAPKArchitecture, type ArchitectureSourceFile } from "../index.js";

const source = (path: string, sourceText: string): ArchitectureSourceFile => ({
  path,
  source: sourceText,
});

describe("counterexample-backed APK import architecture scanner", () => {
  it.each([
    ["Konva", 'import Konva from "konva";'],
    ["React-Konva", 'import { Stage } from "react-konva";'],
    ["R3F", 'import { Canvas } from "@react-three/fiber";'],
    ["Three", 'import * as THREE from "three";'],
    ["React", 'import React from "react";'],
    ["Next", 'import { cookies } from "next/headers";'],
    ["auth", 'import { requireUser } from "@reading-advantage/auth";'],
    ["database", 'import { db } from "@reading-advantage/db";'],
    ["app-private alias", 'import Game from "@/components/private-game";'],
    ["relative app escape", 'import secret from "../../apps/reading-advantage/private";'],
  ])("detects the %s counterexample in cartridge code", (_label, sourceText) => {
    const result = scanAPKArchitecture(
      [source("packages/games/src/example/game.ts", sourceText)],
      { layer: "cartridge" },
    );

    expect(result.scannedFiles).toBe(1);
    expect(result.violations).toHaveLength(1);
  });

  it("detects forbidden dynamic imports", () => {
    const result = scanAPKArchitecture(
      [source("packages/games/src/example/game.ts", 'const sdk = import("@reading-advantage/db");')],
      { layer: "cartridge" },
    );

    expect(result.violations[0]?.specifier).toBe("@reading-advantage/db");
  });

  it("allows Phaser in a cartridge but not in browser-safe contracts", () => {
    const phaserSource = source(
      "packages/games/src/example/game.ts",
      'import Phaser from "phaser";',
    );

    expect(
      scanAPKArchitecture([phaserSource], { layer: "cartridge" }).violations,
    ).toEqual([]);
    expect(
      scanAPKArchitecture(
        [{ ...phaserSource, path: "packages/game-contracts/src/index.ts" }],
        { layer: "contracts" },
      ).violations,
    ).toHaveLength(1);
  });

  it("does not mistake comments or ordinary strings for imports", () => {
    const result = scanAPKArchitecture(
      [
        source(
          "packages/games/src/example/game.ts",
          [
            '// import { db } from "@reading-advantage/db";',
            'const docs = "import Konva from \\"konva\\"";',
            'export const safe = "https://example.test/apps/demo";',
          ].join("\n"),
        ),
      ],
      { layer: "cartridge" },
    );

    expect(result.violations).toEqual([]);
  });

  it("uses an exact legacy allowlist rather than a broad directory prefix", () => {
    const importText = 'import { Stage } from "react-konva";';
    const result = scanAPKArchitecture(
      [
        source("apps/advantage-games/src/legacy/old-game.ts", importText),
        source("apps/advantage-games/src/legacy/new-game.ts", importText),
      ],
      {
        layer: "cartridge",
        legacyAllowlist: ["apps/advantage-games/src/legacy/old-game.ts"],
      },
    );

    expect(result.scannedFiles).toBe(2);
    expect(result.violations.map((violation) => violation.path)).toEqual([
      "apps/advantage-games/src/legacy/new-game.ts",
    ]);
  });
});
