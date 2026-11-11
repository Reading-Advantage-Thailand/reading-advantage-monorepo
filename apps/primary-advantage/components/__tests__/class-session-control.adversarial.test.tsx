// @vitest-environment jsdom
/**
 * Adversarial tests for the class sign-in lifetime control.
 * Track: primary_class_session_lifetime_20261111, Phase 1. Scope: the value that reaches the
 * server, the hidden choice, and the double click. These tests read production code only.
 */
import "@testing-library/jest-dom/vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ClassSessionControl, type ClassSessionControlProps } from "../teacher/class-login/class-session-control";
import { renderWithMessages, withMessages } from "./helpers/render-with-messages";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_SESSION_ID = "44444444-4444-4444-8444-444444444444";
const EXPIRES = "2026-10-05T07:45:00.000Z";
const START_PATH = "/api/auth/student/class-session/start";
const fetchMock = vi.fn();
const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

/** The three choices the server accepts. */
const ALLOWED_LIFETIMES = ["3h", "until_17", "7d"] as const;

/** The radio label of each choice, in English. */
const CHOICE_LABELS: Record<(typeof ALLOWED_LIFETIMES)[number], string> = {
  "3h": "3 hours",
  until_17: "Until 17:00 today",
  "7d": "7 days",
};

/** Fixes the clock that the option list reads. */
function clock(iso: string) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(iso));
}

/** Renders the control with the shared props. */
function renderControl(props: Partial<ClassSessionControlProps> = {}) {
  const onChange = props.onChange ?? vi.fn().mockResolvedValue(undefined);
  return renderWithMessages(
    <ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} {...props} />,
  );
}

/** Reads the bodies of the start requests that the control sent. */
function startBodies(): Record<string, unknown>[] {
  return fetchMock.mock.calls
    .filter((call) => call[0] === START_PATH)
    .map((call) => JSON.parse((call[1] as { body: string }).body) as Record<string, unknown>);
}

/** Reads the bodies of every request that the control sent. */
function allBodies(): Record<string, unknown>[] {
  return fetchMock.mock.calls.map((call) => JSON.parse((call[1] as { body: string }).body) as Record<string, unknown>);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("class session control: the value that reaches the server", () => {
  it("covers the three choices", () => {
    expect(ALLOWED_LIFETIMES).toHaveLength(3);
  });

  it.each(ALLOWED_LIFETIMES.map((lifetime, index) => [lifetime, index] as const))(
    "posts the chosen lifetime %s (row %i)",
    async (lifetime, _index) => {
      clock("2026-11-11T05:00:00Z"); // 12:00 Bangkok
      fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
      const onChange = vi.fn().mockResolvedValue(undefined);
      renderControl({ onChange });
      fireEvent.click(screen.getByRole("radio", { name: CHOICE_LABELS[lifetime] }));
      fireEvent.click(screen.getByRole("button", { name: "Start class" }));
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const bodies = startBodies();
      expect(bodies.length, lifetime).toBeGreaterThanOrEqual(1);
      for (const body of bodies) {
        expect(Object.keys(body).sort(), lifetime).toEqual(["classroomId", "lifetime"]);
        expect(body.lifetime, lifetime).toBe(lifetime);
        expect(body.classroomId, lifetime).toBe(CLASS_ID);
      }
    },
  );

  it("keeps one radio checked in every state", async () => {
    clock("2026-11-11T05:00:00Z"); // 12:00 Bangkok
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderControl({ onChange });
    const checkedRadios = () => screen.getAllByRole("radio").filter((radio) => (radio as HTMLInputElement).checked);
    expect(checkedRadios().length).toBe(1);
    fireEvent.click(screen.getByRole("radio", { name: CHOICE_LABELS["7d"] }));
    expect(checkedRadios().length).toBe(1);
    expect(screen.getByRole("radio", { name: CHOICE_LABELS["7d"] })).toBeChecked();
    vi.setSystemTime(new Date("2026-11-11T10:00:00Z")); // 17:00 Bangkok
    rerender(
      withMessages(
        <ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} />,
      ),
    );
    // The 7 day choice stays open after 17:00, so it stays checked.
    expect(checkedRadios().length).toBe(1);
    expect(screen.getByRole("radio", { name: CHOICE_LABELS["7d"] })).toBeChecked();
  });

  it("shows three options before 17:00 Bangkok and two after", () => {
    clock("2026-11-11T09:59:59.999Z"); // 16:59:59.999 Bangkok
    const { rerender } = renderControl();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    vi.setSystemTime(new Date("2026-11-11T10:00:00.000Z")); // 17:00 Bangkok
    rerender(
      withMessages(
        <ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={vi.fn()} />,
      ),
    );
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByRole("radio", { name: CHOICE_LABELS.until_17 })).not.toBeInTheDocument();
  });
});

describe("class session control: the hidden choice", () => {
  it("never posts the hidden until_17 choice on a start", async () => {
    clock("2026-11-11T09:59:59.999Z"); // 16:59:59.999 Bangkok
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderControl({ onChange });
    fireEvent.click(screen.getByRole("radio", { name: CHOICE_LABELS.until_17 }));
    expect(screen.getByRole("radio", { name: CHOICE_LABELS.until_17 })).toBeChecked();
    vi.setSystemTime(new Date("2026-11-11T10:00:00.000Z")); // 17:00 Bangkok
    rerender(
      withMessages(
        <ClassSessionControl classroomId={CLASS_ID} openSession={null} fetchedAt={1} onChange={onChange} />,
      ),
    );
    expect(screen.queryByRole("radio", { name: CHOICE_LABELS.until_17 })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start class" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const bodies = startBodies();
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    for (const body of bodies) {
      expect(body.lifetime).not.toBe("until_17");
      expect(ALLOWED_LIFETIMES).toContain(body.lifetime);
    }
  });

  it("never posts the hidden until_17 choice on a new code", async () => {
    clock("2026-11-11T09:59:59.999Z"); // 16:59:59.999 Bangkok
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    const { rerender } = renderControl({ openSession: { id: OTHER_SESSION_ID, expiresAt: EXPIRES }, onChange });
    fireEvent.click(screen.getByRole("radio", { name: CHOICE_LABELS.until_17 }));
    vi.setSystemTime(new Date("2026-11-11T10:00:00.000Z")); // 17:00 Bangkok
    rerender(
      withMessages(
        <ClassSessionControl
          classroomId={CLASS_ID}
          openSession={{ id: OTHER_SESSION_ID, expiresAt: EXPIRES }}
          fetchedAt={1}
          onChange={onChange}
        />,
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "New code" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const bodies = startBodies();
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    for (const body of bodies) {
      expect(body.lifetime).not.toBe("until_17");
    }
  });
});

describe("class session control: the double click", () => {
  it("sends at most two start requests with the same lifetime", async () => {
    clock("2026-11-11T05:00:00Z"); // 12:00 Bangkok
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderControl({ onChange });
    fireEvent.click(screen.getByRole("radio", { name: CHOICE_LABELS["7d"] }));
    const start = screen.getByRole("button", { name: "Start class" });
    fireEvent.click(start);
    fireEvent.click(start);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const bodies = startBodies();
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    expect(bodies.length).toBeLessThanOrEqual(2);
    const lifetimes = new Set(bodies.map((body) => body.lifetime));
    expect(lifetimes.size).toBe(1);
    expect([...lifetimes]).toEqual(["7d"]);
  });

  it("sends at most two new code requests with the same lifetime", async () => {
    clock("2026-11-11T05:00:00Z"); // 12:00 Bangkok
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "GHJKMN", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderControl({ openSession: { id: OTHER_SESSION_ID, expiresAt: EXPIRES }, onChange });
    fireEvent.click(screen.getByRole("radio", { name: CHOICE_LABELS.until_17 }));
    const newCode = screen.getByRole("button", { name: "New code" });
    fireEvent.click(newCode);
    fireEvent.click(newCode);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const bodies = startBodies();
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    expect(bodies.length).toBeLessThanOrEqual(2);
    const lifetimes = new Set(bodies.map((body) => body.lifetime));
    expect(lifetimes.size).toBe(1);
    expect([...lifetimes]).toEqual(["until_17"]);
  });

  it("sends no request with a lifetime outside the choice list", async () => {
    clock("2026-11-11T05:00:00Z"); // 12:00 Bangkok
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderControl({ onChange });
    const start = screen.getByRole("button", { name: "Start class" });
    fireEvent.click(start);
    fireEvent.click(start);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const bodies = allBodies();
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    for (const body of bodies) {
      expect(ALLOWED_LIFETIMES).toContain(body.lifetime);
      expect(Object.keys(body).sort()).toEqual(["classroomId", "lifetime"]);
    }
  });

  it("sends the same lifetime twice when both clicks land in one React batch", async () => {
    clock("2026-11-11T05:00:00Z"); // 12:00 Bangkok
    fetchMock.mockReturnValue(json(200, { sessionId: SESSION_ID, code: "ABCDEF", expiresAt: EXPIRES }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderControl({ onChange });
    fireEvent.click(screen.getByRole("radio", { name: CHOICE_LABELS["7d"] }));
    const start = screen.getByRole("button", { name: "Start class" });
    // Two clicks in one batch: the disabled state of the button arrives after the batch, so both
    // clicks can reach the handler.
    act(() => {
      start.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      start.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const bodies = startBodies();
    expect(bodies.length).toBeGreaterThanOrEqual(1);
    expect(bodies.length).toBeLessThanOrEqual(2);
    const lifetimes = new Set(bodies.map((body) => body.lifetime));
    expect(lifetimes.size).toBe(1);
    expect([...lifetimes]).toEqual(["7d"]);
  });
});
