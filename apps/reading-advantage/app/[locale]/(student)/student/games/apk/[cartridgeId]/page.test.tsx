import { render, screen } from "@testing-library/react";
import { notFound } from "next/navigation";

import ReadingApkGamePage from "./page";

const mockGetCartridgeCatalogEntry = jest.fn();
const mockGetCurrentUser = jest.fn();
const mockToUserContext = jest.fn();

jest.mock("next/navigation", () => ({ notFound: jest.fn() }));
jest.mock("@reading-advantage/game-cartridges", () => ({
  getCartridgeCatalogEntry: (...args: unknown[]) => mockGetCartridgeCatalogEntry(...args),
}));
jest.mock("@/lib/session", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));
jest.mock("@/lib/apk/to-user-context", () => ({
  toUserContext: (...args: unknown[]) => mockToUserContext(...args),
}));
jest.mock("@/components/apk/StudentCartridgeHost", () => ({
  StudentCartridgeHost: ({ cartridgeId, ownerKey, challengeId }: { cartridgeId: string; ownerKey?: string; challengeId?: string }) => (
    <div data-testid="student-cartridge-host">{cartridgeId}:owner={ownerKey ?? "none"}:challenge={challengeId ?? "none"}</div>
  ),
}));

describe("ReadingApkGamePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCartridgeCatalogEntry.mockReturnValue({
      id: "wizard-vs-zombie", title: "Wizard vs. Zombie",
      description: "Defend the ward.", inputMode: "vocabulary",
    });
    mockGetCurrentUser.mockResolvedValue(null);
  });

  it("passes a validated student and school owner key to the client host", async () => {
    const sessionUser = { id: "student-7", school_id: "school-1" };
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockToUserContext.mockReturnValue({ id: "student-7", role: "STUDENT", schoolId: "school-1" });

    render(await ReadingApkGamePage({ params: Promise.resolve({ locale: "en", cartridgeId: "wizard-vs-zombie" }) }));

    expect(mockToUserContext).toHaveBeenCalledWith(sessionUser);
    expect(screen.getByTestId("student-cartridge-host")).toHaveTextContent("owner=school-1:student-7");
  });

  it("does not create an RPG owner key for an invalid student context", async () => {
    mockGetCurrentUser.mockResolvedValue({ id: "teacher-1" });
    mockToUserContext.mockReturnValue({ id: "teacher-1", role: "TEACHER", schoolId: "school-1" });

    render(await ReadingApkGamePage({ params: Promise.resolve({ locale: "en", cartridgeId: "wizard-vs-zombie" }) }));

    expect(screen.getByTestId("student-cartridge-host")).toHaveTextContent("owner=none");
  });

  it("passes one validated challenge identifier to the student host", async () => {
    const challengeId = "11111111-1111-4111-8111-111111111111";
    render(await ReadingApkGamePage({
      params: Promise.resolve({ locale: "en", cartridgeId: "wizard-vs-zombie" }),
      searchParams: Promise.resolve({ challengeId }),
    }));
    expect(screen.getByTestId("student-cartridge-host")).toHaveTextContent(`challenge=${challengeId}`);
  });

  it.each([["malformed", "bad"], ["multiple", ["11111111-1111-4111-8111-111111111111"]]])("uses the not-found boundary for a %s challenge identifier", async (_label, challengeId) => {
    (notFound as jest.Mock).mockImplementation(() => { throw new Error("NEXT_NOT_FOUND"); });
    await expect(ReadingApkGamePage({
      params: Promise.resolve({ locale: "en", cartridgeId: "wizard-vs-zombie" }),
      searchParams: Promise.resolve({ challengeId }),
    })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("uses the normal not-found boundary for an unknown cartridge", async () => {
    mockGetCartridgeCatalogEntry.mockReturnValue(undefined);
    (notFound as jest.Mock).mockImplementation(() => { throw new Error("NEXT_NOT_FOUND"); });

    await expect(ReadingApkGamePage({
      params: Promise.resolve({ locale: "en", cartridgeId: "unknown" }),
    })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });
});
