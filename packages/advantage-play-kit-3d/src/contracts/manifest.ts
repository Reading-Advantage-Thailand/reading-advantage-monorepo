/**
 * Cartridge3DManifest: the APK `runtimeCartridgeManifestSchema` plus the additive 3D fields
 * (section 2.1 of docs/apk3d-cartridge.md) and `renderers` (the "Dual renderer" section). The APK
 * validator keeps its fields; a Phaser host that reads only the base fields still accepts it.
 */
import { z } from 'zod';
import { APK_RUNTIME_API_VERSION, runtimeCartridgeManifestSchema, semanticAssetKeySchema } from './apk.js';
import { cefrLevelSchema } from './story-input.js';

/**
 * What a device must offer to run the game (checked by `device/gate.ts`, section 9). The kit
 * default matches the gate's own thresholds, so a game overrides a field only when it needs more.
 */
export const deviceRequirementsSchema = z
  .object({
    /** Minimum `MAX_TEXTURE_SIZE`. */
    minTextureSize: z.number().int().positive().default(2048),
    /** Minimum `MAX_VERTEX_TEXTURE_IMAGE_UNITS` (bone textures for skinning). */
    minVertexTextureUnits: z.number().int().positive().default(4),
    /** Minimum iOS major version (Safari 15 ships WebGL2). */
    minIosVersion: z.number().int().positive().default(15),
    /** Minimum Chrome major version in an Android WebView. */
    minWebViewChromeVersion: z.number().int().positive().default(80),
  })
  .strict();

export type DeviceRequirements = z.infer<typeof deviceRequirementsSchema>;

/** The kit default device requirements (every field at its default). */
export const DEVICE_REQUIREMENTS_DEFAULT: DeviceRequirements = deviceRequirementsSchema.parse({});

/** Story items the game must have; a story with fewer items is incompatible (section 5.4). */
export const storyNeedsSchema = z
  .object({
    vocabulary: z.number().int().min(0).default(0),
    sentences: z.number().int().min(0).default(0),
    fills: z.number().int().min(0).default(0),
    questions: z.number().int().min(0).default(0),
  })
  .strict();

/** The renderers a cartridge can expose: `createGame` (three.js) and `createGameConfig` (Phaser). */
export const rendererIdSchema = z.enum(['three', 'phaser']);

export type RendererId = z.infer<typeof rendererIdSchema>;

export const cartridge3DManifestSchema = runtimeCartridgeManifestSchema.extend({
  /**
   * The renderers this cartridge implements, each backed by its method on the cartridge
   * (`createGame` for 'three', `createGameConfig` for 'phaser'); the host picks one with
   * `selectRenderer` (the device gate, then a player setting). A plain APK cartridge has no
   * field: it is 'phaser' only.
   */
  renderers: z
    .array(rendererIdSchema)
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'renderers must be unique' }),
  /** 'story' = the whole StoryInput (section 5); the other two are the APK derived arrays. */
  inputMode: z.enum(['vocabulary', 'sentence', 'story']),
  /** Both run on the fixed step (section 10); a turn game returns no events from `tick`. */
  simulation: z.enum(['turn', 'realtime']),
  /** 'portrait' for every phone-first game. */
  orientation: z.enum(['portrait', 'landscape', 'any']),
  /** CEFR levels the game plays well. */
  levels: z.array(cefrLevelSchema).min(1),
  needs: storyNeedsSchema,
  /** 'hero.knight', 'enemy.skeleton', 'set.vault': keys of `RuntimeEdition3D.bindings`. */
  requiredModelBindings: z.array(semanticAssetKeySchema),
  /** Pack ids this game loads (section 7). */
  packs: z.array(z.string().min(1)).min(1),
  device: deviceRequirementsSchema,
  /** Byte limits for the game's packs (section 7.3): before the first interaction, and in all. */
  budget: z
    .object({ firstLoadBytes: z.number().int().positive(), totalBytes: z.number().int().positive() })
    .strict(),
  /** Catalog scope of the briefing text (section 8), e.g. 'potionRush'. */
  briefingKey: z.string().min(1),
});

export type Cartridge3DManifest = z.infer<typeof cartridge3DManifestSchema>;

/** The same manifest under the name the dual-renderer kit uses. */
export type CartridgeManifest = Cartridge3DManifest;

/** True when the manifest lists the renderer. */
export const hasRenderer = (manifest: Pick<CartridgeManifest, 'renderers'>, renderer: RendererId): boolean =>
  manifest.renderers.includes(renderer);

/** The runtime API version a 3D manifest declares (the APK constant). */
export const CARTRIDGE_3D_RUNTIME_API_VERSION = APK_RUNTIME_API_VERSION;

/**
 * Validates a 3D cartridge manifest the host is about to mount.
 * @throws with every problem listed, in the APK message style.
 */
export function validateCartridge3DManifest(manifest: unknown): Cartridge3DManifest {
  const parsed = cartridge3DManifestSchema.safeParse(manifest);
  if (!parsed.success) {
    throw new Error(
      `Cartridge manifest validation failed: ${parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ')}`,
    );
  }
  return parsed.data;
}
