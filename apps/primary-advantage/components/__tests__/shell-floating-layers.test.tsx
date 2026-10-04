// @vitest-environment jsdom
/**
 * Phase 1 review fixes for the floating layers: toasts clear the bottom bar on
 * phones, and the local alert dialog keeps a 1 rem margin and rounded corners at 375 px.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const sonner = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light" }) }));
vi.mock("sonner", () => ({
  Toaster: (props: Record<string, unknown>) => {
    sonner.props = props;
    return null;
  },
}));

import { Toaster } from "../ui/sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../ui/alert-dialog";

afterEach(cleanup);

describe("Toaster", () => {
  it("keeps toasts above the bottom bar on phones", () => {
    render(<Toaster />);
    const mobile = sonner.props?.mobileOffset as { bottom?: string } | undefined;
    expect(mobile?.bottom).toContain("var(--bottom-nav-h)");
  });
});

describe("local AlertDialog", () => {
  it("keeps a margin and rounded corners on phones and a dark overlay", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Remove student?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveClass("max-w-[calc(100%-2rem)]", "rounded-lg");
    expect(document.querySelector('[data-slot="alert-dialog-overlay"]')).toHaveClass("bg-black/50");
  });
});
