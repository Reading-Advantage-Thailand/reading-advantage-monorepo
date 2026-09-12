import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { generateCartridgeScaffold } from "../scaffold.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");

describe("generated cartridge runtime", () => {
  it("compiles, registers, launches, handles pointer and keyboard input, completes once, and cleans up", () => {
    const outputDirectory = mkdtempSync(join(REPO_ROOT, ".tmp-apk-scaffold-"));
    try {
      const scaffold = generateCartridgeScaffold({
        id: "intern-word-quest",
        title: "Intern Word Quest",
        description: "A generated end-to-end cartridge proof.",
        inputMode: "vocabulary",
        capabilities: [
          "capability:nonempty-content-precondition",
          "capability:language-target-progression",
          "capability:single-completion-emission",
          "capability:result-accounting",
        ],
        requiredAssetBindings: [],
      });

      for (const file of scaffold.files) {
        if (file.path.endsWith(".ts") || file.path.endsWith(".tsx")) {
          writeFileSync(join(outputDirectory, file.path), file.content);
        }
      }
      writeFileSync(join(outputDirectory, "tsconfig.json"), JSON.stringify({
        compilerOptions: {
          baseUrl: REPO_ROOT,
          jsx: "react-jsx",
          module: "ESNext",
          moduleResolution: "Bundler",
          paths: {
            "@reading-advantage/advantage-play-kit/*": ["packages/advantage-play-kit/src/*/index.ts"],
            "@reading-advantage/game-contracts": ["packages/game-contracts/src/index.ts"],
          },
          skipLibCheck: true,
          strict: true,
          target: "ES2022",
        },
      }));
      writeFileSync(join(outputDirectory, "runner.ts"), `
import { createInternWordQuestCartridge } from "./index.js";

const completed: unknown[] = [];
const cartridge = createInternWordQuestCartridge();
if (cartridge.manifest.id !== "intern-word-quest") throw new Error("Generated cartridge did not register");
if (cartridge.standardExperience.definition.briefing.startPhase !== "tutorial") throw new Error("Generated briefing is missing");

const config = cartridge.createGameConfig({
  input: [
    { term: "cat", translation: "feline" },
    { term: "dog", translation: "canine" },
  ],
  edition: {
    id: "generated-test",
    title: "Generated test",
    runtimeApiVersion: "1.0.0",
    pack: { id: "none", version: "1.0.0", root: "/", files: {} },
    bindings: {},
    tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
  },
  complete: (result) => completed.push(result),
  diagnostic: () => undefined,
  sessionMode: "playing",
  inputController: {
    snapshot: () => ({
      keys: [],
      pressed: [],
      pointer: { down: false, released: false, cancelled: false, id: null, kind: null, startX: 0, startY: 0, x: 0, y: 0 },
      destroyed: false,
    }),
    cancelActiveGesture: () => undefined,
    destroy: () => undefined,
  },
});

type TextRecord = {
  text: string;
  destroyed: boolean;
  pointerdown?: () => void;
  setOrigin: () => TextRecord;
  setInteractive: () => TextRecord;
  setText: (text: string) => TextRecord;
  on: (event: string, callback: () => void) => TextRecord;
  destroy: () => void;
};
const labels: TextRecord[] = [];
let keydown: ((event: KeyboardEvent) => void) | undefined;
let shutdown: (() => void) | undefined;
let keyboardRemoved = false;
const scene = {
  add: {
    text: (_x: number, _y: number, initial: string) => {
      const record: TextRecord = {
        text: initial,
        destroyed: false,
        setOrigin: () => record,
        setInteractive: () => record,
        setText: (text) => { record.text = text; return record; },
        on: (event, callback) => { if (event === "pointerdown") record.pointerdown = callback; return record; },
        destroy: () => { record.destroyed = true; },
      };
      labels.push(record);
      return record;
    },
  },
  input: {
    keyboard: {
      on: (_event: string, callback: (event: KeyboardEvent) => void) => { keydown = callback; },
      off: () => { keyboardRemoved = true; },
    },
  },
  events: { once: (_event: string, callback: () => void) => { shutdown = callback; } },
};
const sceneConfig = config.scene as {
  create(this: typeof scene): void;
  update(this: typeof scene): void;
};
sceneConfig.create.call(scene);
const firstChoice = labels.find((label) => !label.destroyed && label.text.includes("feline"));
if (!firstChoice?.pointerdown) throw new Error("Generated pointer choice is unavailable");
firstChoice.pointerdown();
if (!keydown) throw new Error("Generated keyboard handler is unavailable");
keydown({ code: "Digit2" } as KeyboardEvent);
sceneConfig.update.call(scene);
keydown({ code: "Digit2" } as KeyboardEvent);
if (completed.length !== 1) throw new Error("Generated completion count was " + completed.length);
const result = completed[0] as { correctAnswers: number; totalAttempts: number };
if (result.correctAnswers !== 2 || result.totalAttempts !== 2) throw new Error("Generated result accounting is invalid");
shutdown?.();
if (!keyboardRemoved) throw new Error("Generated keyboard cleanup did not run");
`);

      const tsconfigPath = join(outputDirectory, "tsconfig.json");
      const compiler = resolve(REPO_ROOT, "node_modules/.bin/tsc");
      try {
        execFileSync(compiler, ["--noEmit", "-p", tsconfigPath], {
          cwd: outputDirectory,
          encoding: "utf8",
        });
      } catch (error) {
        const output = error as { readonly stdout?: string; readonly stderr?: string };
        throw new Error(`Generated cartridge type check failed:\n${output.stdout ?? ""}${output.stderr ?? ""}`);
      }

      const executable = resolve(REPO_ROOT, "node_modules/.bin/tsx");
      expect(() => execFileSync(executable, [
        "--tsconfig",
        tsconfigPath,
        join(outputDirectory, "runner.ts"),
      ], { cwd: outputDirectory, stdio: "pipe" })).not.toThrow();
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  }, 60_000);
});
