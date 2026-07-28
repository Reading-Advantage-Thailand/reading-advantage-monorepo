import HostProofGamesPage from "@/app/[locale]/(host-proof)/student/host-proof/games/page";
import { render, screen } from "@testing-library/react";

const mockNotFound = jest.fn();
const mockIsHostProofEnabled = jest.fn();

jest.mock("next/navigation", () => ({ notFound: () => mockNotFound() }));
jest.mock("@/lib/host-proof-config", () => ({
  isHostProofEnabled: () => mockIsHostProofEnabled(),
}));
jest.mock("@/components/host-proof/HostProofGameClient", () => ({
  HostProofGameClient: () => <div data-testid="host-proof-client" />,
}));

describe("HostProofGamesPage", () => {
  beforeEach(() => {
    mockNotFound.mockReset();
    mockIsHostProofEnabled.mockReset();
  });

  it("fails closed when the server flag is disabled", () => {
    mockIsHostProofEnabled.mockReturnValue(false);

    HostProofGamesPage();

    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("renders the hidden host client only when explicitly enabled", () => {
    mockIsHostProofEnabled.mockReturnValue(true);

    render(<HostProofGamesPage />);

    expect(mockNotFound).not.toHaveBeenCalled();
    expect(screen.getByTestId("host-proof-client")).toBeInTheDocument();
  });
});
