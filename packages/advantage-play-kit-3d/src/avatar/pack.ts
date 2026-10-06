/**
 * The avatar pack (docs/avatar-system.md, section 7): the base, the pieces, the catalog, and the
 * portrait layers, written by scripts/avatar-pack.ts and scripts/avatar-portraits.ts.
 */
import { AVATAR_PACK_VERSION } from './pack-version.js';

export { AVATAR_PACK_VERSION };

/** The pack folder under the model pack root (out/ in the forge, the asset host in an app). */
export const avatarPackPath = (version: string = AVATAR_PACK_VERSION): string => `packs/avatar/${version}`;
