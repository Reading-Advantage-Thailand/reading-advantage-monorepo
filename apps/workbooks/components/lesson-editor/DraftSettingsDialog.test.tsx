// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DraftSettingsDialog } from "./DraftSettingsDialog";

const baseSettings = {
  seriesName: "Quest",
  levelNumber: "5",
  cefrLevel: "A1",
  type: "secondary" as const,
};

describe("DraftSettingsDialog", () => {
  it("renders the current settings values", () => {
    render(
      <DraftSettingsDialog
        settings={baseSettings}
        saving={false}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(
      screen.getByRole("dialog", { name: "Project Settings" }),
    ).toBeTruthy();
    expect((screen.getByLabelText("Type") as HTMLSelectElement).value).toBe(
      "secondary",
    );
    expect(
      (screen.getByLabelText("Workbook Level") as HTMLSelectElement).value,
    ).toBe("5");
    expect(
      (screen.getByLabelText("Series Name") as HTMLInputElement).value,
    ).toBe("Quest");
    expect(
      (screen.getByLabelText("CEFR Level") as HTMLInputElement).value,
    ).toBe("A1");
  });

  it("swaps the workbook level options when the type changes", () => {
    render(
      <DraftSettingsDialog
        settings={{ ...baseSettings, levelNumber: "1" }}
        saving={false}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    const levelSelect = screen.getByLabelText(
      "Workbook Level",
    ) as HTMLSelectElement;
    const optionTexts = () =>
      Array.from(levelSelect.options).map((option) => option.textContent);
    expect(optionTexts()).toContain("1 - Origins — A1");
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "primary" },
    });
    expect(optionTexts()).toContain("1 - Origins — A0");
    expect(optionTexts()).not.toContain("1 - Origins — A1");
  });

  it("preserves an unknown existing levelNumber as an extra option", () => {
    render(
      <DraftSettingsDialog
        settings={{
          seriesName: "Custom",
          levelNumber: "16",
          cefrLevel: "C1",
          type: "secondary",
        }}
        saving={false}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    const levelSelect = screen.getByLabelText(
      "Workbook Level",
    ) as HTMLSelectElement;
    expect(levelSelect.value).toBe("16");
    expect(
      Array.from(levelSelect.options).map((option) => option.textContent),
    ).toContain("16 - Custom — C1");
  });

  it("calls onSave with the edited settings object", () => {
    const onSave = vi.fn();
    render(
      <DraftSettingsDialog
        settings={baseSettings}
        saving={false}
        onSave={onSave}
        onClose={() => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText("Workbook Level"), {
      target: { value: "6.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "secondary",
        levelNumber: "6.1",
        seriesName: "Quest",
        cefrLevel: "A1",
      }),
    );
  });

  it("calls onClose from the Cancel button", () => {
    const onClose = vi.fn();
    render(
      <DraftSettingsDialog
        settings={baseSettings}
        saving={false}
        onSave={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose from the close button", () => {
    const onClose = vi.fn();
    render(
      <DraftSettingsDialog
        settings={baseSettings}
        saving={false}
        onSave={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Close settings" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("disables Save while saving", () => {
    render(
      <DraftSettingsDialog
        settings={baseSettings}
        saving={true}
        onSave={() => {}}
        onClose={() => {}}
      />,
    );
    expect(
      (screen.getByRole("button", { name: "Saving..." }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
