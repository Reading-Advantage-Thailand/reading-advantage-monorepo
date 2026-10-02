import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ExperienceDemo } from "@/components/marketing/experience-demo";

const text = {
  play: "Play the demo",
  fullscreen: "Open full screen",
  hint: "Works best with sound on.",
  frameTitle: "Primary Advantage game demo",
  posterAlt: "Two children in a story picture",
};

afterEach(() => {
  cleanup();
});

describe("ExperienceDemo", () => {
  it("shows a poster and no frame before the visitor presses play", () => {
    render(<ExperienceDemo text={text} />);
    expect(screen.getByRole("button", { name: text.play })).toBeInTheDocument();
    expect(screen.queryByTitle(text.frameTitle)).not.toBeInTheDocument();
  });

  it("loads the demo frame from the site's own origin after the press", () => {
    render(<ExperienceDemo text={text} />);
    fireEvent.click(screen.getByRole("button", { name: text.play }));
    expect(screen.getByTitle(text.frameTitle)).toHaveAttribute("src", "/experience/index.html");
  });

  it("links to the full screen demo", () => {
    render(<ExperienceDemo text={text} />);
    expect(screen.getByRole("link", { name: text.fullscreen })).toHaveAttribute("href", "/experience/index.html");
  });
});
