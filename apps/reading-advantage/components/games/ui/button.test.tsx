import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { Button } from "./button";

describe("Button", () => {
  it("renders a button with default attributes", () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole("button", { name: "Click me" });
    expect(button).toHaveAttribute("data-slot", "button");
    expect(button).toHaveAttribute("data-variant", "default");
    expect(button).toHaveAttribute("data-size", "default");
  });

  it("supports rendering as a child component", () => {
    render(
      <Button asChild>
        <Link href="/play">Play</Link>
      </Button>
    );

    const link = screen.getByRole("link", { name: "Play" });
    expect(link).toHaveAttribute("href", "/play");
    expect(link).toHaveAttribute("data-slot", "button");
  });
});
