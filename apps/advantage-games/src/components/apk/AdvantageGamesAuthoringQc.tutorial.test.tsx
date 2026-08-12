import { fireEvent, render, screen, within } from "@testing-library/react";

import preview from "@/lib/apk/standard-pack-qc-preview.json";
import { AdvantageGamesAuthoringQc } from "./AdvantageGamesAuthoringQc";
import type { StandardPackQcPreview } from "./StandardPackQc";

describe("AdvantageGamesAuthoringQc guided tutorial preview", () => {
  it("provides an independent tutorial preview state with explicit QC fixtures", () => {
    render(<AdvantageGamesAuthoringQc preview={preview as StandardPackQcPreview} />);

    const qc = screen.getByRole("region", { name: "Guided tutorial QC preview" });
    expect(qc).toBeInTheDocument();
    expect(within(qc).getByRole("heading", { name: /guided tutorial qc preview/i })).toBeInTheDocument();
    expect(within(qc).getByLabelText(/tutorial fixture/i)).toBeInTheDocument();
    expect(within(qc).getByRole("button", { name: /compact/i })).toBeInTheDocument();
    expect(within(qc).getByRole("button", { name: /wide/i })).toBeInTheDocument();
    expect(within(qc).getByRole("button", { name: /reduced motion/i })).toBeInTheDocument();
    expect(within(qc).getByRole("status")).toHaveTextContent(/tutorial.*ready/i);
    expect(within(qc).queryByRole("region", { name: "Game result" })).not.toBeInTheDocument();
  });

  it("switches worst-case Thai and English tutorial content without changing the normal briefing state", () => {
    render(<AdvantageGamesAuthoringQc preview={preview as StandardPackQcPreview} />);

    const qc = screen.getByRole("region", { name: "Guided tutorial QC preview" });
    const briefing = screen.getByRole("region", { name: "Standard game briefing preview" });
    const fixture = within(qc).getByLabelText(/tutorial fixture/i);
    fireEvent.change(fixture, { target: { value: "thai-long" } });
    expect(within(qc).getByText(/ความรับผิดชอบต่อสิ่งแวดล้อม/)).toBeInTheDocument();
    expect(within(qc).getByText(/environmental responsibility/)).toBeInTheDocument();

    fireEvent.change(fixture, { target: { value: "english-long" } });
    expect(within(qc).getByText(/environmental responsibility/)).toBeInTheDocument();
    expect(within(qc).getByText(/ความรับผิดชอบต่อสิ่งแวดล้อม/)).toBeInTheDocument();
    expect(within(briefing).getByRole("dialog")).toBeInTheDocument();
  });

  it("inspects compact and wide layouts, keyboard/pointer/touch controls, reduced motion, and one-canvas status", () => {
    render(<AdvantageGamesAuthoringQc preview={preview as StandardPackQcPreview} />);

    const qc = screen.getByRole("region", { name: "Guided tutorial QC preview" });
    fireEvent.click(within(qc).getByRole("button", { name: /wide/i }));
    fireEvent.change(within(qc).getByLabelText(/tutorial input mode/i), { target: { value: "touch" } });
    fireEvent.click(within(qc).getByRole("button", { name: /reduced motion/i }));

    expect(qc).toHaveAttribute("data-apk-layout-profile", "wide");
    expect(qc).toHaveAttribute("data-apk-input-mode", "touch");
    expect(qc).toHaveAttribute("data-apk-reduced-motion", "true");
    expect(within(qc).getByText(/one canvas/i)).toBeInTheDocument();
    expect(within(qc).getByText(/zero production completions/i)).toBeInTheDocument();
    expect(within(qc).getAllByRole("img", { name: /guided tutorial phaser canvas/i })).toHaveLength(1);
  });

  it("keeps preview actions in tutorial mode and reports replay/interruption cleanup without a result", () => {
    render(<AdvantageGamesAuthoringQc preview={preview as StandardPackQcPreview} />);

    const qc = screen.getByRole("region", { name: "Guided tutorial QC preview" });
    fireEvent.click(within(qc).getByRole("button", { name: /start tutorial/i }));
    fireEvent.click(within(qc).getByRole("button", { name: /replay tutorial/i }));
    fireEvent.click(within(qc).getByRole("button", { name: /interrupt tutorial/i }));

    expect(within(qc).getByRole("status")).toHaveTextContent(/interrupted|clean/i);
    expect(within(qc).getByText(/timers: 0/i)).toBeInTheDocument();
    expect(within(qc).getByText(/listeners: 0/i)).toBeInTheDocument();
    expect(within(qc).getByText(/phaser objects: 0/i)).toBeInTheDocument();
    expect(within(qc).queryByRole("region", { name: "Game result" })).not.toBeInTheDocument();
    expect(within(qc).getAllByRole("img", { name: /guided tutorial phaser canvas/i })).toHaveLength(1);
  });
});
