/**
 * The avatar pack (docs/avatar-system.md, section 7): the base, the pieces, the catalog, and the
 * portrait layers, written by scripts/avatar-pack.ts and scripts/avatar-portraits.ts.
 */
export const AVATAR_PACK_VERSION = '1.0.0';

/** The pack folder under the model pack root (out/ in the forge, the asset host in an app). */
export const avatarPackPath = (version: string = AVATAR_PACK_VERSION): string => `packs/avatar/${version}`;
