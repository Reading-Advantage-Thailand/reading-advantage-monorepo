import {
  APK_RUNTIME_API_VERSION,
  type PhysicalAssetFile,
  type RuntimeEdition,
  type SemanticAssetBinding,
} from "@reading-advantage/advantage-play-kit/runtime";

import { listCartridgeCatalog } from "./catalog.js";
import { CATALOG_WORLD_ART_FILES } from "./catalog-standard-art-files.js";
import { WIZARD_STANDARD_ART_FILES } from "./wizard-standard-art.js";
import { LABYRINTH_STANDARD_ART_FILES } from "./labyrinth-standard-art.js";
import { STORM_STANDARD_ART_FILES } from "./storm-standard-art.js";
import { ABYSSAL_STANDARD_ART_FILES } from "./abyssal-standard-art.js";

/** Closed live-catalog art decision for one role. */
export type CatalogArtDecision = "reuse-canonical" | "block";

/** One reuse or block decision for a catalog title role. */
export interface CatalogTitleArtDecision {
  /** Public cartridge identifier. */
  readonly titleId: string;
  /** Product role drawn in the live catalog. */
  readonly role: "player" | "enemy" | "ground" | "prop";
  /** Product state for the role. */
  readonly state: "idle" | "static";
  /** Canonical file id from the selected union. */
  readonly semanticKey: string;
  /** Live decision for this role. */
  readonly decision: CatalogArtDecision;
}

/** Selected files that paint one catalog title. */
interface TitleArtKit {
  readonly ground: string;
  readonly props: readonly string[];
  readonly player: string;
  readonly enemy: string;
  /** Named bindings placed by the owning scene, such as a road or keep. */
  readonly extras?: Readonly<Record<string, string>>;
}

const PLAYER_KEY = "player:idle";
const ENEMY_KEY = "enemy:idle";
const GROUND_KEY = "world:ground";
const ELVGAMES_PROVENANCE = Object.freeze({
  source: "ElvGames standard pack 2026.07.23",
  license: "LicenseRef-ElvGames",
  creator: "ElvGames",
});

const PLAYER_FILE: PhysicalAssetFile = Object.freeze({
  id: "player-idle",
  path: "asset-6aeab3f50c0f6be4.png",
  kind: "spritesheet",
  view: "top-down",
  width: 192,
  height: 384,
  format: "png",
  alpha: true,
  byteSize: 3670,
  sha256: "6aeab3f50c0f6be436eeb5594e7d9c1ae31f8f19ac3bdfa04d7fbcbf856ba5e4",
  grid: {
    frameWidth: 32,
    frameHeight: 32,
    columns: 6,
    rows: 12,
    frameCount: 72,
  },
  provenance: ELVGAMES_PROVENANCE,
});

const ENEMY_FILE: PhysicalAssetFile = Object.freeze({
  id: "enemy-idle",
  path: "asset-0edfb7ed11f9c4cf.png",
  kind: "spritesheet",
  view: "side-scroll",
  width: 192,
  height: 32,
  format: "png",
  alpha: true,
  byteSize: 981,
  sha256: "0edfb7ed11f9c4cf46dfb97e2b158e391202dbf944789c059b0ec0b68e0492db",
  grid: {
    frameWidth: 32,
    frameHeight: 32,
    columns: 6,
    rows: 1,
    frameCount: 6,
  },
  provenance: ELVGAMES_PROVENANCE,
});

const ENCHANTED_LIBRARY_BOOKSHELF_FILE: PhysicalAssetFile = Object.freeze({
  id: "enchanted-library-bookshelf",
  path: "enchanted-library-bookshelf.png",
  kind: "image",
  view: "top-down",
  width: 16,
  height: 32,
  format: "png",
  alpha: true,
  byteSize: 395,
  sha256: "10c44a679253ed3d2f580f06cceae0a865d08364826e74faa155c3e91e8b82e0",
  provenance: ELVGAMES_PROVENANCE,
});

const ALL_ART_FILES: Readonly<Record<string, PhysicalAssetFile>> = Object.freeze({
  [PLAYER_FILE.id]: PLAYER_FILE,
  [ENEMY_FILE.id]: ENEMY_FILE,
  [ENCHANTED_LIBRARY_BOOKSHELF_FILE.id]: ENCHANTED_LIBRARY_BOOKSHELF_FILE,
  ...CATALOG_WORLD_ART_FILES,
  ...WIZARD_STANDARD_ART_FILES,
  ...LABYRINTH_STANDARD_ART_FILES,
  ...STORM_STANDARD_ART_FILES,
  ...ABYSSAL_STANDARD_ART_FILES,
});

const TITLE_KITS: Readonly<Record<string, TitleArtKit>> = Object.freeze({
  "castle-defense": {
    ground: "tile-grass",
    props: ["prop-tower", "prop-tree"],
    player: "player-knight",
    enemy: "enemy-beast",
    extras: {
      "world:road": "tile-dirt",
      "prop:keep": "prop-keep",
      "prop:gate": "prop-gate",
      "prop:tower": "prop-tower",
      "prop:tree": "prop-tree",
      "prop:prisoner": "player-mage",
    },
  },
  "storm-castle-tower": {
    ground: "tile-brick",
    props: ["prop-tower", "prop-tower"],
    player: "player-knight",
    enemy: "enemy-beast",
    extras: { "world:tower-wall": "storm-castle-blue-wall" },
  },
  "magic-defense": {
    ground: "tile-grass",
    props: ["prop-side-tower", "prop-tree"],
    player: "player-mage",
    enemy: "enemy-spirit",
    extras: {
      "world:road": "tile-dirt",
      "prop:tower": "prop-side-tower",
      "prop:tree": "prop-tree",
    },
  },
  "village-guardian": { ground: "tile-grass", props: ["prop-tree", "prop-tower"], player: "player-knight", enemy: "enemy-beast" },
  "dragon-flight": {
    ground: "tile-grass",
    props: ["prop-sky-gate"],
    player: "dragon-flight-idle",
    enemy: "enemy-bat",
    extras: {
      "prop:gate": "prop-sky-gate",
      "world:parallax-far": "parallax-far",
      "world:parallax-mid": "parallax-mid",
      "world:parallax-near": "parallax-near",
    },
  },
  "dragon-rider": {
    ground: "tile-grass",
    props: ["prop-sky-gate"],
    player: "dragon-rider-idle",
    enemy: "enemy-bat",
    extras: {
      "prop:gate": "prop-sky-gate",
      "world:parallax-far": "parallax-far",
      "world:parallax-mid": "parallax-mid",
      "world:parallax-near": "parallax-near",
    },
  },
  "griffin-sky-joust": {
    ground: "tile-grass",
    props: ["prop-tree"],
    player: "dragon-rider-idle",
    enemy: "enemy-bat",
    extras: {
      "world:parallax-far": "parallax-far",
      "world:parallax-mid": "parallax-mid",
      "world:parallax-near": "parallax-near",
      "prop:gate": "prop-sky-gate",
    },
  },
  "griffin-riders-escape": { ground: "tile-grass", props: ["prop-tree"], player: "player-paladin", enemy: "enemy-bat" },
  "gryphon-patrol": {
    ground: "tile-grass",
    props: ["prop-tree"],
    player: "dragon-rider-idle",
    enemy: "enemy-bat",
    extras: {
      "world:parallax-far": "parallax-far",
      "world:parallax-mid": "parallax-mid",
      "world:parallax-near": "parallax-near",
      "prop:gate": "prop-sky-gate",
    },
  },
  "dungeon-liberator": { ground: "wizard-floor", props: ["prop-tower"], player: "labyrinth-player-idle", enemy: "labyrinth-goblin-static" },
  "shadow-gate-dungeon": { ground: "tile-stone", props: ["prop-tower"], player: "player-knight", enemy: "enemy-spirit" },
  "labyrinth-goblin-king": { ground: "wizard-floor", props: ["prop-tree"], player: "labyrinth-player-idle", enemy: "labyrinth-goblin-static" },
  "sorcerer-ziggurat": { ground: "tile-stone", props: ["prop-tower"], player: "player-wizard", enemy: "enemy-spirit" },
  "abyssal-well": {
    ground: "wizard-floor",
    props: [],
    player: "wizard-player",
    enemy: "wizard-undead",
    extras: { "world:well-mouth": "abyssal-well-mouth" },
  },
  "haunted-library": { ground: "tile-stone", props: ["prop-grave", "prop-grave"], player: "player-mage", enemy: "enemy-spirit" },
  "enchanted-library": {
    ground: "tile-stone",
    props: ["enchanted-library-bookshelf", "enchanted-library-bookshelf"],
    player: "player-wizard",
    enemy: "enemy-spirit",
  },
  "wizard-vs-zombie": {
    ground: "tile-grass",
    props: ["wizard-grave", "wizard-grave-b", "wizard-grave-c", "wizard-mausoleum", "wizard-dead-tree-large"],
    player: "wizard-player",
    enemy: "wizard-undead",
    extras: {
      "prop:grave": "wizard-grave",
      "prop:grave-a": "wizard-grave",
      "prop:grave-b": "wizard-grave-b",
      "prop:grave-c": "wizard-grave-c",
      "prop:memorial": "wizard-memorial",
      "prop:crypt": "wizard-crypt",
      "prop:mausoleum": "wizard-mausoleum",
      "prop:dead-tree-large": "wizard-dead-tree-large",
      "prop:dead-tree-small": "wizard-dead-tree-small",
      "prop:fence": "wizard-fence",
      "prop:lantern": "wizard-lantern",
      "prop:gate": "wizard-gate",
      "prop:orb": "prop-crystal-blue",
      "world:path": "tile-dirt",
      "wizard-floor": "wizard-floor",
    },
  },
  "rpg-battle": {
    ground: "tile-grass",
    props: ["prop-tree"],
    player: "player-knight",
    enemy: "enemy-beast",
    extras: {
      "world:platform": "tile-dirt",
      "prop:tree": "prop-tree",
    },
  },
  "paladins-twin-soul": { ground: "tile-brick", props: ["prop-tower"], player: "player-paladin", enemy: "enemy-beast" },
  "archers-revenge": { ground: "tile-grass", props: ["prop-tree"], player: "player-archer", enemy: "enemy-bat" },
  "potion-rush": { ground: "tile-grass", props: ["prop-tree"], player: "player-mage", enemy: "enemy-spirit" },
  "alchemists-synthesis": { ground: "tile-stone", props: ["prop-tower"], player: "player-wizard", enemy: "enemy-spirit" },
  "rune-match": { ground: "tile-stone", props: ["prop-tower"], player: "player-wizard", enemy: "enemy-beast" },
  "rune-forge-chamber": { ground: "wizard-floor", props: ["prop-tower"], player: "player-mage", enemy: "enemy-spirit" },
  "astral-mage": { ground: "tile-stone", props: ["prop-tower"], player: "player-wizard", enemy: "enemy-spirit" },
  "realm-carver": { ground: "wizard-floor", props: ["prop-tree"], player: "labyrinth-player-idle", enemy: "labyrinth-goblin-static" },
  "devourer-slime": { ground: "tile-grass", props: ["prop-tree"], player: "enemy-idle", enemy: "player-knight" },
  "spellweavers-run": { ground: "tile-grass", props: ["prop-tree"], player: "player-wizard", enemy: "enemy-spirit" },
});

const DEFAULT_KIT: TitleArtKit = Object.freeze({
  ground: "tile-grass",
  props: Object.freeze(["prop-tree"]),
  player: "player-idle",
  enemy: "enemy-idle",
});

const ENEMY_BINDING_PATTERN = /enemy|monster|zombie|spirit|ghost|goblin|knight|bat|beast/iu;

/**
 * Resolves the selected-union kit for one catalog title.
 * @param titleId Public cartridge identifier.
 * @returns Ground, prop, player, and enemy file ids.
 */
function kitForTitle(titleId: string | undefined): TitleArtKit {
  if (titleId && TITLE_KITS[titleId]) return TITLE_KITS[titleId];
  return DEFAULT_KIT;
}

/**
 * Builds a semantic image or frame binding for one selected-union file.
 * @param key Semantic binding key.
 * @param fileId Physical file id in the selected union.
 * @returns A frozen semantic binding.
 */
function bindingFor(key: string, fileId: string): SemanticAssetBinding {
  const file = ALL_ART_FILES[fileId];
  if (!file) {
    throw new Error(`Catalog art is missing physical file ${fileId}`);
  }
  return Object.freeze({
    key,
    file: file.id,
    usage: file.kind === "spritesheet" ? "frame" : "image",
    view: file.view,
    ...(file.kind === "spritesheet" ? { frame: 0 } : {}),
  });
}

/**
 * Lists reuse-canonical ground, prop, player, and enemy decisions for every public cartridge.
 * @returns Frozen per-title role decisions for the live catalog.
 */
export function listCatalogStandardArtDecisions(): readonly CatalogTitleArtDecision[] {
  return Object.freeze(
    listCartridgeCatalog().flatMap((entry) => {
      const kit = kitForTitle(entry.id);
      return [
        Object.freeze({
          titleId: entry.id,
          role: "ground",
          state: "static",
          semanticKey: kit.ground,
          decision: "reuse-canonical",
        } satisfies CatalogTitleArtDecision),
        ...kit.props.map((prop) => Object.freeze({
          titleId: entry.id,
          role: "prop",
          state: "static",
          semanticKey: prop,
          decision: "reuse-canonical",
        } satisfies CatalogTitleArtDecision)),
        ...Object.entries(kit.extras ?? {}).map(([key, fileId]) => Object.freeze({
          titleId: entry.id,
          role: key.startsWith("world:") ? "ground" : "prop",
          state: "static",
          semanticKey: fileId,
          decision: "reuse-canonical",
        } satisfies CatalogTitleArtDecision)),
        Object.freeze({
          titleId: entry.id,
          role: "player",
          state: "idle",
          semanticKey: kit.player,
          decision: "reuse-canonical",
        } satisfies CatalogTitleArtDecision),
        Object.freeze({
          titleId: entry.id,
          role: "enemy",
          state: "idle",
          semanticKey: kit.enemy,
          decision: "reuse-canonical",
        } satisfies CatalogTitleArtDecision),
      ];
    }),
  );
}

/**
 * Builds the live catalog edition from the accepted selected union.
 * @param requiredBindings Cartridge-declared binding keys that must remain present.
 * @param packRoot Canonical selected-union URL root.
 * @param titleId Public cartridge identifier used to choose world and character art.
 * @returns A runtime edition with ground, props, player, and enemy art.
 */
export function createCatalogStandardEdition(
  requiredBindings: readonly string[],
  packRoot: string,
  titleId?: string,
): RuntimeEdition {
  const kit = kitForTitle(titleId);
  const bindings: Record<string, SemanticAssetBinding> = {
    [GROUND_KEY]: bindingFor(GROUND_KEY, kit.ground),
    [PLAYER_KEY]: bindingFor(PLAYER_KEY, kit.player),
    [ENEMY_KEY]: bindingFor(ENEMY_KEY, kit.enemy),
  };
  kit.props.forEach((prop, index) => {
    const key = `prop:${index}`;
    bindings[key] = bindingFor(key, prop);
  });
  for (const [key, fileId] of Object.entries(kit.extras ?? {})) {
    bindings[key] = bindingFor(key, fileId);
  }
  for (const key of requiredBindings) {
    if (bindings[key]) continue;
    const fileId = ENEMY_BINDING_PATTERN.test(key) ? kit.enemy : kit.player;
    bindings[key] = bindingFor(key, fileId);
  }

  const usedIds = new Set(Object.values(bindings).map((binding) => binding.file));
  const files: Record<string, PhysicalAssetFile> = {};
  for (const id of usedIds) {
    const file = ALL_ART_FILES[id];
    if (file) files[id] = file;
  }

  return {
    id: "catalog-standard-pack",
    title: "Catalog standard pack",
    runtimeApiVersion: APK_RUNTIME_API_VERSION,
    pack: {
      id: "standard-pack-qc",
      version: "1.0.0",
      root: packRoot.endsWith("/") ? packRoot : `${packRoot}/`,
      files,
    },
    bindings,
    tuning: {
      speed: 1,
      targetScale: 1,
      collisionScale: 1,
      intensity: 0.5,
    },
  };
}
