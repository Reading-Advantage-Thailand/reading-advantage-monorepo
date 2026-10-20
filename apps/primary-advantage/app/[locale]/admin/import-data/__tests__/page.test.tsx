// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import enMessages from "../../../../../messages/en.json";

vi.mock("@/components/header", () => ({ Header: () => null }));

const session = vi.hoisted(() => ({ user: { role: "ADMIN" } as { role: string } | null }));
vi.mock("@reading-advantage/auth-client", () => ({ useSession: () => session }));
// A plain select stands in for the Radix select; it shows for SYSTEM only, like the real one.
vi.mock("@/components/admin/school-select", () => ({
  SchoolSelect: ({ value, onChange }: { value: string; onChange: (id: string) => void }) =>
    session.user?.role === "SYSTEM" ? (
      <select aria-label="School" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">-</option>
        <option value="school-x">School X</option>
      </select>
    ) : null,
}));

import ImportDataPage from "../page";

const fetchMock = vi.fn();

/**
 * Renders the page, selects a CSV on the given tab, and clicks import.
 * @param tab Tab trigger label to activate, or null to keep the default tab.
 * @param fileName Name of the CSV file to select.
 */
async function importFile(tab: string | null, fileName: string) {
  render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <ImportDataPage />
    </NextIntlClientProvider>,
  );
  if (tab) fireEvent.mouseDown(screen.getByRole("tab", { name: new RegExp(tab, "i") }));
  const file = new File(["name,email,role,classroom_name\n"], fileName, { type: "text/csv" });
  fireEvent.change(document.getElementById("file-upload") as HTMLInputElement, {
    target: { files: [file] },
  });
  await screen.findByText(enMessages.ImportData.upload.fileSelected.title);
  fireEvent.click(screen.getByRole("button", { name: enMessages.ImportData.upload.importButton }));
}

describe("ImportDataPage upload routing", () => {
  beforeEach(() => {
    session.user = { role: "ADMIN" };
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        originalName: "students.csv",
        size: 100,
        fileName: "u_students.csv",
        inserted: 3,
        skippedDuplicate: 1,
        skippedExisting: 2,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("posts the students tab to /api/upload/csv with no trailing space and shows the summary counts", async () => {
    await importFile(null, "students.csv");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/upload/csv");
    expect((await screen.findByText(/Inserted/)).parentElement).toHaveTextContent("3");
    expect(screen.getByText(/Skipped \(duplicate in file\)/).parentElement).toHaveTextContent("1");
    expect(screen.getByText(/Skipped \(already exist\)/).parentElement).toHaveTextContent("2");
  });

  it("posts the classes tab to /api/upload/classes with no trailing space", async () => {
    await importFile("classes", "classes.csv");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe("/api/upload/classes");
  });

  it("shows no school selector to an ADMIN and sends no schoolId", async () => {
    await importFile(null, "students.csv");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByLabelText("School")).toBeNull();
    expect((fetchMock.mock.calls[0][1].body as FormData).has("schoolId")).toBe(false);
  });

  it("disables the upload for SYSTEM until a school is chosen, then sends schoolId", async () => {
    session.user = { role: "SYSTEM" };
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ImportDataPage />
      </NextIntlClientProvider>,
    );
    const file = new File(["name,email,role,classroom_name\n"], "students.csv", { type: "text/csv" });
    fireEvent.change(document.getElementById("file-upload") as HTMLInputElement, {
      target: { files: [file] },
    });
    await screen.findByText(enMessages.ImportData.upload.fileSelected.title);
    const button = screen.getByRole("button", { name: enMessages.ImportData.upload.importButton });
    expect(screen.getByText(enMessages.ImportData.upload.chooseSchool)).toBeInTheDocument();
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText("School"), { target: { value: "school-x" } });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect((fetchMock.mock.calls[0][1].body as FormData).get("schoolId")).toBe("school-x");
  });
});
