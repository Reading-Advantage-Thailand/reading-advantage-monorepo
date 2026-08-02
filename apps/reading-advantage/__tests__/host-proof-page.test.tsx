import { render, screen } from "@testing-library/react";

const mockNotFound = jest.fn();
const mockRedirect = jest.fn();
const redirectSignal = new Error("redirect");
const mockEnabled = jest.fn();
const mockUser = jest.fn();
const mockEdition = jest.fn();

jest.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  redirect: (path: string) => {
    mockRedirect(path);
    throw redirectSignal;
  },
}));
jest.mock("@/lib/host-proof-config", () => ({ isHostProofEnabled: () => mockEnabled() }));
jest.mock("@/lib/session", () => ({ getCurrentUser: () => mockUser() }));
jest.mock("@/lib/host-proof-selections", () => ({ getDragonFlightHostProofEdition: () => mockEdition() }));
jest.mock("@/components/host-proof/HostProofGameClient", () => ({ HostProofGameClient: () => <div data-testid="host-proof-client" /> }));

import HostProofGamesPage from "@/app/[locale]/(host-proof)/student/host-proof/games/page";

describe("HostProofGamesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnabled.mockReturnValue(true);
    mockUser.mockResolvedValue({ school_id: "school-1" });
    mockEdition.mockReturnValue({ id: "primary-chibi" });
  });

  it("fails closed while disabled or when the authenticated user lacks a school", async () => {
    mockEnabled.mockReturnValue(false);
    await HostProofGamesPage();
    expect(mockNotFound).toHaveBeenCalled();
    mockEnabled.mockReturnValue(true);
    mockUser.mockResolvedValueOnce({ school_id: undefined });
    await HostProofGamesPage();
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("redirects anonymous visitors to sign in", async () => {
    mockUser.mockResolvedValue(null);
    await expect(HostProofGamesPage()).rejects.toBe(redirectSignal);
    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("renders the bounded client with the server-selected Dragon Flight edition", async () => {
    render(await HostProofGamesPage());
    expect(screen.getByTestId("host-proof-client")).toBeInTheDocument();
    expect(mockEdition).toHaveBeenCalledTimes(1);
  });
});
