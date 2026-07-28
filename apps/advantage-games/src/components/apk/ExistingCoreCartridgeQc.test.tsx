import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import preview from "@/lib/apk/standard-pack-qc-preview.json";
import type { StandardPackQcPreview } from "./StandardPackQc";
import { ExistingCoreCartridgeQc } from "./ExistingCoreCartridgeQc";

const context = {
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  drawImage: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  set fillStyle(_value: string) {},
  set strokeStyle(_value: string) {},
  set font(_value: string) {},
  textAlign: "start",
};

describe("ExistingCoreCartridgeQc", () => {
  beforeEach(() => {
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads all five titles only inside the explicit QC surface", async () => {
    render(<ExistingCoreCartridgeQc preview={preview as StandardPackQcPreview} />);

    const surface = screen.getByRole("region", { name: "Existing-core cartridge QC" });
    expect(within(surface).getByRole("heading", { name: "Existing-core cartridge QC" })).toBeInTheDocument();
    const selector = within(surface).getByLabelText("QC cartridge");
    expect(within(selector).getAllByRole("option")).toHaveLength(5);
    expect(await within(surface).findByRole("img", { name: "Dragon Flight QC canvas" })).toBeInTheDocument();
    expect(within(surface).getAllByTestId("existing-core-qc-canvas")).toHaveLength(1);
  });

  it("preserves one canvas while keyboard input, fixture, and completion state update", async () => {
    render(<ExistingCoreCartridgeQc preview={preview as StandardPackQcPreview} />);

    const canvas = await screen.findByRole("img", { name: "Dragon Flight QC canvas" });
    fireEvent.keyDown(canvas, { code: "Enter", key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("existing-core-input-counts")).toHaveTextContent("keyboard 1"));

    fireEvent.change(screen.getByLabelText("Cartridge proof fixture"), { target: { value: "thai-long" } });
    expect(screen.getByTestId("existing-core-fixture-text")).toHaveTextContent("ความรับผิดชอบต่อสิ่งแวดล้อมผ่านการเรียนรู้ร่วมกัน");

    const originalCanvas = screen.getByTestId("existing-core-qc-canvas");
    fireEvent.click(screen.getByRole("button", { name: "Complete QC proof" }));
    fireEvent.click(screen.getByRole("button", { name: "Complete QC proof" }));
    expect(screen.getByTestId("existing-core-completion-count")).toHaveTextContent("1");
    expect(screen.getByTestId("existing-core-qc-canvas")).toBe(originalCanvas);
  });

  it("renders only the loaded title selected union from the pinned preview", async () => {
    render(<ExistingCoreCartridgeQc preview={preview as StandardPackQcPreview} />);

    const surface = screen.getByRole("region", { name: "Existing-core cartridge QC" });
    await within(surface).findByRole("img", { name: "Dragon Flight QC canvas" });
    const keys = within(surface).getAllByTestId("existing-core-selected-asset").map((node) => node.getAttribute("data-selected-asset-key"));
    expect(keys).toEqual([
      "audio/native/combat/hit-01",
      "effects/32x32/combat/hit-01",
      "top-down/32x32/characters/hero-01",
    ]);
    expect(within(surface).getByTestId("existing-core-delivery-count")).toHaveTextContent("3 of 43075");
  });
});
