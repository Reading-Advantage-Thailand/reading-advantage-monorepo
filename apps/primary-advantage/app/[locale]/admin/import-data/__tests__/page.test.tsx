// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import enMessages from "../../../../../messages/en.json";

vi.mock("@/components/header", () => ({ Header: () => null }));

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
});
