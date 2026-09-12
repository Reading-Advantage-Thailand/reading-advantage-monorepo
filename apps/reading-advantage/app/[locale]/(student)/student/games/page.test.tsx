import { render, screen } from "@testing-library/react";

import GamesPage from "./page";

const mockGetCurrentUser = jest.fn();
const mockToUserContext = jest.fn();

jest.mock("@/lib/session", () => ({
  getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
}));
jest.mock("@/lib/apk/to-user-context", () => ({
  toUserContext: (...args: unknown[]) => mockToUserContext(...args),
}));
jest.mock("@/components/apk/StudentGamesCatalog", () => ({
  StudentGamesCatalog: ({ ownerKey }: { ownerKey?: string }) => (
    <div data-testid="student-games-catalog">owner={ownerKey ?? "none"}</div>
  ),
}));

describe("Reading student games page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(null);
  });

  it("passes the validated student and school owner key to the catalog", async () => {
    const sessionUser = { id: "student-7", school_id: "school-1" };
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockToUserContext.mockReturnValue({ id: "student-7", role: "STUDENT", schoolId: "school-1" });

    render(await GamesPage());

    expect(mockToUserContext).toHaveBeenCalledWith(sessionUser);
    expect(screen.getByTestId("student-games-catalog")).toHaveTextContent("owner=school-1:student-7");
  });

  it.each([
    ["a teacher", { id: "teacher-1" }, { id: "teacher-1", role: "TEACHER", schoolId: "school-1" }],
    ["a student without a school", { id: "student-8" }, { id: "student-8", role: "STUDENT", schoolId: null }],
  ])("does not create an RPG owner key for %s", async (_label, sessionUser, user) => {
    mockGetCurrentUser.mockResolvedValue(sessionUser);
    mockToUserContext.mockReturnValue(user);

    render(await GamesPage());

    expect(screen.getByTestId("student-games-catalog")).toHaveTextContent("owner=none");
  });

  it("renders the catalog without an owner for an unauthenticated request", async () => {
    render(await GamesPage());

    expect(mockToUserContext).not.toHaveBeenCalled();
    expect(screen.getByTestId("student-games-catalog")).toHaveTextContent("owner=none");
  });
});
