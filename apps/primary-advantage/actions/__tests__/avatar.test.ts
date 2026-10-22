// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  setAvatarProfile: vi.fn(),
  getAvatarState: vi.fn(),
  refresh: vi.fn(),
  calls: [] as string[],
}));

vi.mock("next/cache", () => ({ refresh: () => { mocks.calls.push("refresh"); mocks.refresh(); } }));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@/lib/session", () => ({ currentUser: mocks.currentUser }));
vi.mock("@reading-advantage/domain/primary-avatar", () => ({
  setAvatarProfile: async (...a: unknown[]) => { mocks.calls.push("save"); return mocks.setAvatarProfile(...a); },
  getAvatarState: async (...a: unknown[]) => { mocks.calls.push("grant"); return mocks.getAvatarState(...a); },
}));

import { setAvatarProfileAction } from "../avatar";

const student = { id: "s1", role: "STUDENT", schoolId: "school-1" };
const input = { classId: "ranger", tints: { skin: "tan", hair: "teal", eyes: "green", cloth: "moss" } } as const;
const profile = { classId: "ranger", tints: input.tints, catalogVersion: "1.0.0", updatedAt: "2026-10-21T00:00:00.000Z" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.currentUser.mockResolvedValue(student);
  mocks.setAvatarProfile.mockResolvedValue(profile);
  mocks.getAvatarState.mockResolvedValue({});
});

describe("setAvatarProfileAction", () => {
  it("grants the first-visit set before it refreshes the client, so the header purse shows the welcome GP", async () => {
    await expect(setAvatarProfileAction(input)).resolves.toEqual({ success: true, profile });
    expect(mocks.calls).toEqual(["save", "grant", "refresh"]);
    expect(mocks.getAvatarState).toHaveBeenCalledWith(expect.objectContaining({ user: student }));
  });

  it("returns the error and neither grants nor refreshes when the save fails", async () => {
    mocks.setAvatarProfile.mockRejectedValue(new Error("no starter set 'fox'"));
    await expect(setAvatarProfileAction(input)).resolves.toEqual({ success: false, error: "no starter set 'fox'" });
    expect(mocks.calls).toEqual(["save"]);
  });
});
