import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

const mocks = vi.hoisted(() => ({
  getAccountingSessionOrRedirect: vi.fn(),
  listAccountingSubmissions: vi.fn(),
  redirect: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    mocks.redirect(url);
    throw Object.assign(new Error("NEXT_REDIRECT"), {
      digest: `NEXT_REDIRECT;replace;${url};307;`,
    });
  },
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/app/lib/auth", () => ({
  getAccountingSessionOrRedirect: mocks.getAccountingSessionOrRedirect,
}));

vi.mock("@/app/lib/submissions", () => ({
  listAccountingSubmissions: mocks.listAccountingSubmissions,
}));

vi.mock("./_components/pending-submissions-list", () => ({
  PendingSubmissionsList: ({
    submissions,
  }: {
    readonly submissions: readonly {
      readonly id: string;
      readonly payee: string;
      readonly money: { readonly amountMinor: string; readonly currency: string };
      readonly evidenceReference: string;
    }[];
  }) => (
    <section aria-label="Pending submissions">
      {submissions.map((submission) => (
        <article key={submission.id}>
          <p>{submission.payee}</p>
          <p>
            {submission.money.amountMinor} {submission.money.currency}
          </p>
          <p>{submission.evidenceReference}</p>
        </article>
      ))}
    </section>
  ),
}));

const COMPANY_ID = "33333333-3333-4333-8333-333333333333";
const OWNER_ACCOUNT_ID = "99999999-9999-4999-8999-999999999999";

const ownerUser = {
  id: OWNER_ACCOUNT_ID,
  username: "accounting-owner",
  name: "Accounting Owner",
  role: "OWNER" as const,
  organizationId: COMPANY_ID,
  applicationRoles: ["OWNER"],
};

const pendingSubmission = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  scope: { companyId: COMPANY_ID },
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

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAccountingSessionOrRedirect.mockResolvedValue({ user: ownerUser });
    mocks.listAccountingSubmissions.mockResolvedValue([pendingSubmission]);
  });

  it("calls listAccountingSubmissions once with the session-derived actor", async () => {
    render(await HomePage());

    expect(mocks.listAccountingSubmissions).toHaveBeenCalledTimes(1);
    expect(mocks.listAccountingSubmissions).toHaveBeenCalledWith({
      actor: {
        accountId: OWNER_ACCOUNT_ID,
        companyId: COMPANY_ID,
        role: "OWNER",
      },
    });
  });

  it("redirects an unauthenticated session to /login", async () => {
    mocks.getAccountingSessionOrRedirect.mockImplementation(() => {
      mocks.redirect("/login");
      throw Object.assign(new Error("NEXT_REDIRECT"), {
        digest: "NEXT_REDIRECT;replace;/login;307;",
      });
    });

    await expect(HomePage()).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.listAccountingSubmissions).not.toHaveBeenCalled();
  });

  it("redirects a non-accounting session to /login", async () => {
    mocks.getAccountingSessionOrRedirect.mockImplementation(() => {
      mocks.redirect("/login");
      throw Object.assign(new Error("NEXT_REDIRECT"), {
        digest: "NEXT_REDIRECT;replace;/login;307;",
      });
    });

    await expect(HomePage()).rejects.toMatchObject({
      message: "NEXT_REDIRECT",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.listAccountingSubmissions).not.toHaveBeenCalled();
  });

  it("renders the page heading, form, and pending-submission details", async () => {
    render(await HomePage());

    expect(
      screen.getByRole("heading", { name: "Accounting workspace" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("form", { name: "Submission form" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bangkok Taxi Cooperative")).toBeInTheDocument();
    expect(screen.getByText("15000 USD")).toBeInTheDocument();
    expect(
      screen.getByText(pendingSubmission.evidenceReference),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).not.toBeInTheDocument();
  });

  it("passes only pending submissions to the client list", async () => {
    mocks.listAccountingSubmissions.mockResolvedValue([
      pendingSubmission,
      {
        ...pendingSubmission,
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        status: "approved",
        payee: "Approved Vendor",
      },
    ]);

    render(await HomePage());

    expect(screen.getByText("Bangkok Taxi Cooperative")).toBeInTheDocument();
    expect(screen.queryByText("Approved Vendor")).not.toBeInTheDocument();
  });
});
