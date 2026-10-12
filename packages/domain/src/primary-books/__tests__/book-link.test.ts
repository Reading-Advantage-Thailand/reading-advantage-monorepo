import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "../../__tests__/mock-db.js";
import { bookLinkResultSchema } from "../book-link-contracts.js";
import { resolveBookLink } from "../book-link.js";

const ref = { bookId: "b1", bookKey: "o3-2", bookName: "Primary Advantage Origins 3.2", number: 5, title: "Story 5", articleId: "a5", approved: true };
const book = { bookName: "Primary Advantage Origins 3.2", lessonCount: 14 };
const dbWith = (selects: unknown[][]) => createMockDb({ selectSequence: selects }) as unknown as DB;
const run = (db: DB, number: number, bookKey = "o3-2") => resolveBookLink({ db, bookKey, number });

describe("resolveBookLink", () => {
  it("returns ok for a published lesson", async () => {
    const result = await run(dbWith([[ref]]), 5);
    expect(result).toEqual({ kind: "ok", lesson: ref });
    expect(bookLinkResultSchema.parse(result)).toEqual(result);
  });

  it("returns unpublished for a lesson with no article or not approved", async () => {
    expect(await run(dbWith([[{ ...ref, articleId: null }]]), 5)).toEqual({ kind: "unpublished", lesson: { ...ref, articleId: null } });
    expect(await run(dbWith([[{ ...ref, approved: false }]]), 5)).toEqual({ kind: "unpublished", lesson: { ...ref, approved: false } });
  });

  it("returns no_lesson with the book name and the lesson count when the number is not in a known book", async () => {
    expect(await run(dbWith([[], [book]]), 99)).toEqual({ kind: "no_lesson", bookName: book.bookName, lessonCount: 14 });
  });

  it("returns unknown_book when the key is not in the catalogue", async () => {
    expect(await run(dbWith([[], []]), 1, "zz")).toEqual({ kind: "unknown_book" });
  });

  it.each([0, -1, 1.5, Number.NaN, 999_999_999_999])("treats the number %s as no lesson of a known book, without a lesson query", async (number) => {
    const mock = createMockDb({ selectSequence: [[book]] });
    expect(await run(mock as unknown as DB, number)).toEqual({ kind: "no_lesson", bookName: book.bookName, lessonCount: 14 });
    expect(mock.select).toHaveBeenCalledTimes(1);
  });

  it("treats a bad number of an unknown book as unknown_book", async () => {
    expect(await run(dbWith([[]]), 0, "zz")).toEqual({ kind: "unknown_book" });
  });
});
