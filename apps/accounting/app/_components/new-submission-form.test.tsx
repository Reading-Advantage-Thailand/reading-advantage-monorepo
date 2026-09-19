import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewSubmissionForm } from "./new-submission-form";

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

const approvedSubmission = {
  ...pendingSubmission,
  status: "approved" as const,
};
const rejectedSubmission = {
  ...pendingSubmission,
  status: "rejected" as const,
};

const navigation = vi.hoisted(() => ({
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: navigation.refresh }),
}));

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
      files: [
        new File(["receipt"], "receipt.pdf", { type: "application/pdf" }),
      ],
    },
  });
}

describe("NewSubmissionForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    navigation.refresh.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders an accessible expense and bill submission form", () => {
    render(<NewSubmissionForm />);

    expect(
      screen.getByRole("form", { name: "Submission form" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Submission kind")).toHaveValue("expense");
    expect(screen.getByLabelText("Payee")).toBeRequired();
    expect(screen.getByLabelText("Category")).toBeRequired();
    expect(screen.getByLabelText("Amount in minor units")).toBeRequired();
    expect(screen.getByLabelText("Currency (3-letter code)")).toBeRequired();
    expect(screen.getByLabelText("Evidence file")).toBeRequired();
  });

  it("previews the amount in major units for the selected currency", () => {
    render(<NewSubmissionForm />);

    fireEvent.change(screen.getByLabelText("Amount in minor units"), {
      target: { value: "12345" },
    });
    expect(screen.getByText(/THB\s+123\.45/u)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Currency (3-letter code)"), {
      target: { value: "JPY" },
    });
    expect(screen.getByText(/Major-unit preview:\s+¥12,345/u)).toBeInTheDocument();
  });

  it("keeps the form rendered without a preview for a partial currency", () => {
    render(<NewSubmissionForm />);

    fireEvent.change(screen.getByLabelText("Amount in minor units"), {
      target: { value: "12345" },
    });
    fireEvent.change(screen.getByLabelText("Currency (3-letter code)"), {
      target: { value: "TH" },
    });

    expect(
      screen.getByRole("form", { name: "Submission form" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Major-unit preview:/u)).not.toBeInTheDocument();
  });

  it("shows the settled THB field only for non-THB currencies", () => {
    render(<NewSubmissionForm />);

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
    fetchMock.mockResolvedValueOnce(jsonResponse(pendingSubmission, 201));
    render(<NewSubmissionForm />);
    fillValidExpenseForm();

    fireEvent.submit(screen.getByRole("form", { name: "Submission form" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
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
    expect(navigation.refresh).toHaveBeenCalledTimes(1);
  });

  it("accepts an approved replay and shows approved success text", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(approvedSubmission, 201));
    render(<NewSubmissionForm />);
    fillValidExpenseForm();

    fireEvent.submit(screen.getByRole("form", { name: "Submission form" }));

    expect(
      await screen.findByRole("status", {
        name: "Submission already approved.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("accepts a rejected replay and shows rejected success text", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(rejectedSubmission, 201));
    render(<NewSubmissionForm />);
    fillValidExpenseForm();

    fireEvent.submit(screen.getByRole("form", { name: "Submission form" }));

    expect(
      await screen.findByRole("status", {
        name: "Submission already rejected.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reuses the idempotency key after a failed request", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(jsonResponse(pendingSubmission, 201));
    render(<NewSubmissionForm />);
    fillValidExpenseForm();
    const form = screen.getByRole("form", { name: "Submission form" });

    fireEvent.submit(form);
    await screen.findByRole("alert", {
      name: "We could not submit this record. Please try again later.",
    });

    fireEvent.submit(form);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const firstRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const secondRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const firstKey = (firstRequest.headers as Record<string, string>)[
      "idempotency-key"
    ];
    const secondKey = (secondRequest.headers as Record<string, string>)[
      "idempotency-key"
    ];
    expect(firstKey).toEqual(expect.any(String));
    expect(secondKey).toBe(firstKey);
  });

  it("keeps the idempotency key after editing and restoring a failed form", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          { message: "Submission validation failed", fieldErrors: {} },
          400,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(pendingSubmission, 201));
    render(<NewSubmissionForm />);
    fillValidExpenseForm();
    const form = screen.getByRole("form", { name: "Submission form" });

    fireEvent.submit(form);
    await screen.findByRole("alert", { name: "Submission validation failed" });
    fireEvent.change(screen.getByLabelText("Payee"), {
      target: { value: "Updated Taxi Cooperative" },
    });
    fireEvent.change(screen.getByLabelText("Payee"), {
      target: { value: "Bangkok Taxi Cooperative" },
    });
    fireEvent.submit(form);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const firstRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const secondRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const firstKey = (firstRequest.headers as Record<string, string>)[
      "idempotency-key"
    ];
    const secondKey = (secondRequest.headers as Record<string, string>)[
      "idempotency-key"
    ];
    expect(secondKey).toBe(firstKey);
  });

  it("generates a new idempotency key after a conflict", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message:
              "The idempotency key is already used for different content",
          },
          409,
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          {
            message:
              "The idempotency key is already used for different content",
          },
          409,
        ),
      );
    render(<NewSubmissionForm />);
    fillValidExpenseForm();
    const form = screen.getByRole("form", { name: "Submission form" });

    fireEvent.submit(form);
    const conflictMessage =
      "This submission conflicts with an earlier request. Submit again to start a separate submission.";
    expect(
      await screen.findByRole("alert", { name: conflictMessage }),
    ).toBeInTheDocument();
    fireEvent.submit(form);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const firstRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const secondRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const firstKey = (firstRequest.headers as Record<string, string>)[
      "idempotency-key"
    ];
    const secondKey = (secondRequest.headers as Record<string, string>)[
      "idempotency-key"
    ];
    expect(secondKey).not.toBe(firstKey);
    expect(
      screen.getByRole("alert", { name: conflictMessage }),
    ).toBeInTheDocument();
  });

  it("generates a new idempotency key after a successful submission", async () => {
    fetchMock.mockResolvedValue(jsonResponse(pendingSubmission, 201));
    render(<NewSubmissionForm />);
    fillValidExpenseForm();
    const form = screen.getByRole("form", { name: "Submission form" });

    fireEvent.submit(form);
    await screen.findByRole("status", {
      name: "Submission received. It is pending review.",
    });

    fillValidExpenseForm();
    fireEvent.submit(form);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const firstRequest = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const secondRequest = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const firstKey = (firstRequest.headers as Record<string, string>)[
      "idempotency-key"
    ];
    const secondKey = (secondRequest.headers as Record<string, string>)[
      "idempotency-key"
    ];
    expect(secondKey).toEqual(expect.any(String));
    expect(secondKey).not.toBe(firstKey);
  });

  it("shows a submit state while the multipart request is pending", async () => {
    let resolvePost: (response: Response) => void = () => undefined;
    const postResponse = new Promise<Response>((resolve) => {
      resolvePost = resolve;
    });
    fetchMock.mockReturnValueOnce(postResponse);
    render(<NewSubmissionForm />);
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
    fetchMock.mockResolvedValueOnce(jsonResponse(pendingSubmission, 201));
    render(<NewSubmissionForm />);
    fillValidExpenseForm();
    fireEvent.change(screen.getByLabelText("Submission kind"), {
      target: { value: "bill" },
    });
    fireEvent.change(screen.getByLabelText("Currency (3-letter code)"), {
      target: { value: "usd" },
    });
    fireEvent.change(
      screen.getByLabelText("Settled THB amount in minor units"),
      {
        target: { value: "520500" },
      },
    );

    fireEvent.submit(screen.getByRole("form", { name: "Submission form" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    const formData = request.body as FormData;
    expect(formData.get("kind")).toBe("bill");
    expect(formData.get("currency")).toBe("USD");
    expect(formData.get("settledThbAmount")).toBe("520500");
    expect(formData.has("evidenceReference")).toBe(false);
  });

  it("shows server field errors for a rejected submission", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          message: "Submission validation failed",
          fieldErrors: {
            "money.currency": ["Currency must be uppercase ISO-4217"],
          },
        },
        400,
      ),
    );
    render(<NewSubmissionForm />);
    fillValidExpenseForm();
    fireEvent.change(screen.getByLabelText("Currency (3-letter code)"), {
      target: { value: "USD" },
    });
    fireEvent.change(
      screen.getByLabelText("Settled THB amount in minor units"),
      {
        target: { value: "520500" },
      },
    );
    fireEvent.submit(screen.getByRole("form", { name: "Submission form" }));

    expect(
      await screen.findByRole("alert", {
        name: "Submission validation failed",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Currency must be uppercase ISO-4217"),
    ).toBeInTheDocument();
  });

  it("does not announce success or reset the form for a malformed success body", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, 201));
    render(<NewSubmissionForm />);
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
    expect(screen.getByLabelText("Payee")).toHaveValue(
      "Bangkok Taxi Cooperative",
    );
    expect(screen.queryByText("15000 THB")).not.toBeInTheDocument();
    expect(navigation.refresh).not.toHaveBeenCalled();
  });
});
