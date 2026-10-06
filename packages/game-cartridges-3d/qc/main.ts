/**
 * QC page: plays one game from the packaged code and assets with a student's saved flashcards
 * (`?game=<id>&renderer=three|phaser`). `window.__qc` exposes the session, the completion result,
 * and the diagnostics for the Playwright run.
 */
import { startStoryGame, type StoryGameSession } from "@reading-advantage/advantage-play-kit-3d/host";
import { parsePracticeInput } from "@reading-advantage/advantage-play-kit-3d/contracts";
import { GAMES, hostStrings } from "../src/index.js";
import { savedItems } from "./saved-items.js";

const params = new URLSearchParams(location.search);
const gameId = params.get("game") ?? "labyrinth";
const setting = params.get("renderer") === "phaser" ? "phaser" : "auto";
const qc: { session: StoryGameSession | null; completed: unknown; exited: boolean; ready: boolean } = { session: null, completed: null, exited: false, ready: false };
(window as unknown as { __qc: typeof qc }).__qc = qc;

const entry = GAMES.find((g) => g.id === gameId);
if (!entry?.load) throw new Error(`unknown game ${gameId}`);
const cartridge = await entry.load();
qc.session = startStoryGame({
  container: document.getElementById("app")!,
  cartridge,
  input: parsePracticeInput(savedItems, "QC saved items"),
  icon: entry.icon,
  assetBase: "/",
  setting,
  catalogs: [hostStrings],
  onComplete: (result, outcome, evidence) => {
    qc.completed = { result, outcome, evidence };
  },
  onExit: () => {
    qc.exited = true;
  },
});
qc.ready = true;
