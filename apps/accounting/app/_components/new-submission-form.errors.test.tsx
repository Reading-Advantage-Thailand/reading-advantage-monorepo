import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewSubmissionForm } from "./new-submission-form";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}));

const fetchMock = vi.fn();

/**
 * Builds a fetch response with a JSON or raw body.
 * @param status HTTP status.
 * @param body JSON value, or a raw string body.
 * @returns The response.
 */
function reply(status: number, body: unknown): Response {
  return new Response(
    typeof body === "string" ? body : JSON.stringify(body),
    { status, headers: { "content-type": "application/json" } },
  );
}

/**
 * Sets the minor-unit amount and currency inputs.
 * @param amount Minor-unit amount text.
 * @param currency Currency code text.
 */
function setMoney(amount: string, currency: string): void {
  fireEvent.change(screen.getByLabelText("Amount in minor units"), {
    target: { value: amount },
  });
  fireEvent.change(screen.getByLabelText("Currency (3-letter code)"), {
    target: { value: currency },
  });
}

/** Submits the form. */
function submit(): void {
  fireEvent.submit(screen.getByRole("form", { name: "Submission form" }));
}

describe("NewSubmissionForm amount preview", () => {
  it.each([
    ["1", "USD", "$0.01"],
    ["0", "THB", "THB\u00a00.00"],
    ["123456789", "USD", "$1,234,567.89"],
    ["900719925474099199", "USD", "$9,007,199,254,740,991.99"],
    ["1234", "KWD", "KWD\u00a01.234"],
    ["5", "JPY", "¥5"],
  ])("previews %s %s as %s", (amount, currency, preview) => {
    render(<NewSubmissionForm />);
    setMoney(amount, currency);

    const escaped = preview.replace(/[$.]/gu, "\\$&").replace(/[ \u00a0]/gu, "\\s+");
    expect(
      screen.getByText(new RegExp(`Major-unit preview:\\s+${escaped}$`, "u")),
    ).toBeInTheDocument();
  });

  it.each([
    ["a decimal amount", "1.50", "USD"],
    ["a negative amount", "-100", "USD"],
    ["an unknown currency", "100", "ZZ1"],
  ])("shows no preview for %s", (_label, amount, currency) => {
    render(<NewSubmissionForm />);
    setMoney(amount, currency);

    expect(screen.queryByText(/Major-unit preview:/u)).not.toBeInTheDocument();
  });
});

describe("NewSubmissionForm submit errors", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    navigation.refresh.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    [401, { message: "x" }, "Your session has expired. Sign in again to continue."],
    [403, { message: "x" }, "You do not have permission to use the accounting workspace."],
    [500, { message: "Storage unavailable" }, "Storage unavailable"],
    [502, "gateway html", "We could not submit this record. Please try again."],
  ])("shows the mapped message for status %i", async (status, body, text) => {
    fetchMock.mockResolvedValueOnce(reply(status, body));
    render(<NewSubmissionForm />);

    submit();

    expect(await screen.findByRole("alert", { name: text })).toBeInTheDocument();
    expect(navigation.refresh).not.toHaveBeenCalled();
  });

  it("shows a retry-later message when the request throws", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    render(<NewSubmissionForm />);

    submit();

    expect(
      await screen.findByRole("alert", {
        name: "We could not submit this record. Please try again later.",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();
  });

  it("uses the fallback 400 message and keeps only string field errors", async () => {
    fetchMock.mockResolvedValueOnce(
      reply(400, {
        fieldErrors: {
          "money.amountMinor": ["Amount must be a positive integer"],
          amountMinor: ["Amount is required"],
          payee: [42],
          category: "not a list",
        },
      }),
    );
    render(<NewSubmissionForm />);

    submit();

    expect(
      await screen.findByRole("alert", {
        name: "Please correct the highlighted fields.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Amount is required Amount must be a positive integer"),
    ).toBeInTheDocument();
    expect(screen.queryByText("42")).not.toBeInTheDocument();
    expect(screen.queryByText("not a list")).not.toBeInTheDocument();
  });

  it("shows no field errors when a 400 body has none", async () => {
    fetchMock.mockResolvedValueOnce(reply(400, "not json"));
    render(<NewSubmissionForm />);

    submit();

    expect(
      await screen.findByRole("alert", {
        name: "Please correct the highlighted fields.",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
});
