/**
 * Model assets (section 7 of docs/apk3d-cartridge.md): a GLB file entry, a pack manifest
 * (`demo/public/packs/<pack>/<version>/pack.json`, written by scripts/apk3d-models.ts), and the 3D
 * edition that maps semantic binding keys to pack files. The pack is the APK `AssetPackManifest`
 * shape with a new asset kind `'model'` and a `format: 'glb'` branch. It carries no hash field:
 * the monorepo hashing policy forbids a new hash on a new kind; `provenance.forgeCommit` is the
 * identity of a file, and the loader caches by pack id, version, and path.
 */
import { z } from 'zod';
import { semanticAssetKeySchema } from './apk.js';

/** The license of every model built from this repo (owner decision; LICENSE at the repo root). */
export const MODEL_LICENSE = 'AGPL-3.0-or-later';

/** The tool that writes pack manifests; provenance names it so a hand-edited pack is visible. */
export const MODEL_PACK_TOOL = 'scripts/apk3d-models.ts';

export const modelProvenanceSchema = z
  .object({
    /** The asset source in this repo, e.g. 'advantage-forge/assets/knight.ts'. */
    source: z.string().min(1),
    license: z.literal(MODEL_LICENSE),
    /** Git sha of the source at build time. */
    forgeCommit: z.string().regex(/^[0-9a-f]{7,40}$/),
    tool: z.literal(MODEL_PACK_TOOL),
  })
  .strict();

export const modelAssetFileSchema = z
  .object({
    id: z.string().min(1),
    /** Path relative to the pack root, e.g. 'knight.glb'. */
    path: z.string().min(1),
    kind: z.literal('model'),
    format: z.literal('glb'),
    byteSize: z.number().int().nonnegative(),
    triangles: z.number().int().nonnegative(),
    /** Atlas edge in pixels; 0 for vertex colors only. */
    textureSize: z.number().int().nonnegative(),
    skinned: z.boolean(),
    /** Animation clip names in the GLB. */
    clips: z.array(z.string().min(1)),
    /** Recolor preset names (docs/color-variants.md); empty for props. */
    presets: z.array(z.string().min(1)),
    provenance: modelProvenanceSchema,
  })
  .strict();

export const modelPackSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'pack id must be lowercase kebab-case'),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    /** URL root the file paths join to, e.g. 'packs/heroes'. */
    root: z.string().min(1),
    files: z.record(z.string().min(1), modelAssetFileSchema),
    /** Sum of the files' `byteSize`. */
    byteSize: z.number().int().nonnegative(),
  })
  .strict()
  .refine((pack) => Object.values(pack.files).reduce((sum, f) => sum + f.byteSize, 0) === pack.byteSize, {
    message: 'byteSize is not the sum of the files',
    path: ['byteSize'],
  });

export type ModelProvenance = z.infer<typeof modelProvenanceSchema>;
export type ModelAssetFile = z.infer<typeof modelAssetFileSchema>;
export type ModelPack = z.infer<typeof modelPackSchema>;

/** One binding: a semantic key ('hero.knight') to a file of a pack. */
export const modelBindingSchema = z.object({ pack: z.string().min(1), file: z.string().min(1) }).strict();

export type ModelBinding = z.infer<typeof modelBindingSchema>;

/** The two editions share bindings; `lite` points to packs built with smaller budgets. */
export const editionIdSchema = z.enum(['standard', 'lite']);

export type EditionId = z.infer<typeof editionIdSchema>;

/** The 3D counterpart of the APK `RuntimeEdition`: model bindings and tuning, never rules or input. */
export const runtimeEdition3DSchema = z
  .object({
    id: editionIdSchema,
    title: z.string().min(1),
    runtimeApiVersion: z.string().min(1),
    /** The packs by id, as loaded from their manifests. */
    packs: z.record(z.string().min(1), modelPackSchema),
    bindings: z.record(semanticAssetKeySchema, modelBindingSchema),
    tuning: z
      .object({
        /** Animation and motion speed multiplier. */
        speed: z.number().min(0.25).max(3),
        /** Audiovisual intensity from zero through one. */
        intensity: z.number().min(0).max(1),
        /** Optional cartridge-specific bounded values. */
        custom: z.record(z.string(), z.number().min(0).max(10)).optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((edition, ctx) => {
    for (const [key, binding] of Object.entries(edition.bindings)) {
      const pack = edition.packs[binding.pack];
      if (!pack) {
        ctx.addIssue({
          code: 'custom',
          message: `unknown pack "${binding.pack}"`,
          path: ['bindings', key, 'pack'],
        });
      } else if (!pack.files[binding.file]) {
        ctx.addIssue({
          code: 'custom',
          message: `unknown file "${binding.file}"`,
          path: ['bindings', key, 'file'],
        });
      }
    }
  });

export type RuntimeEdition3D = z.infer<typeof runtimeEdition3DSchema>;

/** The byte, triangle, and texture limits of section 7.3. */
export const MODEL_BUDGET = {
  /** First load per game (before the first interaction). */
  firstLoadBytes: 4_000_000,
  /** Total per game, shared packs counted once per session. */
  totalBytes: 6_000_000,
  /** Script, gzipped. */
  scriptBytes: 250_000,
  character: { bytes: 600_000, triangles: 16_000, textureSize: 512 },
  setPiece: { bytes: 200_000 },
  lite: { triangles: 8_000, textureSize: 384 },
} as const;

/** Sum of the byte sizes of the named packs; a pack counts once even when listed twice. */
export function packsByteSize(packs: Readonly<Record<string, ModelPack>>, ids: readonly string[]): number {
  let total = 0;
  for (const id of new Set(ids)) {
    const pack = packs[id];
    if (!pack) throw new Error(`unknown pack "${id}"`);
    total += pack.byteSize;
  }
  return total;
}
