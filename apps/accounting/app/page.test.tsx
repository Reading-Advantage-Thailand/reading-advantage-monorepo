import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const emptySubmissionsResponse = {
  submissions: [],
};

const pendingSubmission = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  scope: { companyId: "33333333-3333-4333-8333-333333333333" },
  status: "pending",
  submittedByAccountId: "11111111-1111-4111-8111-111111111111",
  submittedAt: "2026-08-10T02:04:05.678Z",
  kind: "bill",
  payee: "Bangkok Taxi Cooperative",
  category: "travel",
  money: { amountMinor: "15000", currency: "USD" },
  evidenceReference:
    "private-evidence://33333333-3333-4333-8333-333333333333/submissions/0001/receipt.pdf",
  settledThbAmount: "520500",
};

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function fillValidExpenseForm(): void {
  fireEvent.change(screen.getByLabelText("Payee"), {
    target: { value: "Bangkok Taxi Cooperative" },
  });
  fireEvent.change(screen.getByLabelText("Category"), {
    target: { value: "travel" },
  });
  fireEvent.change(screen.getByLabelText("Amount in minor units"), {
    target: { value: "15000" },
  });
  fireEvent.change(screen.getByLabelText("Currency (3-letter code)"), {
    target: { value: "THB" },
  });
  fireEvent.change(screen.getByLabelText("Evidence file"), {
    target: {
      files: [new File(["receipt"], "receipt.pdf", { type: "application/pdf" })],
    },
  });
}

describe("HomePage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse(emptySubmissionsResponse));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an accessible expense and bill submission form", async () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: "Accounting workspace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Submission form" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Submission kind")).toHaveValue("expense");
    expect(screen.getByLabelText("Payee")).toBeRequired();
    expect(screen.getByLabelText("Category")).toBeRequired();
    expect(screen.getByLabelText("Amount in minor units")).toBeRequired();
    expect(screen.getByLabelText("Currency (3-letter code)")).toBeRequired();
    expect(screen.getByLabelText("Evidence file")).toBeRequired();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/submissions",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  it("shows the settled THB field only for non-THB currencies", async () => {
    render(<HomePage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(
      screen.queryByLabelText("Settled THB amount in minor units"),
    ).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Currency (3-letter code)"), {
      target: { value: "USD" },
    });
    expect(
      screen.getByLabelText("Settled THB amount in minor units"),
    ).toBeRequired();

    fireEvent.change(screen.getByLabelText("Currency (3-letter code)"), {
      target: { value: "THB" },
    });
    expect(
      screen.queryByLabelText("Settled THB amount in minor units"),
    ).not.toBeInTheDocument();
  });

  it("submits multipart form data without an evidenceReference field", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(emptySubmissionsResponse))
      .mockResolvedValueOnce(jsonResponse(pendingSubmission, 201));
    render(<HomePage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fillValidExpenseForm();

    fireEvent.submit(screen.getByRole("form", { name: "Submission form" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, request] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(request.method).toBe("POST");
    expect(request.body).toBeInstanceOf(FormData);
    const formData = request.body as FormData;
    expect(formData.get("kind")).toBe("expense");
    expect(formData.get("payee")).toBe("Bangkok Taxi Cooperative");
    expect(formData.get("amountMinor")).toBe("15000");
    expect(formData.get("currency")).toBe("THB");
    expect(formData.get("evidence")).toBeInstanceOf(File);
    expect(formData.has("evidenceReference")).toBe(false);
    expect(formData.has("settledThbAmount")).toBe(false);
    expect(
      await screen.findByRole("status", {
        name: "Submission received. It is pending review.",
      }),
    ).toBeInTheDocument();
  });

  it("shows a submit state while the multipart request is pending", async () => {
    let resolvePost: (response: Response) => void = () => undefined;
    const postResponse = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });
    fetchMock
      .mockResolvedValueOnce(jsonResponse(emptySubmissionsResponse))
      .mockReturnValueOnce(postResponse);
    render(<HomePage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fillValidExpenseForm();

    fireEvent.submit(screen.getByRole("form", { name: "Submission form" }));

    expect(
      await screen.findByRole("button", { name: "Submitting…" }),
    ).toBeDisabled();
    expect(screen.getByText("Submitting your record…")).toBeInTheDocument();

    resolvePost(jsonResponse(pendingSubmission, 201));
    expect(
      await screen.findByRole("status", {
        name: "Submission received. It is pending review.",
      }),
    ).toBeInTheDocument();
  });

  it("includes settled THB amount in multipart form data for a non-THB bill", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(emptySubmissionsResponse))
      .mockResolvedValueOnce(jsonResponse(pendingSubmission, 201));
    render(<HomePage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fillValidExpenseForm();
    fireEvent.change(screen.getByLabelText("Submission kind"), {
      target: { value: "bill" },
    });
    fireEvent.change(screen.getByLabelText("Currency (3-letter code)"), {
      target: { value: "usd" },
    });
    fireEvent.change(screen.getByLabelText("Settled THB amount in minor units"), {
      target: { value: "520500" },
    });

    fireEvent.submit(screen.getByRole("form", { name: "Submission form" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [, request] = fetchMock.mock.calls[1] as [string, RequestInit];
    const formData = request.body as FormData;
    expect(formData.get("kind")).toBe("bill");
    expect(formData.get("currency")).toBe("USD");
    expect(formData.get("settledThbAmount")).toBe("520500");
    expect(formData.has("evidenceReference")).toBe(false);
  });

  it("renders pending submissions with original money and evidence reference", async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({ submissions: [pendingSubmission] }));
    render(<HomePage />);

    expect(await screen.findByText("Bangkok Taxi Cooperative")).toBeInTheDocument();
    expect(screen.getByText("15000 USD")).toBeInTheDocument();
    expect(
      screen.getByText(pendingSubmission.evidenceReference),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
  });

  it("shows server field errors for a rejected submission", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(emptySubmissionsResponse))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message: "Submission validation failed",
            fieldErrors: { "money.currency": ["Currency must be uppercase ISO-4217"] },
          },
          400,
        ),
      );
    render(<HomePage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fillValidExpenseForm();
    fireEvent.change(screen.getByLabelText("Currency (3-letter code)"), {
      target: { value: "USD" },
    });
    fireEvent.change(screen.getByLabelText("Settled THB amount in minor units"), {
      target: { value: "520500" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Submission form" }));

    expect(
      await screen.findByRole("alert", { name: "Submission validation failed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Currency must be uppercase ISO-4217"),
    ).toBeInTheDocument();
  });

  it("does not announce success or reset the form for a malformed success body", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(emptySubmissionsResponse))
      .mockResolvedValueOnce(jsonResponse({}, 201));
    render(<HomePage />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fillValidExpenseForm();

    fireEvent.submit(screen.getByRole("form", { name: "Submission form" }));

    expect(
      await screen.findByRole("alert", {
        name: "We could not submit this record. Please try again.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("status", {
        name: "Submission received. It is pending review.",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Payee")).toHaveValue("Bangkok Taxi Cooperative");
    expect(screen.queryByText("15000 THB")).not.toBeInTheDocument();
  });

  it.each([
    [401, "Your session has expired. Sign in again to continue."],
    [403, "You do not have permission to use the accounting workspace."],
  ] as const)("shows a user-facing message for a %d response", async (status, message) => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({ message: "Access denied" }, status));
    render(<HomePage />);

    expect(await screen.findByRole("alert", { name: message })).toBeInTheDocument();
  });
});
