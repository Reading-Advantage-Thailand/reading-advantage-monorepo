import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TutorCoach } from "../tutor-coach";

describe("TutorCoach", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends only the session, authored step, locale, and learner message, then records trusted resource use", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        ok: true,
        interventionId: "a8fc7f42-4a5b-4c33-9f16-d750a2e5ed77",
        intervention: { message: "Compare host and cartridge responsibilities.", level: "conceptual_hint", diagnosticQuestion: "Who persists the result?", misconceptionTags: [] },
        resource: { id: "diagram:apk.boundaries", kind: "diagram", title: "Host boundary", action: { type: "highlight", target: "diagram.apk.boundaries" } },
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: () => "e3caf0c4-c2a3-449e-bd20-4e9509119c0e" });
    const onSupportLevel = vi.fn();
    const onTrustedResourceAction = vi.fn();

    render(<TutorCoach activitySessionId="27bc82f7-27bb-4815-9855-3e20d7f5a513" stepId="wedo.apk.manifest" locale="en" onSupportLevel={onSupportLevel} onTrustedResourceAction={onTrustedResourceAction} />);
    fireEvent.change(screen.getByLabelText("What do you need help with?"), { target: { value: "I am stuck on the host boundary." } });
    fireEvent.click(screen.getByRole("button", { name: "Ask for a hint" }));

    await screen.findByText("Compare host and cartridge responsibilities.");
    expect(JSON.parse(fetchMock.mock.calls[0]![1]!.body as string)).toEqual({
      action: "request", requestId: "e3caf0c4-c2a3-449e-bd20-4e9509119c0e", activitySessionId: "27bc82f7-27bb-4815-9855-3e20d7f5a513",
      message: "I am stuck on the host boundary.", locale: "en", stepId: "wedo.apk.manifest",
    });
    expect(onSupportLevel).toHaveBeenCalledWith("conceptual_hint");

    fireEvent.click(screen.getByRole("button", { name: "Open diagram" }));
    await waitFor(() => expect(onTrustedResourceAction).toHaveBeenCalledWith(expect.objectContaining({ id: "diagram:apk.boundaries" })));
    expect(JSON.parse(fetchMock.mock.calls[1]![1]!.body as string)).toMatchObject({ action: "resource_use", actionType: "highlight" });
  });
});
