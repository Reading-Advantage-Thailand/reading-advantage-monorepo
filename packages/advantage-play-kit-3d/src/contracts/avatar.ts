/**
 * The launch avatar contract of the games. The monorepo owns it in `@reading-advantage/game-contracts`
 * (`avatar.ts`); Forge keeps a byte copy for its demo and checks drift against it. The port script
 * lists this file as monorepo-owned, so a Forge release never overwrites it.
 */
export {
  avatarCatalogVersionSchema,
  avatarClassIdSchema,
  avatarClothSchema,
  avatarDyeSchema,
  avatarEyesSchema,
  avatarHairSchema,
  avatarLoadoutPieceSchema,
  avatarSkinSchema,
  avatarTintsSchema,
  launchAvatarSchema,
} from '@reading-advantage/game-contracts';
export type { AvatarClassId, AvatarLoadoutPiece, AvatarTints, LaunchAvatar } from '@reading-advantage/game-contracts';
