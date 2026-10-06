import { z } from "zod";

/** The 15 hero classes a student can pick: the Forge starter sets. */
export const avatarClassIdSchema = z.enum([
  "knight",
  "wizard",
  "cleric",
  "rogue",
  "ranger",
  "bard",
  "witch",
  "druid",
  "shaman",
  "duelist",
  "swashbuckler",
  "treasure-hunter",
  "explorer",
  "gladiator",
  "shield-maiden",
]);

/** The color options of the avatar base, one enum per color slot. */
export const avatarSkinSchema = z.enum(["fair", "light", "tan", "brown", "deep"]);
export const avatarHairSchema = z.enum(["brown", "black", "blond", "auburn", "silver", "teal"]);
export const avatarEyesSchema = z.enum(["brown", "blue", "green", "hazel", "violet"]);
export const avatarClothSchema = z.enum(["sky", "linen", "moss", "rose", "slate"]);

/** The student's color choice: an option per color slot of the avatar base. */
export const avatarTintsSchema = z
  .object({
    skin: avatarSkinSchema,
    hair: avatarHairSchema,
    eyes: avatarEyesSchema,
    cloth: avatarClothSchema,
  })
  .strict();

/** The pack version a profile was saved against (`packs/avatar/<version>/`). */
export const avatarCatalogVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

/** What a student sends to pick or change the avatar. */
export const setAvatarProfileInputSchema = z
  .object({
    classId: avatarClassIdSchema,
    tints: avatarTintsSchema,
  })
  .strict();

/** The saved avatar of a user, as the app renders it. */
export const avatarProfileSchema = setAvatarProfileInputSchema
  .extend({
    catalogVersion: avatarCatalogVersionSchema,
    updatedAt: z.string().datetime(),
  })
  .strict();

export type AvatarClassId = z.infer<typeof avatarClassIdSchema>;
export type AvatarTints = z.infer<typeof avatarTintsSchema>;
export type SetAvatarProfileInput = z.infer<typeof setAvatarProfileInputSchema>;
export type AvatarProfile = z.infer<typeof avatarProfileSchema>;

// ─── Avatar shop, GP, inventory, loadout (track primary_avatar_shop_20261005) ───

/** The equipment slots of the avatar (the Forge pack slots). */
export const avatarSlotSchema = z.enum(["hair", "head", "chest", "shoulders", "back", "hands", "waist", "feet", "mainhand", "offhand"]);

/** Why a GP ledger row exists. */
export const gpReasonSchema = z.enum(["xp", "purchase", "battle", "welcome", "admin"]);

/** How a student got an inventory item. */
export const avatarItemSourceSchema = z.enum(["starter", "purchase", "reward"]);

/** A dye preset name of a piece (the Forge color presets). */
export const avatarDyeSchema = z.string().min(1).max(40);

/** One owned piece: the catalog id and the dye it was bought in (null is the piece's own colors). */
export const avatarInventoryItemSchema = z
  .object({
    itemId: z.string().min(1),
    dye: avatarDyeSchema.nullable(),
    source: avatarItemSourceSchema,
    catalogVersion: avatarCatalogVersionSchema,
    acquiredAt: z.string().datetime(),
  })
  .strict();

/** The worn piece of one slot. */
export const avatarLoadoutPieceSchema = z.object({ itemId: z.string().min(1), dye: avatarDyeSchema.nullable() }).strict();

/** The worn pieces by slot; a slot that is not present is empty. */
export const avatarLoadoutSchema = z.record(avatarSlotSchema, avatarLoadoutPieceSchema);

/** What a student sends to buy a piece, or a dye of a piece (FR-3, FR-5). */
export const purchaseAvatarItemInputSchema = z.object({ itemId: z.string().min(1), dye: avatarDyeSchema.optional() }).strict();

/** What a student sends to wear a piece in a slot, or to clear the slot (`itemId: null`). */
export const setLoadoutInputSchema = z
  .object({
    slot: avatarSlotSchema,
    itemId: z.string().min(1).nullable(),
    dye: avatarDyeSchema.nullable().optional(),
  })
  .strict();

/** One shop entry: a catalog piece with its price, level gate, dyes, and the student's ownership. */
export const avatarShopItemSchema = z
  .object({
    id: z.string().min(1),
    slot: avatarSlotSchema,
    tier: z.number().int().min(1).max(3),
    levelRequired: z.number().int().min(1),
    price: z.number().int().min(0),
    twoHanded: z.boolean(),
    dyes: z.array(avatarDyeSchema),
    owned: z.boolean(),
    ownedDyes: z.array(avatarDyeSchema),
    unlocked: z.boolean(),
  })
  .strict();

/** The avatar page state of a student (FR-5): profile, GP, level, inventory, and loadout. */
export const avatarStateSchema = z
  .object({
    profile: avatarProfileSchema.nullable(),
    gp: z.number().int(),
    level: z.number().int().min(1),
    catalogVersion: avatarCatalogVersionSchema,
    inventory: z.array(avatarInventoryItemSchema),
    loadout: avatarLoadoutSchema,
  })
  .strict();

/** One student of a class for the teacher's avatar list (FR-6). */
export const classAvatarSchema = z
  .object({
    userId: z.string().min(1),
    name: z.string(),
    profile: avatarProfileSchema.nullable(),
    loadout: avatarLoadoutSchema,
  })
  .strict();

/** The avatar a game receives in its launch context (FR-7); the host passes it, a game never fetches it. */
export const launchAvatarSchema = z
  .object({
    catalogVersion: avatarCatalogVersionSchema,
    classId: avatarClassIdSchema,
    tints: avatarTintsSchema,
    pieces: z.array(avatarLoadoutPieceSchema),
  })
  .strict();

export type AvatarSlot = z.infer<typeof avatarSlotSchema>;
export type GpReason = z.infer<typeof gpReasonSchema>;
export type AvatarItemSource = z.infer<typeof avatarItemSourceSchema>;
export type AvatarInventoryItem = z.infer<typeof avatarInventoryItemSchema>;
export type AvatarLoadoutPiece = z.infer<typeof avatarLoadoutPieceSchema>;
export type AvatarLoadout = z.infer<typeof avatarLoadoutSchema>;
export type PurchaseAvatarItemInput = z.infer<typeof purchaseAvatarItemInputSchema>;
export type SetLoadoutInput = z.infer<typeof setLoadoutInputSchema>;
export type AvatarShopItem = z.infer<typeof avatarShopItemSchema>;
export type AvatarState = z.infer<typeof avatarStateSchema>;
export type ClassAvatar = z.infer<typeof classAvatarSchema>;
export type LaunchAvatar = z.infer<typeof launchAvatarSchema>;
