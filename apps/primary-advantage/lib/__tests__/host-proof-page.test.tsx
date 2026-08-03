/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNotFound = vi.fn();
const mockRedirect = vi.fn();
const redirectSignal = new Error("redirect");
const mockEnabled = vi.fn();
const mockUser = vi.fn();
const mockEdition = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  redirect: (path: string) => {
    mockRedirect(path);
    throw redirectSignal;
  },
}));
vi.mock("@/lib/host-proof-config", () => ({ isHostProofEnabled: () => mockEnabled() }));
vi.mock("@/lib/session", () => ({ getCurrentUser: () => mockUser() }));
vi.mock("@/lib/host-proof-selections", () => ({ getDragonFlightHostProofEdition: () => mockEdition() }));
vi.mock("@/components/host-proof/HostProofGameClient", () => ({ HostProofGameClient: () => <div data-testid="host-proof-client" /> }));

import HostProofGamesPage from "@/app/[locale]/(host-proof)/student/host-proof/games/page";

describe("HostProofGamesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnabled.mockReturnValue(true);
    mockUser.mockResolvedValue({ schoolId: "school-1" });
    mockEdition.mockReturnValue({ id: "primary-chibi" });
  });

  it("fails closed while disabled or when the user lacks a school", async () => {
    mockEnabled.mockReturnValue(false);
    await HostProofGamesPage({ searchParams: {} });
    expect(mockNotFound).toHaveBeenCalled();
    mockEnabled.mockReturnValue(true);
    mockUser.mockResolvedValueOnce({ schoolId: undefined });
    await HostProofGamesPage({ searchParams: {} });
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("redirects anonymous visitors", async () => {
    mockUser.mockResolvedValue(null);
    await expect(HostProofGamesPage({ searchParams: {} })).rejects.toBe(redirectSignal);
    expect(mockRedirect).toHaveBeenCalledWith("/auth/signin");
  });

  it("passes the server-selected Dragon Flight edition to the bounded client", async () => {
    render(await HostProofGamesPage({ searchParams: {} }));
    expect(screen.getByTestId("host-proof-client")).toBeInTheDocument();
    expect(mockEdition).toHaveBeenCalledTimes(1);
  });
});
