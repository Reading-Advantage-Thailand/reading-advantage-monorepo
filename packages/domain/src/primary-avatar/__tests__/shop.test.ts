import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import type { UserContext } from "@reading-advantage/auth";
import { AVATAR_CATALOG, STARTER_SETS } from "@reading-advantage/avatar-kit";
import { createMockDb } from "../../__tests__/mock-db.js";
import { WELCOME_GP } from "../gp.js";
import { getAvatarState, getClassAvatars, listAvatarShop, purchaseAvatarItem, resetStudentAvatar, setLoadout, tieOrder, toLaunchAvatar } from "../shop.js";

const SCHOOL = "school-1";
const now = new Date("2026-10-06T03:00:00.000Z");
const student: UserContext = { id: "s1", username: "s1", name: "Som", role: "STUDENT", schoolId: SCHOOL, xp: 40, level: 1, cefrLevel: "A1" };
const teacher: UserContext = { id: "t1", username: "t1", name: "Kru", role: "TEACHER", schoolId: SCHOOL, xp: 0, level: 1, cefrLevel: "A1" };
const tints = { skin: "fair", hair: "brown", eyes: "blue", cloth: "sky" };
const profileRow = { schoolId: SCHOOL, userId: "s1", classPreset: "knight", tints, catalogVersion: "1.0.0", createdAt: now, updatedAt: now };
const knight = STARTER_SETS.find((s) => s.id === "knight")!;
const items = Object.values(AVATAR_CATALOG);
const priced = items.find((i) => i.tier === 1 && i.price > 0 && !knight.pieces.includes(i.id))!;
const tier3 = items.find((i) => i.tier === 3)!;
const twoHanded = items.find((i) => i.slot === "mainhand" && i.twoHanded)!;
const oneHanded = items.find((i) => i.slot === "mainhand" && !i.twoHanded)!;
const offhand = items.find((i) => i.slot === "offhand")!;
const invRow = (itemId: string, id = "i1", dye: string | null = null) => ({ id, schoolId: SCHOOL, userId: "s1", itemId, dye, source: "starter", catalogVersion: "1.0.0", acquiredAt: now });
const db = (mock: unknown) => mock as DB;

describe("getAvatarState", () => {
  it("grants the starter set and the welcome GP on the first visit and dresses the student", async () => {
    const granted = knight.pieces.map((itemId, i) => ({ id: `i${i}`, itemId }));
    const mock = createMockDb({ selectSequence: [[profileRow], [], granted.map((g) => invRow(g.itemId, g.id)), [{ total: WELCOME_GP }], [{ slot: "head", itemId: "leather-cap", dye: null }]], conflictInsertReturning: granted });
    const state = await getAvatarState({ db: db(mock), user: student, now });
    expect(state.profile?.classId).toBe("knight");
    expect(state.gp).toBe(WELCOME_GP);
    expect(state.inventory).toHaveLength(knight.pieces.length);
    expect(state.loadout.head).toEqual({ itemId: "leather-cap", dye: null });
    const inserts = mock.insert.mock.results[0]!.value.values.mock.calls.map((c: unknown[]) => c[0]);
    expect(inserts[0]).toHaveLength(knight.pieces.length);
    expect(inserts[1]).toMatchObject({ delta: WELCOME_GP, reason: "welcome", sourceKey: "welcome" });
    expect(inserts[2].map((row: { slot: string }) => row.slot)).toEqual(knight.pieces.map((id) => AVATAR_CATALOG[id]!.slot));
  });

  it("grants nothing again on a later visit, and nothing without a profile", async () => {
    // The starter insert finds every row in place, so no welcome grant and no dressing follow.
    const later = createMockDb({ selectSequence: [[profileRow], [invRow("leather-cap")], [{ total: 60 }], [{ slot: "head", itemId: "leather-cap", dye: null }]], conflictInsertReturning: [] });
    const state = await getAvatarState({ db: db(later), user: student, now });
    expect(state.gp).toBe(60);
    expect(later.insert).toHaveBeenCalledTimes(1);
    const none = createMockDb({ selectSequence: [[], [], [{ total: 0 }], []] });
    const empty = await getAvatarState({ db: db(none), user: student, now });
    expect(empty).toMatchObject({ profile: null, gp: 0, level: 1, inventory: [], loadout: {} });
    expect(none.insert).not.toHaveBeenCalled();
  });

  it("refuses a user with no school", async () => {
    await expect(getAvatarState({ db: db(createMockDb()), user: { ...student, schoolId: null } })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("listAvatarShop", () => {
  it("lists every piece with price, level gate, dyes, and ownership, popular first, then the student's fixed order", async () => {
    const mock = createMockDb({ selectSequence: [[{ itemId: "leather-cap", dye: null }, { itemId: "rogue-hood", dye: "crimson" }], [{ itemId: tier3.id, count: 3 }, { itemId: priced.id, count: 1 }]] });
    const shop = await listAvatarShop({ db: db(mock), user: student, now });
    expect(shop).toHaveLength(items.length);
    expect(shop[0]!.id).toBe(tier3.id);
    expect(shop[1]!.id).toBe(priced.id);
    expect(shop.find((i) => i.id === "leather-cap")).toMatchObject({ owned: true, unlocked: true, levelRequired: 1 });
    expect(shop.find((i) => i.id === "rogue-hood")).toMatchObject({ owned: false, ownedDyes: ["crimson"], dyes: ["teal", "crimson", "forest"] });
    expect(shop.find((i) => i.id === tier3.id)).toMatchObject({ unlocked: false, levelRequired: 10 });
    const rest = shop.slice(2).map((i) => i.id);
    expect(rest).toEqual([...rest].sort((a, b) => tieOrder("s1", a) - tieOrder("s1", b)));
    expect(tieOrder("s1", "x")).not.toBe(tieOrder("s2", "x"));
  });
});

describe("purchaseAvatarItem", () => {
  it("refuses an unknown piece, a bad dye, and a locked tier before any write", async () => {
    const mock = createMockDb();
    await expect(purchaseAvatarItem({ db: db(mock), user: student, input: { itemId: "ruby-crown" } })).rejects.toMatchObject({ code: "NOT_IN_CATALOG", status: 404 });
    await expect(purchaseAvatarItem({ db: db(mock), user: student, input: { itemId: "rogue-hood", dye: "gold" } })).rejects.toMatchObject({ code: "BAD_DYE", status: 400 });
    await expect(purchaseAvatarItem({ db: db(mock), user: student, input: { itemId: tier3.id } })).rejects.toMatchObject({ code: "LEVEL_LOCKED", status: 403 });
    await expect(purchaseAvatarItem({ db: db(mock), user: student, input: { itemId: priced.id, extra: 1 } as never })).rejects.toMatchObject({ name: "ZodError" });
    expect(mock.transaction).not.toHaveBeenCalled();
  });

  it("buys a piece in one transaction: balance check, inventory row, negative ledger row", async () => {
    const row = { ...invRow(priced.id, "i9"), source: "purchase" };
    const mock = createMockDb({ selectResults: [{ total: priced.price + 5 }], conflictInsertReturning: [row] });
    const result = await purchaseAvatarItem({ db: db(mock), user: student, now, input: { itemId: priced.id } });
    expect(result).toEqual({ item: { itemId: priced.id, dye: null, source: "purchase", catalogVersion: "1.0.0", acquiredAt: now.toISOString() }, gp: 5 });
    expect(mock.transaction).toHaveBeenCalledTimes(1);
    const inserts = mock.insert.mock.results[0]!.value.values.mock.calls.map((c: unknown[]) => c[0]);
    expect(inserts[0]).toMatchObject({ itemId: priced.id, dye: null, source: "purchase" });
    expect(inserts[1]).toMatchObject({ delta: -priced.price, reason: "purchase", sourceKey: "purchase:i9" });
  });

  it("refuses when the GP is short, when the piece is owned, and retries a serialization clash", async () => {
    const short = createMockDb({ selectResults: [{ total: priced.price - 1 }] });
    await expect(purchaseAvatarItem({ db: db(short), user: student, input: { itemId: priced.id } })).rejects.toMatchObject({ code: "INSUFFICIENT_GP", status: 409 });
    expect(short.insert).not.toHaveBeenCalled();
    const owned = createMockDb({ selectResults: [{ total: 999 }], conflictInsertReturning: [] });
    await expect(purchaseAvatarItem({ db: db(owned), user: student, input: { itemId: priced.id } })).rejects.toMatchObject({ code: "ALREADY_OWNED" });
    expect(owned.insert).toHaveBeenCalledTimes(1);
    const clash = createMockDb({ transactionFn: async () => Promise.reject(Object.assign(new Error("serialize"), { code: "40001" })) });
    await expect(purchaseAvatarItem({ db: db(clash), user: student, input: { itemId: priced.id } })).rejects.toMatchObject({ code: "RETRY", status: 409 });
  });

  it("buys a dye of a piece at the piece's price", async () => {
    const hood = AVATAR_CATALOG["rogue-hood"]!;
    const row = { ...invRow("rogue-hood", "i3", "forest"), source: "purchase" };
    const mock = createMockDb({ selectResults: [{ total: hood.price }], conflictInsertReturning: [row] });
    const result = await purchaseAvatarItem({ db: db(mock), user: student, now, input: { itemId: "rogue-hood", dye: "forest" } });
    expect(result.item).toMatchObject({ itemId: "rogue-hood", dye: "forest" });
    expect(result.gp).toBe(0);
  });
});

describe("setLoadout", () => {
  it("clears a slot and refuses a wrong slot or a piece the student does not own", async () => {
    const clear = createMockDb({ selectResults: [] });
    await expect(setLoadout({ db: db(clear), user: student, input: { slot: "head", itemId: null } })).resolves.toEqual({});
    expect(clear.delete).toHaveBeenCalledTimes(1);
    await expect(setLoadout({ db: db(clear), user: student, input: { slot: "head", itemId: oneHanded.id } })).rejects.toMatchObject({ code: "WRONG_SLOT", status: 400 });
    await expect(setLoadout({ db: db(clear), user: student, input: { slot: "mainhand", itemId: oneHanded.id } })).rejects.toMatchObject({ code: "NOT_OWNED", status: 403 });
    expect(clear.insert).not.toHaveBeenCalled();
  });

  it("wears an owned piece and keeps both hands consistent", async () => {
    const worn = createMockDb({ selectSequence: [[{ id: "i1" }], [], [{ slot: "mainhand", itemId: twoHanded.id, dye: null }]] });
    await expect(setLoadout({ db: db(worn), user: student, now, input: { slot: "mainhand", itemId: twoHanded.id } })).resolves.toEqual({ mainhand: { itemId: twoHanded.id, dye: null } });
    // The two-handed piece clears the off hand before it is worn.
    expect(worn.delete).toHaveBeenCalledTimes(1);
    expect(worn.insert.mock.results[0]!.value.values.mock.calls[0]![0]).toMatchObject({ slot: "mainhand", inventoryId: "i1" });
    const blocked = createMockDb({ selectSequence: [[{ id: "i2" }], [{ slot: "mainhand", itemId: twoHanded.id, dye: null }]] });
    await expect(setLoadout({ db: db(blocked), user: student, input: { slot: "offhand", itemId: offhand.id } })).rejects.toMatchObject({ code: "TWO_HANDED", status: 409 });
    const fine = createMockDb({ selectSequence: [[{ id: "i2" }], [{ slot: "mainhand", itemId: oneHanded.id, dye: null }], [{ slot: "mainhand", itemId: oneHanded.id, dye: null }, { slot: "offhand", itemId: offhand.id, dye: null }]] });
    const result = await setLoadout({ db: db(fine), user: student, input: { slot: "offhand", itemId: offhand.id } });
    expect(Object.keys(result).sort()).toEqual(["mainhand", "offhand"]);
    expect(fine.delete).not.toHaveBeenCalled();
  });
});

describe("teacher: class avatars and reset", () => {
  const cls = { id: "c1", schoolId: SCHOOL, teacherId: "t1" };

  it("lists every student with the profile and the worn pieces, by name", async () => {
    const mock = createMockDb({ selectSequence: [[cls], [{ userId: "s2", name: "Bee", username: "s2" }, { userId: "s1", name: null, username: "arm" }], [profileRow], [{ userId: "s1", slot: "head", itemId: "leather-cap", dye: null }]] });
    const list = await getClassAvatars({ db: db(mock), user: teacher }, "c1");
    expect(list.map((s) => s.name)).toEqual(["arm", "Bee"]);
    expect(list[0]).toMatchObject({ userId: "s1", profile: { classId: "knight" }, loadout: { head: { itemId: "leather-cap", dye: null } } });
    expect(list[1]).toMatchObject({ userId: "s2", profile: null, loadout: {} });
    expect(toLaunchAvatar({ profile: list[0]!.profile, gp: 0, level: 1, catalogVersion: "1.0.0", inventory: [], loadout: list[0]!.loadout })).toEqual({ catalogVersion: "1.0.0", classId: "knight", tints, pieces: [{ itemId: "leather-cap", dye: null }] });
    expect(toLaunchAvatar({ profile: null, gp: 0, level: 1, catalogVersion: "1.0.0", inventory: [], loadout: {} })).toBeNull();
  });

  it("resets a student of the class and refuses a student outside it or another teacher's class", async () => {
    const mock = createMockDb({ selectSequence: [[cls], [{ id: "m1" }]] });
    await resetStudentAvatar({ db: db(mock), user: teacher }, "c1", "s1");
    expect(mock.delete).toHaveBeenCalledTimes(2);
    const outside = createMockDb({ selectSequence: [[cls], []] });
    await expect(resetStudentAvatar({ db: db(outside), user: teacher }, "c1", "s9")).rejects.toMatchObject({ code: "NOT_IN_CLASS", status: 404 });
    const other = createMockDb({ selectSequence: [[{ ...cls, teacherId: "t2" }], []] });
    await expect(resetStudentAvatar({ db: db(other), user: teacher }, "c1", "s1")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
