import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateSalesRequest: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/company-oidc", () => ({
  authenticateSalesRequest: mocks.authenticateSalesRequest,
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import AdminLayout from "./layout";

describe("Sales admin route boundary", () => {
  beforeEach(() => {
    mocks.authenticateSalesRequest.mockReset();
    mocks.headers.mockReset();
    mocks.redirect.mockReset();
    mocks.headers.mockResolvedValue(
      new Headers({ cookie: "__Host-ra_sales_session=session-token" }),
    );
    mocks.redirect.mockImplementation((destination: string) => {
      throw new Error(`redirect:${destination}`);
    });
  });

  it("renders all nested admin routes for an active Sales administrator", async () => {
    const children = <div>Admin content</div>;
    mocks.authenticateSalesRequest.mockResolvedValue({
      user: { id: "admin", role: "SALES_ADMIN" },
      scope: { applicationKey: "sales", organizationId: "org-1" },
    });

    await expect(
      AdminLayout({ children, params: Promise.resolve({ locale: "th" }) }),
    ).resolves.toBe(children);

    const request = mocks.authenticateSalesRequest.mock
      .calls[0]?.[0] as Request;
    expect(request.headers.get("cookie")).toBe(
      "__Host-ra_sales_session=session-token",
    );
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it.each([
    ["Sales representative", { user: { id: "rep", role: "SALES_REP" } }],
    ["inactive session", null],
  ])(
    "redirects a %s away from every admin route",
    async (_label, principal) => {
      mocks.authenticateSalesRequest.mockResolvedValue(principal);

      await expect(
        AdminLayout({
          children: <div>Admin content</div>,
          params: Promise.resolve({ locale: "en" }),
        }),
      ).rejects.toThrow("redirect:/en");

      expect(mocks.redirect).toHaveBeenCalledWith("/en");
    },
  );
});
