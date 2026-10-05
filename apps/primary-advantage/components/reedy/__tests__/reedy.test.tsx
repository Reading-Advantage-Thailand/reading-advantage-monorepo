// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/avatar/portrait-canvas", () => ({
  AvatarPortrait: ({ classId, className }: { classId: string; className?: string }) => <div data-testid="portrait" data-class={classId} className={className} />,
}));

import { REEDY_POSES, REEDY_STATES, Reedy } from "../reedy";

const profile = { classId: "wizard", tints: { skin: "light", hair: "silver", eyes: "violet", cloth: "slate" } } as const;

afterEach(cleanup);

describe("Reedy", () => {
  it("has eight states, each with an English and a Thai bubble", () => {
    expect(REEDY_STATES).toHaveLength(8);
    for (const state of REEDY_STATES) {
      const { unmount } = render(<Reedy profile={profile} state={state} />);
      const figure = screen.getByRole("figure");
      expect(figure).toHaveAttribute("data-state", state);
      expect(screen.getByRole("status")).toHaveTextContent(REEDY_POSES[state].en);
      expect(screen.getByRole("status")).toHaveTextContent(REEDY_POSES[state].th);
      expect(screen.getByTestId("portrait")).toHaveAttribute("data-class", "wizard");
      unmount();
    }
  });

  it("scales the halo with the voice level while listening and hides it when muted", () => {
    const { rerender } = render(<Reedy profile={profile} state="listening" level={1} />);
    expect(screen.getByTestId("reedy-halo")).toHaveStyle({ transform: "scale(1)", opacity: "1" });
    rerender(<Reedy profile={profile} state="listening" level={0} />);
    expect(screen.getByTestId("reedy-halo")).toHaveStyle({ transform: "scale(0.35)" });
    rerender(<Reedy profile={profile} state="muted" />);
    expect(screen.getByTestId("reedy-halo")).toHaveStyle({ opacity: "0" });
    expect(screen.getByTestId("portrait").className).toMatch(/grayscale/);
  });

  it("shows dots while connecting and thinking only", () => {
    for (const state of REEDY_STATES) {
      const { unmount } = render(<Reedy profile={profile} state={state} />);
      expect(screen.queryByTestId("reedy-dots") !== null).toBe(state === "connecting" || state === "thinking");
      unmount();
    }
  });

  it("keeps every movement behind motion-safe", () => {
    for (const pose of Object.values(REEDY_POSES)) {
      for (const token of pose.portrait.split(" ")) expect(token).not.toMatch(/^(-?rotate|scale|animate)/);
    }
  });
});
