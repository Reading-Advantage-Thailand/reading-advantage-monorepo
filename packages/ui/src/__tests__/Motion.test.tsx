import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AnimatedCounter,
  Button,
  PageTransition,
  ShimmerSkeleton,
  StatusChip,
  cardHoverClassName,
} from "../index";

/** Class tokens that move or animate an element (color transitions are not motion). */
const MOTION = /(^|:)(animate-|slide-in|-?translate-|scale-)/;

/**
 * Lists the class tokens that animate but are not behind motion-safe.
 * @param className The class string to check.
 * @returns The unguarded motion tokens.
 */
function unguardedMotion(className: string): string[] {
  return className
    .split(/\s+/)
    .filter((token) => MOTION.test(token) && !token.startsWith("motion-safe:") && !token.startsWith("motion-reduce:"));
}

/**
 * Makes matchMedia report the reduced-motion preference.
 * @param reduce Whether the user asks for reduced motion.
 */
function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Button glow variant", () => {
  it("adds the brand glow and keeps the lift behind motion-safe", () => {
    render(<Button variant="glow">Start</Button>);
    const button = screen.getByRole("button", { name: "Start" });
    expect(button.className).toContain("bg-primary");
    expect(button.className).toMatch(/shadow-\[/);
    expect(unguardedMotion(button.className)).toEqual([]);
  });
});

describe("StatusChip", () => {
  it("renders the label with a decorative dot and the tone colors", () => {
    render(<StatusChip tone="success">Done</StatusChip>);
    const chip = screen.getByText("Done");
    expect(chip).toHaveClass("bg-green-100", "text-green-800");
    expect(chip.querySelector("[aria-hidden='true']")).not.toBeNull();
  });

  it("uses the neutral tone by default", () => {
    render(<StatusChip>Closed</StatusChip>);
    expect(screen.getByText("Closed")).toHaveClass("bg-slate-100");
  });
});

describe("ShimmerSkeleton", () => {
  it("is hidden from assistive technology and shimmers only with motion allowed", () => {
    render(<ShimmerSkeleton data-testid="sk" className="h-4 w-20" />);
    const skeleton = screen.getByTestId("sk");
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).toHaveClass("h-4", "w-20");
    expect(skeleton.className).toContain("motion-safe:animate-[shimmer");
    expect(unguardedMotion(skeleton.className)).toEqual([]);
  });
});

describe("cardHoverClassName", () => {
  it("lifts the card on hover only when motion is allowed", () => {
    expect(cardHoverClassName).toContain("hover:shadow-md");
    expect(cardHoverClassName).toContain("motion-safe:hover:-translate-y-0.5");
    expect(unguardedMotion(cardHoverClassName)).toEqual([]);
  });
});

describe("PageTransition", () => {
  it("renders the page and animates it only when motion is allowed", () => {
    render(
      <PageTransition data-testid="page" className="p-4">
        <p>Page body</p>
      </PageTransition>,
    );
    const page = screen.getByTestId("page");
    expect(screen.getByText("Page body")).toBeInTheDocument();
    expect(page).toHaveClass("p-4", "motion-safe:animate-in");
    expect(unguardedMotion(page.className)).toEqual([]);
  });
});

describe("AnimatedCounter", () => {
  it("shows the final value at once when the user asks for reduced motion", () => {
    stubReducedMotion(true);
    const raf = vi.fn();
    vi.stubGlobal("requestAnimationFrame", raf);
    render(<AnimatedCounter value={1250} data-testid="xp" />);
    expect(screen.getByTestId("xp")).toHaveTextContent("1,250");
    expect(raf).not.toHaveBeenCalled();
  });

  it("counts up frame by frame when motion is allowed", () => {
    stubReducedMotion(false);
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    render(<AnimatedCounter value={100} duration={1000} />);
    const visible = () => Number(document.querySelector("[aria-hidden='true']")?.textContent);

    expect(visible()).toBe(0);
    act(() => frames.shift()?.(1000));
    act(() => frames.shift()?.(1500));
    expect(visible()).toBeGreaterThan(0);
    expect(visible()).toBeLessThan(100);
    act(() => frames.shift()?.(2000));
    expect(visible()).toBe(100);
    expect(frames).toHaveLength(0);
  });

  it("gives screen readers the final value, not the moving digits", () => {
    stubReducedMotion(false);
    vi.stubGlobal("requestAnimationFrame", vi.fn());
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    render(<AnimatedCounter value={42} format={(n) => `${Math.round(n)} XP`} />);
    expect(screen.getByText("42 XP")).toHaveClass("sr-only");
    expect(document.querySelector("[aria-hidden='true']")).toHaveTextContent("0 XP");
  });
});
