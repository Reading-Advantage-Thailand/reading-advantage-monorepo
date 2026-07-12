import { APKRuntimeError } from "../runtime/errors.js";
import type {
  AssetAnimation,
  AssetPackManifest,
  AssetView,
  FrameGrid,
  NineSliceInsets,
  PhysicalAssetFile,
  PhysicalAssetKind,
} from "../runtime/types.js";
import {
  CHARACTER_COLLISION,
  CHARACTER_ORIGIN,
  DOOR_PROP_GRID,
  FOUR_FRAME_PROP_GRID,
  FOUR_FRAME_VFX_GRID,
  ISOMETRIC_WANG_TILE_GRID,
  SIDE_SCROLL_CHARACTER_ANIMATIONS,
  SIDE_SCROLL_CHARACTER_GRID,
  TOP_DOWN_CHARACTER_ANIMATIONS,
  TOP_DOWN_CHARACTER_GRID,
  WANG_MASK_FRAMES,
  WANG_TILE_GRID,
} from "./asset-contract.js";

/** Structural file metadata required before encoded hashes and provenance exist. */
export type PhysicalAssetRequirement = Omit<
  PhysicalAssetFile,
  "byteSize" | "sha256" | "provenance"
>;

const PLAYER_IDS = ["knight", "wizard", "archer", "barbarian"] as const;
const ENEMY_ACTOR_IDS = ["skeleton", "skeleton_mage", "slime", "goblin"] as const;
const NPC_IDS = ["shopkeeper", "quest_giver", "villager"] as const;
const PNG = { format: "png", alpha: true } as const;

/**
 * Creates the exact top-down and side-scroll sheets for one actor roster.
 * @param directory Pack directory containing the actor sheets.
 * @param names Stable actor base names.
 * @returns Paired view-specific actor requirements.
 */
function createActorRequirements(
  directory: "characters" | "enemies" | "npcs",
  names: readonly string[],
): PhysicalAssetRequirement[] {
  return names.flatMap((name) => [
    {
      id: `${directory}/${name}_top`,
      path: `${directory}/${name}_top.png`,
      kind: "spritesheet",
      view: "top-down",
      width: 512,
      height: 1024,
      ...PNG,
      grid: TOP_DOWN_CHARACTER_GRID,
      animations: TOP_DOWN_CHARACTER_ANIMATIONS,
      origin: CHARACTER_ORIGIN,
      collision: CHARACTER_COLLISION,
    },
    {
      id: `${directory}/${name}_side`,
      path: `${directory}/${name}_side.png`,
      kind: "spritesheet",
      view: "side-scroll",
      width: 512,
      height: 512,
      ...PNG,
      grid: SIDE_SCROLL_CHARACTER_GRID,
      animations: SIDE_SCROLL_CHARACTER_ANIMATIONS,
      origin: CHARACTER_ORIGIN,
      collision: CHARACTER_COLLISION,
    },
  ]);
}

/**
 * Creates one immutable image requirement.
 * @param id Stable file ID and extension-free relative path.
 * @param view Projection context for the image.
 * @param width Encoded width.
 * @param height Encoded height.
 * @param kind Loader kind.
 * @param nineSlice Optional stretch-safe border insets.
 * @returns Exact image requirement.
 */
function createImageRequirement(
  id: string,
  view: AssetView,
  width: number,
  height: number,
  kind: Extract<PhysicalAssetKind, "image" | "nine-slice" | "parallax"> = "image",
  nineSlice?: NineSliceInsets,
): PhysicalAssetRequirement {
  return {
    id,
    path: `${id}.png`,
    kind,
    view,
    width,
    height,
    ...PNG,
    ...(nineSlice ? { nineSlice } : {}),
  };
}

/**
 * Creates one exact 16-mask Wang tileset requirement.
 * @param id Stable file ID and extension-free path.
 * @param view Tile projection.
 * @param grid Exact rectangular frame grid.
 * @returns Exact Wang sheet requirement.
 */
function createWangRequirement(
  id: string,
  view: Extract<AssetView, "top-down" | "side-scroll" | "isometric">,
  grid: FrameGrid,
): PhysicalAssetRequirement {
  return {
    id,
    path: `${id}.png`,
    kind: "wang-tileset",
    view,
    width: grid.frameWidth * grid.columns,
    height: grid.frameHeight * grid.rows,
    ...PNG,
    grid,
    wangFrames: WANG_MASK_FRAMES,
  };
}

/**
 * Creates one spritesheet requirement with a single named animation.
 * @param id Stable file ID and extension-free path.
 * @param grid Exact frame grid.
 * @param animation Named playback contract.
 * @returns Exact animated-sheet requirement.
 */
function createAnimatedRequirement(
  id: string,
  grid: FrameGrid,
  animation: AssetAnimation,
): PhysicalAssetRequirement {
  return {
    id,
    path: `${id}.png`,
    kind: "spritesheet",
    view: "world",
    width: grid.frameWidth * grid.columns,
    height: grid.frameHeight * grid.rows,
    ...PNG,
    grid,
    animations: { [animation.name]: animation },
  };
}

const ACTORS = [
  ...createActorRequirements("characters", PLAYER_IDS),
  ...createActorRequirements("enemies", ENEMY_ACTOR_IDS),
  ...createActorRequirements("npcs", NPC_IDS),
];

const PORTRAITS = [
  ...PLAYER_IDS.map((name) => createImageRequirement(`characters/${name}_portrait`, "ui", 128, 128)),
  createImageRequirement("npcs/shopkeeper_portrait", "ui", 128, 128),
  createImageRequirement("npcs/quest_giver_portrait", "ui", 128, 128),
  createImageRequirement("enemies/skeleton_portrait", "ui", 128, 128),
  createImageRequirement("enemies/boss_dragon_portrait", "ui", 128, 128),
];

const TILESETS = [
  createWangRequirement("tiles/dungeon_floor", "top-down", WANG_TILE_GRID),
  createWangRequirement("tiles/dungeon_walls", "top-down", WANG_TILE_GRID),
  createWangRequirement("tiles/castle_interior", "top-down", WANG_TILE_GRID),
  createWangRequirement("tiles/forest_terrain", "side-scroll", WANG_TILE_GRID),
  createWangRequirement("tiles/forest_platform", "side-scroll", WANG_TILE_GRID),
  createWangRequirement("tiles/iso_meadow", "isometric", ISOMETRIC_WANG_TILE_GRID),
  createWangRequirement("tiles/iso_dungeon", "isometric", ISOMETRIC_WANG_TILE_GRID),
];

const PROPS = [
  createAnimatedRequirement("props/chest", FOUR_FRAME_PROP_GRID, {
    name: "open", frames: [0, 1, 2, 3], frameRate: 8, repeat: 0,
  }),
  createAnimatedRequirement("props/torch", FOUR_FRAME_PROP_GRID, {
    name: "flicker", frames: [0, 1, 2, 3], frameRate: 8, repeat: -1,
  }),
  createImageRequirement("props/crate", "world", 64, 64),
  createImageRequirement("props/pot", "world", 64, 64),
  createAnimatedRequirement("props/spikes", FOUR_FRAME_PROP_GRID, {
    name: "trigger", frames: [0, 1, 2, 3], frameRate: 4, repeat: -1, yoyo: true,
  }),
  createAnimatedRequirement("props/door", DOOR_PROP_GRID, {
    name: "open", frames: [0, 1, 2], frameRate: 6, repeat: 0,
  }),
];

const ITEMS = [
  "sword_iron", "sword_fire", "axe_war", "bow_wood", "staff_mage",
  "shield_basic", "potion_health", "potion_mana", "key_gold", "coin_gold",
].map((name) => createImageRequirement(`items/${name}`, "ui", 64, 64));

const VFX = [
  "slash", "fireball", "hit_spark", "heal", "levelup", "poison",
].map((name) => createAnimatedRequirement(`vfx/${name}`, FOUR_FRAME_VFX_GRID, {
  name: "play", frames: [0, 1, 2, 3], frameRate: 12, repeat: 0,
}));

const UI = [
  createImageRequirement("ui/panel_9slice", "ui", 128, 128, "nine-slice", {
    left: 24, right: 24, top: 24, bottom: 24,
  }),
  createImageRequirement("ui/healthbar", "ui", 256, 32),
  createImageRequirement("ui/manabar", "ui", 256, 32),
  createImageRequirement("ui/xpbar", "ui", 512, 24),
  createImageRequirement("ui/button_primary", "ui", 256, 64),
  createImageRequirement("ui/button_secondary", "ui", 256, 64),
  createImageRequirement("ui/dialog_frame", "ui", 640, 192, "nine-slice", {
    left: 32, right: 32, top: 32, bottom: 32,
  }),
  createImageRequirement("ui/inventory_slot", "ui", 64, 64),
  createImageRequirement("ui/minimap_frame", "ui", 192, 192),
  createImageRequirement("ui/cursor", "ui", 64, 64),
];

const BACKGROUNDS = [
  "forest_parallax_far", "forest_parallax_mid", "forest_parallax_near",
  "dungeon_parallax_far", "dungeon_parallax_mid",
].map((name) => createImageRequirement(`backgrounds/${name}`, "side-scroll", 1280, 720, "parallax"));

/** Exact 75-file physical inventory required independently in both audience packs. */
export const REQUIRED_PHYSICAL_ASSETS: readonly PhysicalAssetRequirement[] = Object.freeze([
  ...ACTORS,
  createImageRequirement("enemies/boss_dragon", "world", 256, 256),
  ...PORTRAITS,
  ...TILESETS,
  ...PROPS,
  ...ITEMS,
  ...VFX,
  ...UI,
  ...BACKGROUNDS,
]);

/**
 * Extracts the structural fields that must match the production requirement.
 * @param file Requirement or encoded physical file.
 * @returns Comparable physical structure without content-derived metadata.
 */
function structuralShape(file: PhysicalAssetRequirement | PhysicalAssetFile): PhysicalAssetRequirement {
  return {
    id: file.id,
    path: file.path,
    kind: file.kind,
    view: file.view,
    width: file.width,
    height: file.height,
    format: file.format,
    alpha: file.alpha,
    ...(file.grid ? { grid: file.grid } : {}),
    ...(file.animations ? { animations: file.animations } : {}),
    ...(file.origin ? { origin: file.origin } : {}),
    ...(file.collision ? { collision: file.collision } : {}),
    ...(file.wangFrames ? { wangFrames: file.wangFrames } : {}),
    ...(file.nineSlice ? { nineSlice: file.nineSlice } : {}),
  };
}

/**
 * Validates that an encoded pack implements the complete canonical 75-file inventory.
 * @param pack Untrusted or assembled audience pack manifest.
 * @returns The validated original pack.
 * @throws When the pack ID, file set, or any physical structure differs.
 */
export function validateCompleteAssetPack(pack: AssetPackManifest): AssetPackManifest {
  if (!["chibi-quest", "riven-lands"].includes(pack.id)) {
    throw new APKRuntimeError("INVALID_EDITION", `Unsupported production asset pack ${pack.id}`);
  }
  const expectedIds = REQUIRED_PHYSICAL_ASSETS.map((file) => file.id).sort();
  const actualIds = Object.keys(pack.files).sort();
  if (JSON.stringify(expectedIds) !== JSON.stringify(actualIds)) {
    const missing = expectedIds.filter((id) => !actualIds.includes(id));
    const extra = actualIds.filter((id) => !expectedIds.includes(id));
    throw new APKRuntimeError("INVALID_EDITION", "Production asset pack file inventory mismatch", {
      missing,
      extra,
    });
  }
  for (const requirement of REQUIRED_PHYSICAL_ASSETS) {
    const actual = pack.files[requirement.id]!;
    if (JSON.stringify(structuralShape(actual)) !== JSON.stringify(structuralShape(requirement))) {
      throw new APKRuntimeError(
        "INVALID_EDITION",
        `Production asset ${requirement.id} violates its physical requirement`,
      );
    }
  }
  return pack;
}
