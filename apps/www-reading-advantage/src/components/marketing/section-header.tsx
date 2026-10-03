import type { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  tone?: "light" | "dark";
  accent?: string;
  children?: ReactNode;
  className?: string;
};

/**
 * Shared eyebrow, title, and description block for marketing sections.
 * @param props The text, the tone for the background, and an optional accent class for the eyebrow.
 * @returns The section header.
 */
export function SectionHeader({ eyebrow, title, description, tone = "light", accent, children, className = "" }: SectionHeaderProps) {
  const dark = tone === "dark";
  return (
    <header className={`max-w-2xl ${className}`}>
      <p className={`text-xs font-semibold uppercase tracking-eyebrow mb-5 ${accent ?? (dark ? "text-sky-300" : "text-sky-800")}`}>{eyebrow}</p>
      <h2 className={`text-4xl md:text-5xl font-semibold leading-display tracking-tight mb-6 ${dark ? "text-white" : "text-black"}`}>{title}</h2>
      {description ? <p className={`text-base md:text-lg leading-relaxed ${dark ? "text-sky-100" : "text-site-body"}`}>{description}</p> : null}
      {children}
    </header>
  );
}
