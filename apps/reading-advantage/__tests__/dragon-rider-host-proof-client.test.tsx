import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DragonRiderHostProofClient } from "@/components/host-proof/DragonRiderHostProofClient";

const fetchMock = jest.fn();
global.fetch = fetchMock;
/** Creates a successful JSON fetch response. */
function response(value: unknown) { return { ok: true, json: async () => value } as Response; }
describe("Reading Dragon Rider hidden client", () => {
  beforeEach(() => { fetchMock.mockReset(); });
  it("sends only title-local allowed payloads, displays canonical retry result, and returns home", async () => {
    fetchMock.mockResolvedValueOnce(response({ attemptId: "11111111-1111-4111-8111-111111111111", credential: "signed", input: [{ term: "dragon", translation: "drago" }], seed: "server-seed" }));
    fetchMock.mockResolvedValueOnce(response({ checkpoint: "receipt" }));
    fetchMock.mockResolvedValueOnce(response({ score: 300, xpEarned: 12, duplicate: true }));
    render(<DragonRiderHostProofClient />);
    fireEvent.click(screen.getByText("Issue attempt"));
    await screen.findByText(/Choose a gate/i);
    fireEvent.click(screen.getByText("Left gate"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ attemptId: "11111111-1111-4111-8111-111111111111", credential: "signed", action: { sequence: 1, kind: "choose-gate", round: 1, gate: "left" } });
    fireEvent.click(screen.getByText("Complete stored attempt"));
    await screen.findByText(/Canonical result: 300 score, 12 XP \(retry\)/i);
    expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ attemptId: "11111111-1111-4111-8111-111111111111", credential: "signed" });
    expect(screen.getByRole("link", { name: /Return home/i })).toHaveAttribute("href", "/");
  });
  it("keeps Dragon Rider outside generic host route and catalog ownership", () => {
    const generic = require("fs").readFileSync("app/api/host-proof/games/attempts/route.ts", "utf8");
    const catalog = require("fs").readFileSync("app/[locale]/(host-proof)/student/host-proof/games/page.tsx", "utf8");
    expect(generic).not.toMatch(/dragon-rider/i); expect(catalog).not.toMatch(/dragon-rider/i);
  });
});
