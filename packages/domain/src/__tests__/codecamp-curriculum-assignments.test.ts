import type { DB } from "@reading-advantage/db";
import { describe, expect, it } from "vitest";
import { createTenantDB } from "../db-contract.js";
import {
  assertCodecampModuleAssigned,
  filterCodecampModulesForAssignment,
  hasCodecampAPKCurriculum,
  isCodecampAPKCurriculumReleased,
} from "../codecamp/curriculum-assignments.js";
import { createMockDb } from "./mock-db.js";

const wrapDb = (results: unknown[][]) => createTenantDB(
  createMockDb({ selectSequence: results }) as unknown as DB,
  { schoolId: null },
);

describe("Codecamp curriculum release assignments", () => {
  it("keeps automatic cohort enrollment closed while human approvals are pending", () => {
    expect(isCodecampAPKCurriculumReleased()).toBe(false);
  });

  it("keeps Unit 20 hidden from legacy learners", async () => {
    const db = wrapDb([[]]);
    const modules = [{ slug: "real-world-practice" }, { slug: "apk-game-creation" }];

    await expect(hasCodecampAPKCurriculum(db, "legacy-user")).resolves.toBe(false);
    await expect(filterCodecampModulesForAssignment(db, "legacy-user", modules)).resolves.toEqual([
      { slug: "real-world-practice" },
    ]);
  });

  it("publishes Unit 20 only for explicitly assigned learners", async () => {
    const modules = [{ slug: "real-world-practice" }, { slug: "apk-game-creation" }];
    const db = wrapDb([[{ userId: "new-user" }]]);

    await expect(filterCodecampModulesForAssignment(db, "new-user", modules)).resolves.toEqual(modules);
  });

  it("fails closed when a legacy learner addresses Unit 20 directly", async () => {
    const db = wrapDb([[{ slug: "apk-game-creation" }], []]);

    await expect(assertCodecampModuleAssigned(db, "legacy-user", "module-20")).rejects.toThrow("Module not found");
  });

  it("leaves legacy module requests untouched", async () => {
    const db = wrapDb([[{ slug: "real-world-practice" }]]);

    await expect(assertCodecampModuleAssigned(db, "legacy-user", "module-19")).resolves.toBeUndefined();
  });
});
