import { describe, expect, it, vi } from "vitest";
import { handleActivityHttpRequest, type ActivityHttpHandlers, type ActivityHttpRequest } from "../routes/activity/index.js";
import { appRouter } from "../root.js";

const actor = { userId: "learner-1", schoolId: "school-1" } as unknown as ActivityHttpRequest["actor"];

function handlers() {
  return {
    start: vi.fn().mockResolvedValue("start-result"),
    append: vi.fn().mockResolvedValue("append-result"),
    get: vi.fn().mockResolvedValue("get-result"),
    assessCheckpoint: vi.fn().mockResolvedValue("checkpoint-result"),
    assessTutorial: vi.fn().mockResolvedValue("tutorial-result"),
    prepareTutorial: vi.fn().mockResolvedValue("prepare-result"),
    reissueTutorialCredential: vi.fn().mockResolvedValue("reissue-result"),
    reportTutorial: vi.fn().mockResolvedValue("report-result"),
  };
}

const routes: Array<[ActivityHttpRequest["operation"], keyof ReturnType<typeof handlers>, string]> = [
  ["start", "start", "start-result"],
  ["append", "append", "append-result"],
  ["get", "get", "get-result"],
  ["assess-checkpoint", "assessCheckpoint", "checkpoint-result"],
  ["assess-tutorial", "assessTutorial", "tutorial-result"],
  ["prepare-tutorial", "prepareTutorial", "prepare-result"],
  ["reissue-tutorial-credential", "reissueTutorialCredential", "reissue-result"],
  ["report-tutorial", "reportTutorial", "report-result"],
];

describe("handleActivityHttpRequest", () => {
  it.each(routes)("routes %s only to handler %s with the actor and body", async (operation, handlerName, expected) => {
    const h = handlers();
    const body = { untrusted: operation };

    await expect(handleActivityHttpRequest(h as unknown as ActivityHttpHandlers, { actor, operation, body })).resolves.toBe(expected);

    expect(h[handlerName]).toHaveBeenCalledTimes(1);
    expect(h[handlerName]).toHaveBeenCalledWith(actor, body);
    for (const [name, fn] of Object.entries(h)) {
      if (name !== handlerName) expect(fn).not.toHaveBeenCalled();
    }
  });

  it("propagates a handler rejection", async () => {
    const h = handlers();
    h.reportTutorial.mockRejectedValue(new Error("evidence rejected"));

    await expect(handleActivityHttpRequest(h as unknown as ActivityHttpHandlers, { actor, operation: "report-tutorial", body: {} })).rejects.toThrow("evidence rejected");
  });

  it("returns undefined and calls no handler for an unknown operation", async () => {
    const h = handlers();

    await expect(handleActivityHttpRequest(h as unknown as ActivityHttpHandlers, { actor, operation: "delete" as never, body: {} })).resolves.toBeUndefined();
    for (const fn of Object.values(h)) expect(fn).not.toHaveBeenCalled();
  });
});

describe("appRouter", () => {
  it("mounts every product router including activity", () => {
    expect(Object.keys(appRouter._def.record).sort()).toEqual([
      "activity", "articles", "assignments", "auth", "classes", "codecamp", "progress", "reports", "sales", "students", "users",
    ]);
  });
});
