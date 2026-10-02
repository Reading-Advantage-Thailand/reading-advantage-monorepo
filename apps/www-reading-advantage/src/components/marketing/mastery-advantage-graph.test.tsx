import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MasteryAdvantageGraph, buildSteps, DEFAULT_GRAPH_LABELS } from "./mastery-advantage-graph";
import { DOMAINS, graphData } from "./mastery-advantage-graph-data";

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("buildSteps", () => {
  it.each(DOMAINS)("ends %s with the new skills ready", (domain) => {
    const d = graphData[domain];
    const steps = buildSteps(d, DEFAULT_GRAPH_LABELS);
    const last = steps[steps.length - 1];
    for (const i of d.newReady) expect(last.overrides[i]).toBe("ready");
    expect(last.overrides[d.learnIdx]).toBe("current");
  });
});

describe("interactive MasteryAdvantageGraph", () => {
  it("shows no controls when not interactive", () => {
    render(<MasteryAdvantageGraph />);
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("switches subject with the tabs", async () => {
    const user = userEvent.setup();
    const { container } = render(<MasteryAdvantageGraph interactive />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(DOMAINS.length);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    await user.click(tabs[1]);
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(container.querySelector("svg")).toHaveAttribute("data-domain", DOMAINS[1]);
  });

  it("steps forward and back and updates the live caption", async () => {
    const user = userEvent.setup();
    render(<MasteryAdvantageGraph interactive />);
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect(screen.getByRole("status")).toHaveTextContent(/about to forget/i);
    expect(screen.getByText("Step 2 of 8")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous step" }));
    expect(screen.getByRole("status")).toHaveTextContent(/mastery advantage/i);
  });

  it("lists ready skills in the what-is-next view", async () => {
    const user = userEvent.setup();
    render(<MasteryAdvantageGraph interactive />);
    const toggle = screen.getByRole("button", { name: "What is next" });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: /what is next/i })).toHaveTextContent(/ready/);
  });

  it("labels the example as illustrative", () => {
    render(<MasteryAdvantageGraph interactive />);
    expect(screen.getByText(/illustrative example, not real student data/i)).toBeInTheDocument();
  });
});
