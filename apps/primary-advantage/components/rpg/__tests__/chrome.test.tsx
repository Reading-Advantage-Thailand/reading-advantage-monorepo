// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...rest }: { children?: ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/student/read/abc",
}));

import { Coins, Hearts, Meter, RpgLink, rpgButton } from "../chrome";
import { Scene } from "../scene";
import { Sprite } from "../sprite";
import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import { Toolbar } from "../toolbar";

afterEach(cleanup);

describe("the skin chrome", () => {
  it("renders a meter as a progressbar with the committed value and the pending segment", () => {
    render(<Meter value={16} pending={4} max={42} label="Class damage" />);
    const bar = screen.getByRole("progressbar", { name: "Class damage" });
    expect(bar).toHaveAttribute("aria-valuenow", "16");
    expect(bar).toHaveAttribute("aria-valuemax", "42");
    expect(bar.style.getPropertyValue("--value")).toMatch(/^38\.09/);
    expect(bar.style.getPropertyValue("--pending")).toMatch(/^47\.6/);
  });

  it("caps a meter at its target", () => {
    render(<Meter value={60} max={42} label="Class damage" />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "42");
    expect(bar.style.getPropertyValue("--value")).toBe("100%");
  });

  it("shows five hearts and darkens the lost ones", () => {
    const { container } = render(<Hearts hp={3} label="HP 3 of 5" />);
    expect(screen.getByRole("img", { name: "HP 3 of 5" })).toBeInTheDocument();
    expect(container.querySelectorAll(".cq-heart")).toHaveLength(5);
    expect(container.querySelectorAll(".cq-heart--lost")).toHaveLength(2);
  });

  it("formats the coin purse", () => {
    render(<Coins gp={1250} label="1,250 GP" />);
    expect(screen.getByLabelText("1,250 GP")).toHaveTextContent("1,250");
  });

  it("gives a skin link the 48 px class and the tone", () => {
    render(
      <RpgLink tone="gold" href="/student/games">
        Enter the arena
      </RpgLink>,
    );
    const link = screen.getByRole("link", { name: "Enter the arena" });
    expect(link).toHaveClass("min-h-12", "cq-btn", "cq-btn--gold");
    expect(rpgButton("iron", true)).toContain("cq-btn--iron");
  });

  it("paints a place behind the content at both aspects", () => {
    const { container } = render(
      <Scene place="guild-hall">
        <p>Hello</p>
      </Scene>,
    );
    expect(container.querySelector("[data-place='guild-hall']")).toBeInTheDocument();
    expect(container.querySelector("source")).toHaveAttribute("srcset", "/rpg/backdrops/guild-hall-d.webp");
    expect(container.querySelector(".cq-backdrop img")).toHaveAttribute("src", "/rpg/backdrops/guild-hall-p.webp");
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("sizes a sprite strip to its frames", () => {
    const { container } = render(<Sprite src="/rpg/kit/npc/blacksmith-idle-strip.png" size={132} frames={8} label="Bronn" />);
    const box = container.querySelector(".cq-sprite") as HTMLElement;
    expect(box.style.backgroundSize).toBe("1056px 132px");
    expect(screen.getByRole("img", { name: "Bronn" })).toBeInTheDocument();
  });
});

describe("the toolbar", () => {
  it("shows the four student tabs with Forge icons and marks the open one", () => {
    renderWithMessages(<Toolbar user={{ id: "s1", role: "STUDENT" } as never} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    const read = screen.getByRole("link", { name: /Read/ });
    expect(read).toHaveAttribute("aria-current", "page");
    expect(read.querySelector("img")).toHaveAttribute("src", "/rpg/kit/icons/scroll.webp");
    expect(screen.getByRole("link", { name: /Home/ })).not.toHaveAttribute("aria-current");
  });
});
