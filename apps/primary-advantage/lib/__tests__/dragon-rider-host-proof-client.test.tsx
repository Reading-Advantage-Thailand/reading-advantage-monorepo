// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

import { DragonRiderHostProofClient } from "@/components/host-proof/DragonRiderHostProofClient";

/** Creates a successful JSON fetch response. */
function response(value: unknown) { return { ok: true, json: async () => value } as Response; }
describe("Primary Dragon Rider hidden client", () => {
  it("sends only title-local allowed payloads and displays canonical retry completion", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response({ attemptId: "11111111-1111-4111-8111-111111111111", credential: "signed", input: [{ term: "dragon", translation: "drago" }] })).mockResolvedValueOnce(response({ checkpoint: "receipt" })).mockResolvedValueOnce(response({ score: 300, xpEarned: 12, duplicate: true })); vi.stubGlobal("fetch", fetchMock);
    render(<DragonRiderHostProofClient />); fireEvent.click(screen.getByText("Issue attempt")); await screen.findByText(/Choose each gate/i); fireEvent.click(screen.getByText("Left gate")); await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2)); expect(JSON.parse(fetchMock.mock.calls[1]![1].body)).toEqual({ attemptId: "11111111-1111-4111-8111-111111111111", credential: "signed", action: { sequence: 1, kind: "choose-gate", round: 1, gate: "left" } }); fireEvent.click(screen.getByText("Complete stored attempt")); await screen.findByText(/Canonical result: 300 score, 12 XP \(retry\)/i); expect(JSON.parse(fetchMock.mock.calls[2]![1].body)).toEqual({ attemptId: "11111111-1111-4111-8111-111111111111", credential: "signed" }); expect(screen.getByRole("link", { name: /Return home/i }).getAttribute("href")).toBe("/");
  });
  it("keeps the title outside generic host/catalog ownership and Reading imports", () => { expect(readFileSync("app/api/host-proof/games/attempts/route.ts", "utf8")).not.toMatch(/dragon-rider/i); expect(readFileSync("app/[locale]/(host-proof)/student/host-proof/games/page.tsx", "utf8")).not.toMatch(/dragon-rider/i); expect(readFileSync("components/host-proof/DragonRiderHostProofClient.tsx", "utf8")).not.toMatch(/reading-advantage/i); });
});
