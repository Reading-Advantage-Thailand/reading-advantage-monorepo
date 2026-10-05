import { and, eq } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { primaryAvatarProfile } from "@reading-advantage/db/schema";
import { AuthError, type UserContext } from "@reading-advantage/auth";
import { AVATAR_BASE, AVATAR_PACK_VERSION, starterSet } from "@reading-advantage/avatar-kit";
import { avatarProfileSchema, setAvatarProfileInputSchema, type AvatarProfile, type SetAvatarProfileInput } from "@reading-advantage/game-contracts";
import { createTenantDB } from "../db-contract.js";

/** The common parameters of the avatar use-cases. */
export interface AvatarCtx {
  db: DB;
  user: UserContext;
  now?: Date;
}

const UNSCOPED_REASON = "primary_avatar_profile rows are read and written with an explicit school_id and user_id pair (the user's own row)";

type Row = typeof primaryAvatarProfile.$inferSelect;

/**
 * Maps a profile row to the contract shape.
 * @param row The table row.
 * @returns The profile.
 */
function toProfile(row: Row): AvatarProfile {
  return avatarProfileSchema.parse({ classId: row.classPreset, tints: row.tints, catalogVersion: row.catalogVersion, updatedAt: row.updatedAt.toISOString() });
}

/**
 * The school of the user, required for an avatar row.
 * @param user The signed-in user.
 * @returns The school id.
 * @throws {AuthError} FORBIDDEN when the user has no school.
 */
function schoolOf(user: UserContext): string {
  if (!user.schoolId) throw new AuthError("An avatar needs a school", "FORBIDDEN");
  return user.schoolId;
}

/**
 * Reads the avatar of the signed-in user (FR-10).
 * @param ctx The database and the user.
 * @returns The profile, or null when the user has not picked an avatar.
 * @throws {AuthError} FORBIDDEN when the user has no school.
 */
export async function getAvatarProfile(ctx: AvatarCtx): Promise<AvatarProfile | null> {
  const schoolId = schoolOf(ctx.user);
  const raw = createTenantDB(ctx.db, { schoolId }).unscoped(UNSCOPED_REASON);
  const rows = await raw
    .select()
    .from(primaryAvatarProfile)
    .where(and(eq(primaryAvatarProfile.schoolId, schoolId), eq(primaryAvatarProfile.userId, ctx.user.id)))
    .limit(1);
  return rows[0] ? toProfile(rows[0]) : null;
}

/**
 * Saves the avatar of the signed-in user: a hero class with a color per slot (FR-10a). Changes
 * are free until the shop exists. Only the user's own row changes.
 * @param ctx The database, the user, and the clock.
 * @param input The class and the tints.
 * @returns The saved profile.
 * @throws {ZodError} When the input is not a known class or an option per slot.
 * @throws {Error} When the class is not a starter set or a tint is not an option of the avatar base.
 * @throws {AuthError} FORBIDDEN when the user has no school.
 */
export async function setAvatarProfile(ctx: AvatarCtx & { input: SetAvatarProfileInput }): Promise<AvatarProfile> {
  const input = setAvatarProfileInputSchema.parse(ctx.input);
  const schoolId = schoolOf(ctx.user);
  if (!starterSet(input.classId)) throw new Error(`no starter set '${input.classId}'`);
  for (const [slot, option] of Object.entries(input.tints)) {
    if (!AVATAR_BASE.slots[slot]?.options[option]) throw new Error(`no option '${option}' in color slot '${slot}'`);
  }
  const now = ctx.now ?? new Date();
  const raw = createTenantDB(ctx.db, { schoolId }).unscoped(UNSCOPED_REASON);
  const [row] = await raw
    .insert(primaryAvatarProfile)
    .values({ schoolId, userId: ctx.user.id, classPreset: input.classId, tints: input.tints, catalogVersion: AVATAR_PACK_VERSION, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [primaryAvatarProfile.schoolId, primaryAvatarProfile.userId],
      set: { classPreset: input.classId, tints: input.tints, catalogVersion: AVATAR_PACK_VERSION, updatedAt: now },
    })
    .returning();
  if (!row) throw new Error("The avatar was not saved");
  return toProfile(row);
}
