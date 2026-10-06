/**
 * The avatar shop, inventory, and loadout of Primary Advantage (track
 * primary_avatar_shop_20261005, FR-2 to FR-7). Pieces are catalog ids of the avatar kit; the
 * price, the tier, and the dyes come from the pack. Every row is the student's own (school, user).
 */
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { DB } from "@reading-advantage/db";
import { classroomStudents, primaryAvatarInventory, primaryAvatarLoadout, primaryAvatarProfile, primaryGpLedger, users } from "@reading-advantage/db/schema";
import { AuthError, type UserContext } from "@reading-advantage/auth";
import { AVATAR_CATALOG, AVATAR_PACK_VERSION, itemDyes, starterSet, tierLevel } from "@reading-advantage/avatar-kit";
import {
  avatarStateSchema,
  purchaseAvatarItemInputSchema,
  setLoadoutInputSchema,
  type AvatarClassId,
  type AvatarInventoryItem,
  type AvatarLoadout,
  type AvatarShopItem,
  type AvatarSlot,
  type AvatarState,
  type AvatarTints,
  type ClassAvatar,
  type LaunchAvatar,
  type PurchaseAvatarItemInput,
  type SetLoadoutInput,
} from "@reading-advantage/game-contracts";
import { createTenantDB } from "../db-contract.js";
import { managedClass } from "../primary-books/class-books.js";
import { getAvatarProfile, type AvatarCtx } from "./avatar.js";
import { AvatarShopError } from "./errors.js";
import { gpBalance, WELCOME_GP } from "./gp.js";

const UNSCOPED_REASON = "avatar shop rows are read and written with an explicit school_id and user_id pair (the student's own rows)";
const POPULARITY_REASON = "shop popularity counts purchase rows over all schools (FR-5); no row content leaves the count";
const POPULARITY_DAYS = 30;

type Raw = ReturnType<ReturnType<typeof createTenantDB>["unscoped"]>;
type InventoryRow = typeof primaryAvatarInventory.$inferSelect;

/**
 * The school of the user, required for shop rows.
 * @param user The signed-in user.
 * @returns The school id.
 * @throws {AuthError} FORBIDDEN when the user has no school.
 */
function schoolOf(user: UserContext): string {
  if (!user.schoolId) throw new AuthError("The avatar shop needs a school", "FORBIDDEN");
  return user.schoolId;
}

/**
 * Maps an inventory row to the contract shape.
 * @param row The table row.
 * @returns The owned item.
 */
const toInventoryItem = (row: InventoryRow): AvatarInventoryItem => ({ itemId: row.itemId, dye: row.dye, source: row.source as AvatarInventoryItem["source"], catalogVersion: row.catalogVersion, acquiredAt: row.acquiredAt.toISOString() });

/**
 * The worn pieces of a student by slot.
 * @param raw The unscoped handle.
 * @param schoolId The school.
 * @param userId The student.
 * @returns The loadout; a slot that is not worn is absent.
 */
async function readLoadout(raw: Raw, schoolId: string, userId: string): Promise<AvatarLoadout> {
  const rows = await raw
    .select({ slot: primaryAvatarLoadout.slot, itemId: primaryAvatarInventory.itemId, dye: primaryAvatarInventory.dye })
    .from(primaryAvatarLoadout)
    .innerJoin(primaryAvatarInventory, eq(primaryAvatarInventory.id, primaryAvatarLoadout.inventoryId))
    .where(and(eq(primaryAvatarLoadout.schoolId, schoolId), eq(primaryAvatarLoadout.userId, userId)));
  const loadout: AvatarLoadout = {};
  for (const row of rows) loadout[row.slot as AvatarSlot] = { itemId: row.itemId, dye: row.dye };
  return loadout;
}

/**
 * Grants the starter set of the student's class on the first visit (FR-2) and the welcome GP:
 * one inventory row per piece (`starter`), worn when the student wears nothing yet. Runs once
 * per piece and once for the welcome grant (unique keys), so a repeat visit changes nothing.
 * @param raw The unscoped handle.
 * @param schoolId The school.
 * @param userId The student.
 * @param classId The hero class of the profile.
 * @param now The clock.
 */
async function ensureStarterSet(raw: Raw, schoolId: string, userId: string, classId: string, now: Date): Promise<void> {
  const set = starterSet(classId);
  if (!set) return;
  const granted = await raw
    .insert(primaryAvatarInventory)
    .values(set.pieces.map((itemId) => ({ schoolId, userId, itemId, dye: null, source: "starter", catalogVersion: AVATAR_PACK_VERSION, acquiredAt: now })))
    .onConflictDoNothing()
    .returning({ id: primaryAvatarInventory.id, itemId: primaryAvatarInventory.itemId });
  if (!granted.length) return;
  await raw
    .insert(primaryGpLedger)
    .values({ schoolId, userId, delta: WELCOME_GP, reason: "welcome", sourceKey: "welcome", createdAt: now })
    .onConflictDoNothing();
  const worn = await readLoadout(raw, schoolId, userId);
  if (Object.keys(worn).length) return;
  await raw
    .insert(primaryAvatarLoadout)
    .values(granted.map((row) => ({ schoolId, userId, slot: AVATAR_CATALOG[row.itemId]!.slot, inventoryId: row.id, updatedAt: now })))
    .onConflictDoNothing();
}

/**
 * The avatar page state of the signed-in student (FR-5): profile, GP, level, inventory, and
 * loadout. The first visit with a saved profile grants the starter set and the welcome GP.
 * @param ctx The database, the user, and the clock.
 * @returns The state; `profile` is null until the student picks a class.
 * @throws {AuthError} FORBIDDEN when the user has no school.
 */
export async function getAvatarState(ctx: AvatarCtx): Promise<AvatarState> {
  const schoolId = schoolOf(ctx.user);
  const now = ctx.now ?? new Date();
  const raw = createTenantDB(ctx.db, { schoolId }).unscoped(UNSCOPED_REASON);
  const profile = await getAvatarProfile(ctx);
  if (profile) await ensureStarterSet(raw, schoolId, ctx.user.id, profile.classId, now);
  const rows = await raw
    .select()
    .from(primaryAvatarInventory)
    .where(and(eq(primaryAvatarInventory.schoolId, schoolId), eq(primaryAvatarInventory.userId, ctx.user.id)))
    .orderBy(desc(primaryAvatarInventory.acquiredAt));
  const [gp, loadout] = await Promise.all([gpBalance(ctx.db, schoolId, ctx.user.id), readLoadout(raw, schoolId, ctx.user.id)]);
  return avatarStateSchema.parse({ profile, gp, level: Math.max(1, ctx.user.level || 1), catalogVersion: AVATAR_PACK_VERSION, inventory: rows.map(toInventoryItem), loadout });
}

/**
 * A fixed random order per student for shop ties (FR-5): a small hash of the user and the item.
 * @param userId The student.
 * @param itemId The piece.
 * @returns A number in [0, 1).
 */
export function tieOrder(userId: string, itemId: string): number {
  let h = 2166136261;
  for (const ch of `${userId}:${itemId}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

/**
 * The shop list of the signed-in student (FR-4, FR-5): every catalog piece with its price, level
 * gate, dyes, and what the student owns, in popularity order (purchases in the last 30 days over
 * all schools), ties in the student's fixed random order.
 * @param ctx The database, the user, and the clock.
 * @returns The shop items.
 * @throws {AuthError} FORBIDDEN when the user has no school.
 */
export async function listAvatarShop(ctx: AvatarCtx): Promise<AvatarShopItem[]> {
  const schoolId = schoolOf(ctx.user);
  const now = ctx.now ?? new Date();
  const raw = createTenantDB(ctx.db, { schoolId }).unscoped(UNSCOPED_REASON);
  const owned = await raw
    .select({ itemId: primaryAvatarInventory.itemId, dye: primaryAvatarInventory.dye })
    .from(primaryAvatarInventory)
    .where(and(eq(primaryAvatarInventory.schoolId, schoolId), eq(primaryAvatarInventory.userId, ctx.user.id)));
  const since = new Date(now.getTime() - POPULARITY_DAYS * 24 * 60 * 60 * 1000);
  const popular = await createTenantDB(ctx.db, { schoolId })
    .unscoped(POPULARITY_REASON)
    .select({ itemId: primaryAvatarInventory.itemId, count: sql<number>`count(*)` })
    .from(primaryAvatarInventory)
    .where(and(eq(primaryAvatarInventory.source, "purchase"), gte(primaryAvatarInventory.acquiredAt, since)))
    .groupBy(primaryAvatarInventory.itemId);
  const counts = new Map(popular.map((row) => [row.itemId, Number(row.count)]));
  const level = Math.max(1, ctx.user.level || 1);
  const items = Object.values(AVATAR_CATALOG).map((item): AvatarShopItem => ({
    id: item.id,
    slot: item.slot as AvatarSlot,
    tier: item.tier,
    levelRequired: tierLevel(item.tier),
    price: item.price,
    twoHanded: item.twoHanded,
    dyes: itemDyes(item.id),
    owned: owned.some((row) => row.itemId === item.id && row.dye === null),
    ownedDyes: owned.filter((row) => row.itemId === item.id && row.dye !== null).map((row) => row.dye as string),
    unlocked: level >= tierLevel(item.tier),
  }));
  return items.sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || tieOrder(ctx.user.id, a.id) - tieOrder(ctx.user.id, b.id));
}

/**
 * Buys a piece, or a dye of a piece, for the signed-in student (FR-3): one serializable
 * transaction checks the balance, inserts the inventory row, and inserts the negative ledger row.
 * A dye costs the price of its piece.
 * @param ctx The database, the user, and the clock.
 * @param input The piece and, for a dye, the dye.
 * @returns The owned item and the balance after the purchase.
 * @throws {AvatarShopError} NOT_IN_CATALOG, BAD_DYE, LEVEL_LOCKED, INSUFFICIENT_GP, ALREADY_OWNED, or RETRY (a concurrent purchase).
 * @throws {AuthError} FORBIDDEN when the user has no school.
 */
export async function purchaseAvatarItem(ctx: AvatarCtx & { input: PurchaseAvatarItemInput }): Promise<{ item: AvatarInventoryItem; gp: number }> {
  const input = purchaseAvatarItemInputSchema.parse(ctx.input);
  const schoolId = schoolOf(ctx.user);
  const now = ctx.now ?? new Date();
  const item = AVATAR_CATALOG[input.itemId];
  if (!item) throw new AvatarShopError("NOT_IN_CATALOG", 404, `No piece '${input.itemId}' in the catalog`);
  if (input.dye && !itemDyes(item.id).includes(input.dye)) throw new AvatarShopError("BAD_DYE", 400, `No dye '${input.dye}' on '${item.id}'`);
  if (Math.max(1, ctx.user.level || 1) < tierLevel(item.tier)) throw new AvatarShopError("LEVEL_LOCKED", 403, `Tier ${item.tier} opens at level ${tierLevel(item.tier)}`);
  try {
    return await ctx.db.transaction(
      async (tx) => {
        const raw = createTenantDB(tx as unknown as DB, { schoolId }).unscoped(UNSCOPED_REASON);
        const balance = await gpBalance(tx as unknown as DB, schoolId, ctx.user.id);
        if (balance < item.price) throw new AvatarShopError("INSUFFICIENT_GP", 409, `${item.price} GP needed, ${balance} GP available`);
        const [row] = await raw
          .insert(primaryAvatarInventory)
          .values({ schoolId, userId: ctx.user.id, itemId: item.id, dye: input.dye ?? null, source: "purchase", catalogVersion: AVATAR_PACK_VERSION, acquiredAt: now })
          .onConflictDoNothing()
          .returning();
        if (!row) throw new AvatarShopError("ALREADY_OWNED", 409, `'${item.id}' is already owned`);
        if (item.price > 0) {
          await raw.insert(primaryGpLedger).values({ schoolId, userId: ctx.user.id, delta: -item.price, reason: "purchase", sourceKey: `purchase:${row.id}`, createdAt: now });
        }
        return { item: toInventoryItem(row as InventoryRow), gp: balance - item.price };
      },
      { isolationLevel: "serializable" },
    );
  } catch (error) {
    if ((error as { code?: string }).code === "40001") throw new AvatarShopError("RETRY", 409, "Another purchase is in progress; try again");
    throw error;
  }
}

/**
 * Wears an owned piece in a slot, or clears the slot (FR-2): the piece must be the student's, fit
 * the slot, and respect the two-handed rule (a two-handed main hand clears the off hand; the off
 * hand stays empty while a two-handed piece is held).
 * @param ctx The database, the user, and the clock.
 * @param input The slot and the owned piece (or null to clear).
 * @returns The loadout after the change.
 * @throws {AvatarShopError} NOT_OWNED, WRONG_SLOT, or TWO_HANDED.
 * @throws {AuthError} FORBIDDEN when the user has no school.
 */
export async function setLoadout(ctx: AvatarCtx & { input: SetLoadoutInput }): Promise<AvatarLoadout> {
  const input = setLoadoutInputSchema.parse(ctx.input);
  const schoolId = schoolOf(ctx.user);
  const now = ctx.now ?? new Date();
  const raw = createTenantDB(ctx.db, { schoolId }).unscoped(UNSCOPED_REASON);
  const own = (slot: string) => and(eq(primaryAvatarLoadout.schoolId, schoolId), eq(primaryAvatarLoadout.userId, ctx.user.id), eq(primaryAvatarLoadout.slot, slot));
  if (input.itemId === null) {
    await raw.delete(primaryAvatarLoadout).where(own(input.slot));
    return readLoadout(raw, schoolId, ctx.user.id);
  }
  const item = AVATAR_CATALOG[input.itemId];
  if (!item) throw new AvatarShopError("NOT_IN_CATALOG", 404, `No piece '${input.itemId}' in the catalog`);
  if (item.slot !== input.slot) throw new AvatarShopError("WRONG_SLOT", 400, `'${item.id}' goes in the ${item.slot} slot`);
  const dye = input.dye ?? null;
  const owned = await raw
    .select({ id: primaryAvatarInventory.id })
    .from(primaryAvatarInventory)
    .where(and(eq(primaryAvatarInventory.schoolId, schoolId), eq(primaryAvatarInventory.userId, ctx.user.id), eq(primaryAvatarInventory.itemId, item.id), dye === null ? sql`${primaryAvatarInventory.dye} is null` : eq(primaryAvatarInventory.dye, dye)))
    .limit(1);
  if (!owned[0]) throw new AvatarShopError("NOT_OWNED", 403, `'${item.id}'${dye ? ` in ${dye}` : ""} is not in the inventory`);
  const worn = await readLoadout(raw, schoolId, ctx.user.id);
  if (input.slot === "offhand" && worn.mainhand && AVATAR_CATALOG[worn.mainhand.itemId]?.twoHanded) {
    throw new AvatarShopError("TWO_HANDED", 409, "Both hands hold the main-hand piece");
  }
  if (input.slot === "mainhand" && item.twoHanded) await raw.delete(primaryAvatarLoadout).where(own("offhand"));
  await raw
    .insert(primaryAvatarLoadout)
    .values({ schoolId, userId: ctx.user.id, slot: input.slot, inventoryId: owned[0].id, updatedAt: now })
    .onConflictDoUpdate({ target: [primaryAvatarLoadout.schoolId, primaryAvatarLoadout.userId, primaryAvatarLoadout.slot], set: { inventoryId: owned[0].id, updatedAt: now } });
  return readLoadout(raw, schoolId, ctx.user.id);
}

/**
 * The avatars of a class for the teacher's class list (FR-6): every student with the saved
 * profile and the worn pieces.
 * @param ctx The database and the teacher.
 * @param classroomId The class.
 * @returns One entry per student, by name.
 * @throws {AuthError} FORBIDDEN when the class is not the teacher's.
 */
export async function getClassAvatars(ctx: AvatarCtx, classroomId: string): Promise<ClassAvatar[]> {
  const cls = await managedClass(ctx, classroomId);
  const raw = createTenantDB(ctx.db, { schoolId: cls.schoolId }).unscoped(UNSCOPED_REASON);
  const students = await raw
    .select({ userId: users.id, name: users.name, username: users.username })
    .from(classroomStudents)
    .innerJoin(users, eq(users.id, classroomStudents.studentId))
    .where(eq(classroomStudents.classroomId, cls.id));
  if (!students.length) return [];
  const ids = students.map((s) => s.userId);
  const [profiles, worn] = await Promise.all([
    raw.select().from(primaryAvatarProfile).where(and(eq(primaryAvatarProfile.schoolId, cls.schoolId), inArray(primaryAvatarProfile.userId, ids))),
    raw
      .select({ userId: primaryAvatarLoadout.userId, slot: primaryAvatarLoadout.slot, itemId: primaryAvatarInventory.itemId, dye: primaryAvatarInventory.dye })
      .from(primaryAvatarLoadout)
      .innerJoin(primaryAvatarInventory, eq(primaryAvatarInventory.id, primaryAvatarLoadout.inventoryId))
      .where(and(eq(primaryAvatarLoadout.schoolId, cls.schoolId), inArray(primaryAvatarLoadout.userId, ids))),
  ]);
  return students
    .map((s) => {
      const row = profiles.find((p) => p.userId === s.userId);
      const loadout: AvatarLoadout = {};
      for (const w of worn) if (w.userId === s.userId) loadout[w.slot as AvatarSlot] = { itemId: w.itemId, dye: w.dye };
      return {
        userId: s.userId,
        name: s.name || s.username,
        profile: row ? { classId: row.classPreset as AvatarClassId, tints: row.tints as AvatarTints, catalogVersion: row.catalogVersion, updatedAt: row.updatedAt.toISOString() } : null,
        loadout,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Resets a student's avatar for the teacher (FR-6): the profile and the worn pieces go; the
 * inventory and the GP stay. The student picks a class again on the next visit.
 * @param ctx The database and the teacher.
 * @param classroomId The class.
 * @param userId The student, who must be in the class.
 * @throws {AvatarShopError} NOT_IN_CLASS when the student is not in the class.
 * @throws {AuthError} FORBIDDEN when the class is not the teacher's.
 */
export async function resetStudentAvatar(ctx: AvatarCtx, classroomId: string, userId: string): Promise<void> {
  const cls = await managedClass(ctx, classroomId);
  const raw = createTenantDB(ctx.db, { schoolId: cls.schoolId }).unscoped(UNSCOPED_REASON);
  const member = await raw
    .select({ id: classroomStudents.id })
    .from(classroomStudents)
    .where(and(eq(classroomStudents.classroomId, cls.id), eq(classroomStudents.studentId, userId)))
    .limit(1);
  if (!member[0]) throw new AvatarShopError("NOT_IN_CLASS", 404, "The student is not in this class");
  await raw.delete(primaryAvatarLoadout).where(and(eq(primaryAvatarLoadout.schoolId, cls.schoolId), eq(primaryAvatarLoadout.userId, userId)));
  await raw.delete(primaryAvatarProfile).where(and(eq(primaryAvatarProfile.schoolId, cls.schoolId), eq(primaryAvatarProfile.userId, userId)));
}

/**
 * The avatar a game receives in its launch context (FR-7), built from the page state.
 * @param state The avatar state.
 * @returns The launch avatar, or null when the student has no avatar.
 */
export function toLaunchAvatar(state: AvatarState): LaunchAvatar | null {
  if (!state.profile) return null;
  return { catalogVersion: state.catalogVersion, classId: state.profile.classId, tints: state.profile.tints, pieces: Object.values(state.loadout) };
}
