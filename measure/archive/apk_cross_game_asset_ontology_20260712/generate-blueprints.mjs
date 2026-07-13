import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const trackDir = dirname(fileURLToPath(import.meta.url));
const corpus = JSON.parse(
  readFileSync(resolve(trackDir, "game-corpus.json"), "utf8"),
);

const mechanics = {
  "castle-defense": [
    "Build a word-powered castle defense",
    "collect or place sentence words in order to build towers and repel waves",
    "tap, drag, or select tower slots in a defended battlefield",
    "victory after the final wave; loss when the protected castle reaches zero health",
  ],
  "dragon-rider": [
    "Ride a dragon while protecting a village",
    "collect the correct vocabulary target while avoiding hazards",
    "directional flight through a scrolling village with camera and indicators",
    "complete the content set; lose health on wrong targets or hazards",
  ],
  "magic-defense": [
    "Cast typed spells to protect castles",
    "type each falling threat's translation before impact",
    "keyboard-first defense lanes with touch-accessible text input",
    "clear all waves or lose when protected castles fall",
  ],
  "rpg-battle": [
    "Win a fantasy duel through vocabulary mastery",
    "choose an action then type the requested translation",
    "turn-based menu and battle arena",
    "defeat the opponent or reach zero player health",
  ],
  "dragon-flight": [
    "Grow a dragon flight through correct gates",
    "steer through the gate matching the vocabulary translation",
    "horizontal steering in a forward-scrolling sky",
    "complete seeded rounds; wrong gates reduce growth or health",
  ],
  "wizard-vs-zombie": [
    "Survive a non-graphic magical horde",
    "collect the correct vocabulary orb while evading enemies",
    "free-roam arena movement with camera and indicators",
    "finish the vocabulary set or lose all health",
  ],
  "enchanted-library": [
    "Explore an enchanted archive for magic books",
    "collect the book matching the current vocabulary prompt while dodging spirits",
    "free-roam library with directional controls",
    "complete the vocabulary set or exhaust health/time",
  ],
  "rune-match": [
    "Defeat monsters by matching language runes",
    "select matching term and translation runes",
    "pointer/touch puzzle board with combat feedback",
    "clear the encounter set; mistakes consume attempts or enemy turns",
  ],
  "alchemists-synthesis": [
    "Synthesize spells in an alchemy workshop",
    "match and merge vocabulary ingredients into valid recipes",
    "drag/tap workstation with deterministic board state",
    "complete recipes before attempts or time expire",
  ],
  "potion-rush": [
    "Serve a busy magical potion shop",
    "collect conveyor ingredients in sentence order for each customer",
    "tap/drag conveyor and cauldron stations",
    "serve the order queue before patience/time expires",
  ],
  "dungeon-liberator": [
    "Rescue prisoners and escape a dungeon",
    "collect word-bearing prisoners in sentence order",
    "directional dungeon navigation with camera, collision, and exit",
    "open the exit after the sentence is complete or lose to hazards/time",
  ],
  "spellweavers-run": [
    "Weave a sentence while sprinting through a forest",
    "change lanes to collect word orbs in order",
    "three-lane runner using keys or lane taps",
    "finish the sentence/course; wrong orbs break the sequence or cost health",
  ],
  "shadow-gate-dungeon": [
    "Escape a shadow creature with ordered crystals",
    "collect sentence crystals in order while remaining outside detection",
    "free-roam dungeon with stealth radius and indicators",
    "complete the sentence and escape or lose health/time to the pursuer",
  ],
  "rune-forge-chamber": [
    "Forge a rune before the chamber cools",
    "tap word circles in sentence order",
    "radial pointer/touch sequencing around a forge",
    "complete the ordered sequence before the forge timer expires",
  ],
  "village-guardian": [
    "Rescue villagers and escort them to safety",
    "reach word-bearing villagers in sentence order",
    "directional village arena with follower and safe-zone state",
    "escort the full ordered group or lose to pursuer/time",
  ],
  "labyrinth-goblin-king": [
    "Become a paladin inside a goblin maze",
    "collect ordered word orbs then confront goblins",
    "maze navigation with camera, collisions, and empowered-state transition",
    "complete the sentence and final encounter or lose health/time",
  ],
  "archers-revenge": [
    "Become a precision archer",
    "shoot enemies matching the target translation and spare shielded decoys",
    "pointer/touch aiming and projectile combat",
    "clear target waves; incorrect or shielded hits consume attempts",
  ],
  "storm-castle-tower": [
    "Scale a besieged castle tower",
    "collect sentence words in order while climbing",
    "platform movement with vertical camera and falling hazards",
    "reach the summit with a complete sentence or lose health/time",
  ],
  "griffin-sky-joust": [
    "Joust through the sky on a griffin",
    "strike enemies carrying the next sentence word",
    "tap/key flap with horizontal drift and aerial collision",
    "complete the ordered targets or lose aerial health",
  ],
  "realm-carver": [
    "Carve safe territory through wild magic",
    "capture word beacons in sentence order",
    "directional movement over a territory grid with camera/minimap",
    "complete the ordered territory path or lose to corruption/time",
  ],
  "paladins-twin-soul": [
    "Reunite and strengthen paired paladins",
    "match vocabulary magic while surviving arena waves",
    "move and aim/fire with keyboard or virtual stick",
    "survive all waves with the pair intact or lose shared health",
  ],
  "griffin-riders-escape": [
    "Escape through sentence gates on a griffin",
    "fly through ordered word gates while avoiding obstacles",
    "vertical/lane steering in a scrolling sky",
    "complete the sentence flight or lose collision health",
  ],
  "astral-mage": [
    "Restore an astral ritual by shooting crystals",
    "shoot word crystals in sentence order",
    "free movement plus directional aim/fire in a bounded void",
    "complete the ritual sequence or lose health/time",
  ],
  "devourer-slime": [
    "Grow from tiny slime to knight-devourer",
    "eat words in sentence order to unlock growth tiers",
    "directional forest-arena movement and tiered collisions",
    "reach the final size and defeat enemies or lose health/time",
  ],
  "sorcerer-ziggurat": [
    "Complete a ritual atop an isometric ziggurat",
    "step across word cubes in sentence order",
    "deterministic directional tile-step graph",
    "reach the ritual summit with the sequence complete; invalid steps cost attempts",
  ],
  "haunted-library": [
    "Open enchanted doors across a haunted library",
    "find and open word doors in sentence order",
    "multi-floor directional exploration with room transitions",
    "complete the ordered doors and exit or lose to haunts/time",
  ],
  "gryphon-patrol": [
    "Patrol a broad sky realm for sentence targets",
    "hunt and select aerial targets in sentence order",
    "free flight with large-world camera, minimap, and indicators",
    "complete the patrol sequence or lose health/time",
  ],
  "abyssal-well": [
    "Defend a magical well from cycling threats",
    "target the current sentence word without leaking the next answer",
    "cancelled 3D arena evidence with camera, enemies, and projectiles",
    "complete the sentence waves or allow threats to breach the well",
  ],
  "babel-architect": [
    "Build a tower from correctly ordered words",
    "place or type sentence pieces in construction order",
    "provisional keyboard/pointer construction concept",
    "complete the sentence structure; exact failure loop remains product-owner provisional",
  ],
};

const blueprints = corpus.games.map((game) => {
  const [fantasy, loop, world, terminal] = mechanics[game.slug];
  return {
    id: `mechanic:${game.slug}:core`,
    gameId: game.id,
    sceneIds: game.sceneIds,
    fantasy,
    learningLoop: loop,
    worldAndControls: world,
    terminalState: terminal,
    retain: [
      "educational input mode and ordered/correct-answer semantics",
      "distinctive player fantasy and terminal loop",
      "GameResults-compatible scoring evidence",
    ],
    redesign: [
      "legacy React/Konva/R3F renderer assumptions",
      "fixed portrait coordinates and CSS breakpoint scaling",
      "client-owned persistence and XP authority",
    ],
    transitions: [
      "ready -> active only after explicit start",
      "correct action advances exactly one deterministic content step",
      "incorrect action records one attempt without skipping required content",
      "terminal state emits completion exactly once",
    ],
    counterexamples: [
      "resize must not reset content progress or duplicate completion",
      "duplicate labels must not share unstable identity",
      "wrong or out-of-order interaction must not advance progression",
    ],
    evidenceIds: game.evidenceIds,
    confidence: game.confidence,
  };
});

const outputDir = resolve(trackDir, "mechanic-blueprints");
mkdirSync(outputDir, { recursive: true });
for (const blueprint of blueprints) {
  const game = corpus.games.find((item) => item.id === blueprint.gameId);
  const md = `# ${game.title} Mechanic Blueprint

## Identity and fantasy

${blueprint.fantasy}. Canonical ID: \`${game.id}\`; confidence: **${blueprint.confidence}**.

## Learning loop

The player must ${blueprint.learningLoop}. Correct input advances one content step; incorrect or out-of-order input records feedback and an attempt without silently skipping required content.

## World and controls

${blueprint.worldAndControls}. The Phaser rebuild may choose native physics, cameras, pooling, and scene composition while preserving recognizable agency and target readability.

## Progression and terminal state

${blueprint.terminalState}. Score, accuracy, correct answers, and attempts map to the established \`GameResults\`; authoritative XP and persistence remain host-owned.

## Phaser rebuild boundary

**Retain:** ${blueprint.retain.join("; ")}.

**May redesign:** ${blueprint.redesign.join("; ")}.

## Deterministic Red-test evidence

${blueprint.transitions.map((item) => `- ${item}.`).join("\n")}

Counterexamples:

${blueprint.counterexamples.map((item) => `- ${item}.`).join("\n")}

## Evidence

${blueprint.evidenceIds.map((item) => `- \`${item}\``).join("\n")}
`;
  writeFileSync(resolve(outputDir, `${game.slug}.md`), md);
}
writeFileSync(
  resolve(trackDir, "mechanic-blueprints.json"),
  `${JSON.stringify(blueprints, null, 2)}\n`,
);
