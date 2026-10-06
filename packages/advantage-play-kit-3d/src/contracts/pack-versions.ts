/**
 * The version of each APK pack. Generated: `scripts/apk3d-models.ts` and `scripts/apk2d-pack.ts`
 * rewrite this file. A pack whose content changes gets the next patch version; a pack that adds
 * or removes a model gets the next minor version; an unchanged pack keeps its version.
 *
 * A 3D pack is served at `packs/<id>/<version>/`. The 2D pack `primary-chibi-2d` keeps its root
 * (`/assets/apk/primary-chibi-2d/v1`) and records its version in its `pack.json`.
 */
export const PACK_VERSIONS: Readonly<Record<string, string>> = {
  'dungeon-monsters': '1.0.1',
  'flight-land': '1.0.0',
  folk: '1.0.1',
  heroes: '1.0.1',
  mounts: '1.0.1',
  'outdoor-props': '1.0.0',
  'potion-shop': '1.0.0',
  'primary-chibi-2d': '1.1.0',
  'sunken-vault': '1.0.0',
};
