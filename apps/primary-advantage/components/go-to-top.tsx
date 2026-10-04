"use client";

import { ArrowUp } from "lucide-react";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

/**
 * Tells if the user asks for reduced motion.
 * @returns True when the reduced-motion media query matches.
 */
function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Renders the floating "back to top" button. Below 1024 px it sits above the bottom bar;
 * from 1024 px (no bottom bar) it sits at the bottom right. It scrolls without animation
 * when the user asks for reduced motion.
 * @returns The button.
 */
export function GoToTop() {
  const t = useTranslations("Components");
  return (
    <div className="fixed right-4 bottom-[calc(var(--bottom-nav-h)+1rem)] z-30 lg:bottom-4">
      <Link
        href="#"
        aria-label={t("backToTop")}
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
        }}
        className={cn(
          buttonVariants({ variant: "default", size: "icon" }),
          "size-12 rounded-full shadow-lg transition-shadow hover:shadow-xl",
        )}
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
