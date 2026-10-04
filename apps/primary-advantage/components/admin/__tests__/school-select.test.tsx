// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ user: { role: "SYSTEM" } as { role: string } | null }));
vi.mock("@reading-advantage/auth-client", () => ({
  useSession: () => session,
}));

import { SchoolSelect } from "../school-select";

const messages = {
  Admin: { SchoolSelect: { label: "School", placeholder: "Select a school" } },
};

/** Renders the select inside the intl provider. */
function renderSelect() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SchoolSelect value="" onChange={() => {}} />
    </NextIntlClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("SchoolSelect", () => {
  it("shows the school select and loads schools for a SYSTEM user", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "s1", name: "QA School C" }],
    });
    vi.stubGlobal("fetch", fetchMock);
    session.user = { role: "SYSTEM" };
    renderSelect();
    expect(screen.getByLabelText("School")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/schools"));
  });

  it("renders nothing and does not fetch for an ADMIN user", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    session.user = { role: "ADMIN" };
    const { container } = renderSelect();
    expect(container).toBeEmptyDOMElement();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
