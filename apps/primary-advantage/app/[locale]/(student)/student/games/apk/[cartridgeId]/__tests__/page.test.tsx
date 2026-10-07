// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PrimaryApkGamePage from "../page";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAvatarState: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("@/i18n/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mocks.redirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));
vi.mock("@/lib/session", () => ({
  getCurrentUser: (...args: unknown[]) => mocks.getCurrentUser(...args),
}));
vi.mock("@reading-advantage/db", () => ({ db: {} }));
vi.mock("@reading-advantage/domain/primary-avatar", () => ({
  getAvatarState: (...args: unknown[]) => mocks.getAvatarState(...args),
  toLaunchAvatar: (state: { profile: { classId: string } | null }) => (state.profile ? { classId: state.profile.classId } : null),
}));
vi.mock("@/components/games/game-host", () => ({
  GameHost: ({ gameId, ownerKey, challengeId, avatar, save }: { gameId: string; ownerKey?: string; challengeId?: string; avatar?: { classId: string } | null; save?: boolean }) => (
    <div data-testid="student-cartridge-host">{gameId}:owner={ownerKey ?? "none"}:challenge={challengeId ?? "none"}:avatar={avatar?.classId ?? "none"}:save={String(save)}</div>
  ),
}));

describe("PrimaryApkGamePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.getAvatarState.mockResolvedValue({ profile: null });
  });

  it("redirects a legacy 2D id to its 3D game and keeps the challenge", async () => {
    const challengeId = "11111111-1111-4111-8111-111111111111";
    await expect(PrimaryApkGamePage({
      params: Promise.resolve({ locale: "th", cartridgeId: "wizard-vs-zombie" }),
      searchParams: Promise.resolve({ challengeId }),
    })).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith({ href: `/student/games/apk/hero-vs-zombie?challengeId=${challengeId}`, locale: "th" });
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });

  it("saves nothing in demo mode", async () => {
    render(await PrimaryApkGamePage({
      params: Promise.resolve({ locale: "en", cartridgeId: "rune-match" }),
      searchParams: Promise.resolve({ mode: "demo" }),
    }));
    expect(screen.getByTestId("student-cartridge-host")).toHaveTextContent("rune-match:owner=none:challenge=none:avatar=none:save=false");
  });

  it("passes the validated student school and user identity to the client host", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "student-7", role: "STUDENT", schoolId: "school-1" });

    render(await PrimaryApkGamePage({
      params: Promise.resolve({ locale: "en", cartridgeId: "hero-vs-zombie" }),
    }));

    expect(screen.getByTestId("student-cartridge-host")).toHaveTextContent("owner=school-1:student-7");
  });

  it("passes the student's avatar to the host, and none when the read fails (FR-7 of the avatar shop)", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "student-7", role: "STUDENT", schoolId: "school-1" });
    mocks.getAvatarState.mockResolvedValueOnce({ profile: { classId: "knight" } });
    render(await PrimaryApkGamePage({ params: Promise.resolve({ locale: "en", cartridgeId: "hero-vs-zombie" }) }));
    expect(screen.getByTestId("student-cartridge-host")).toHaveTextContent("avatar=knight");
    mocks.getAvatarState.mockRejectedValueOnce(new Error("down"));
    render(await PrimaryApkGamePage({ params: Promise.resolve({ locale: "en", cartridgeId: "hero-vs-zombie" }) }));
    expect(screen.getAllByTestId("student-cartridge-host").at(-1)).toHaveTextContent("avatar=none");
  });

  it("does not create an RPG owner for a non-student identity", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "teacher-3", role: "TEACHER", schoolId: "school-1" });

    render(await PrimaryApkGamePage({
      params: Promise.resolve({ locale: "en", cartridgeId: "hero-vs-zombie" }),
    }));

    expect(screen.getByTestId("student-cartridge-host")).toHaveTextContent("owner=none");
  });

  it("passes one validated challenge identifier to the student host", async () => {
    const challengeId = "11111111-1111-4111-8111-111111111111";

    render(await PrimaryApkGamePage({
      params: Promise.resolve({ locale: "en", cartridgeId: "hero-vs-zombie" }),
      searchParams: Promise.resolve({ challengeId }),
    }));

    expect(screen.getByTestId("student-cartridge-host")).toHaveTextContent(`challenge=${challengeId}`);
  });

  it.each([
    ["malformed", "not-a-uuid"],
    ["multiple", [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]],
  ])("uses the not-found boundary for a %s challenge identifier", async (_label, challengeId) => {
    vi.mocked(notFound).mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(PrimaryApkGamePage({
      params: Promise.resolve({ locale: "en", cartridgeId: "hero-vs-zombie" }),
      searchParams: Promise.resolve({ challengeId }),
    })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });

  it("uses the normal not-found boundary for an unknown cartridge", async () => {
    vi.mocked(notFound).mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });

    await expect(PrimaryApkGamePage({
      params: Promise.resolve({ locale: "en", cartridgeId: "unknown" }),
    })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });
});
