import { db } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { AVATAR_CATALOG, AVATAR_PACK_VERSION, itemDyes, tierLevel } from "@reading-advantage/avatar-kit";
import { getAvatarState, getClassAvatars, listAvatarShop, purchaseAvatarItem, resetStudentAvatar, setLoadout, type PurchaseAvatarItemInput, type SetLoadoutInput } from "@reading-advantage/domain/primary-avatar";

/** The avatar page state of the signed-in student (FR-5). */
export const avatarState = (user: UserContext) => getAvatarState({ db, user });

/** The shop list of the signed-in student (FR-4, FR-5). */
export const avatarShop = (user: UserContext) => listAvatarShop({ db, user });

/** Buys a piece or a dye (FR-3). */
export const buyAvatarItem = (user: UserContext, input: PurchaseAvatarItemInput) => purchaseAvatarItem({ db, user, input });

/** Wears an owned piece in a slot, or clears the slot (FR-2). */
export const wearAvatarItem = (user: UserContext, input: SetLoadoutInput) => setLoadout({ db, user, input });

/** The avatars of a class for the teacher (FR-6). */
export const classAvatars = (user: UserContext, classroomId: string) => getClassAvatars({ db, user }, classroomId);

/** Resets a student's avatar for the teacher (FR-6). */
export const resetClassAvatar = (user: UserContext, classroomId: string, userId: string) => resetStudentAvatar({ db, user }, classroomId, userId);

/**
 * The pack catalog as the client reads it (FR-4): every piece with its slot, tier, level, price,
 * two-handed flag, and dyes. Static per process.
 * @returns The catalog version and the pieces.
 */
export function avatarCatalog() {
  return {
    catalogVersion: AVATAR_PACK_VERSION,
    items: Object.values(AVATAR_CATALOG).map((item) => ({ id: item.id, slot: item.slot, tier: item.tier, levelRequired: tierLevel(item.tier), price: item.price, twoHanded: item.twoHanded, dyes: itemDyes(item.id) })),
  };
}
