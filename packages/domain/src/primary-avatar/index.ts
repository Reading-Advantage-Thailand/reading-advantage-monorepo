/** The student avatar use-cases (track primary_reedy_preview_20261003, FR-10). */
export { getAvatarProfile, setAvatarProfile, type AvatarCtx } from "./avatar.js";
export type { AvatarProfile, SetAvatarProfileInput } from "@reading-advantage/game-contracts";
/** The avatar shop, GP, inventory, and loadout (track primary_avatar_shop_20261005). */
export { AvatarShopError, type AvatarShopErrorCode } from "./errors.js";
export { GP_DAILY_CAP, GP_WEIGHTS, WELCOME_GP, bangkokDayStart, gpBalance, gpForXp, grantGpForXp } from "./gp.js";
export { getAvatarState, getClassAvatars, listAvatarShop, purchaseAvatarItem, resetStudentAvatar, setLoadout, tieOrder, toLaunchAvatar } from "./shop.js";
