import { describe, expect, it, vi } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "../../__tests__/mock-db.js";
import { importLessonPackage } from "../import.js";
import { samplePackage } from "./fixtures.js";

const NEW = "22222222-2222-4222-8222-222222222222";
const MAPPED = "33333333-3333-4333-8333-333333333333";

/**
 * A mock database with the select results in call order: the existing lesson row, then the legacy map.
 * @param selects The rows of each select call.
 */
function dbWith(selects: unknown[][]) {
  return createMockDb({ selectSequence: selects, insertReturning: [{ id: "row-id" }] });
}

describe("importLessonPackage", () => {
  it("inserts a new article, its questions, and its flashcard row, then the catalogue rows", async () => {
    const mock = dbWith([[]]);
    const result = await importLessonPackage({ db: mock as unknown as DB, pkg: samplePackage(), sourceFile: "origins-3.2/p01.json", newId: () => NEW });
    expect(result).toMatchObject({ action: "new-article", articleId: NEW, legacyArticleId: null, key: "o3-2/1", bookKey: "o3-2", number: 1, approved: true });
    // articles, mcq, saq, laq, flashcard, series, book, lesson
    expect(mock.insert).toHaveBeenCalledTimes(8);
    expect(mock.transaction).toHaveBeenCalledTimes(2);
  });

  it("links a package whose legacy article is in the map and never writes that article", async () => {
    const mock = dbWith([[], [{ newId: MAPPED }]]);
    const pkg = samplePackage({ key: "o2/1", book: "origins-2", lesson: "L01" }, { db: { legacy: { articleId: "cmlegacy" } } });
    const result = await importLessonPackage({ db: mock as unknown as DB, pkg, sourceFile: "origins-2/l01.json" });
    expect(result).toMatchObject({ action: "linked", articleId: MAPPED, legacyArticleId: "cmlegacy", bookKey: "o2" });
    // only the catalogue: series, book, lesson
    expect(mock.insert).toHaveBeenCalledTimes(3);
    expect(mock.update).not.toHaveBeenCalled();
  });

  it("stores a lesson without an article when the legacy id is not mapped yet, and reports it", async () => {
    const mock = dbWith([[], []]);
    const pkg = samplePackage({ key: "o3-1/12", book: "origins-3.1", lesson: "E12", number: 12 }, { db: { legacy: { articleId: "cmnotyet" } } });
    const result = await importLessonPackage({ db: mock as unknown as DB, pkg, sourceFile: "origins-3.1/e12.json" });
    expect(result).toMatchObject({ action: "unmapped", articleId: null, legacyArticleId: "cmnotyet" });
    expect(mock.insert).toHaveBeenCalledTimes(3);
  });

  it("writes nothing in a dry run", async () => {
    const mock = dbWith([[]]);
    const result = await importLessonPackage({ db: mock as unknown as DB, pkg: samplePackage(), sourceFile: "x.json", dryRun: true, newId: () => NEW });
    expect(result.action).toBe("new-article");
    expect(mock.insert).not.toHaveBeenCalled();
    expect(mock.transaction).not.toHaveBeenCalled();
  });

  it("updates the article it created before and replaces its questions on a second import", async () => {
    const mock = dbWith([[{ articleId: NEW }]]);
    const result = await importLessonPackage({ db: mock as unknown as DB, pkg: samplePackage(), sourceFile: "x.json" });
    expect(result).toMatchObject({ action: "new-article", articleId: NEW });
    expect(mock.update).toHaveBeenCalledTimes(1);
    expect(mock.delete).toHaveBeenCalledTimes(4);
    // mcq, saq, laq, flashcard, series, book, lesson
    expect(mock.insert).toHaveBeenCalledTimes(7);
  });

  it("skips a bank article", async () => {
    const mock = dbWith([[]]);
    const bank = await importLessonPackage({ db: mock as unknown as DB, pkg: samplePackage({ role: "bank" }), sourceFile: "x.json" });
    expect(bank.action).toBe("skipped");
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("stores a draft lesson in the catalogue without an article until the review approves it", async () => {
    const mock = dbWith([[]]);
    const draft = await importLessonPackage({ db: mock as unknown as DB, pkg: samplePackage({}, { approval: { lesson: { status: "draft" } } }), sourceFile: "x.json" });
    expect(draft).toMatchObject({ action: "catalogue-only", articleId: null, approved: false });
    // series, book, lesson only
    expect(mock.insert).toHaveBeenCalledTimes(3);
  });

  it("links a draft lesson that replaces a legacy article to that (old) article", async () => {
    const mock = dbWith([[], [{ newId: MAPPED }]]);
    const pkg = samplePackage({ replaces: "cmold" }, { approval: { lesson: { status: "draft" } } });
    const result = await importLessonPackage({ db: mock as unknown as DB, pkg, sourceFile: "x.json" });
    expect(result).toMatchObject({ action: "linked", articleId: MAPPED, approved: false });
  });

  it("refuses a key that does not match the lesson number or an unknown book", async () => {
    const mock = dbWith([[]]);
    await expect(importLessonPackage({ db: mock as unknown as DB, pkg: samplePackage({ number: 2 }), sourceFile: "x.json" })).rejects.toThrow(/does not match/);
    await expect(importLessonPackage({ db: mock as unknown as DB, pkg: samplePackage({ key: "zz/1" }), sourceFile: "x.json" })).rejects.toThrow(/unknown book/);
    expect(vi.isMockFunction(mock.insert)).toBe(true);
  });
});
