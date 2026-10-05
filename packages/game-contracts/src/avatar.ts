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
