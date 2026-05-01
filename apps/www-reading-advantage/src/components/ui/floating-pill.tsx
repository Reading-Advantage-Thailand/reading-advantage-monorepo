import * as React from "react";
import { cn } from "@/lib/utils";

export interface FloatingPillProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  label: string;
  variant?:
    | "sky"
    | "cyan"
    | "orange"
    | "rose"
    | "indigo"
    | "amber"
    | "fuchsia"
    | "emerald"
    | "slate";
  size?: "lg" | "md" | "sm";
}

const variantStyles: Record<string, { bg: string; text: string; border: string }> = {
  sky: { bg: "bg-sky-50", text: "text-sky-900", border: "border-sky-200" },
  cyan: { bg: "bg-cyan-50", text: "text-cyan-900", border: "border-cyan-200" },
  orange: { bg: "bg-orange-50", text: "text-orange-900", border: "border-orange-200" },
  rose: { bg: "bg-rose-50", text: "text-rose-900", border: "border-rose-200" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-900", border: "border-indigo-200" },
  amber: { bg: "bg-amber-50", text: "text-amber-900", border: "border-amber-200" },
  fuchsia: { bg: "bg-fuchsia-50", text: "text-fuchsia-900", border: "border-fuchsia-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-900", border: "border-emerald-200" },
  slate: { bg: "bg-slate-50", text: "text-slate-900", border: "border-slate-200" },
};

const sizeStyles = {
  lg: { padding: "px-12 py-8", value: "text-5xl md:text-6xl", label: "text-lg" },
  md: { padding: "px-10 py-6", value: "text-4xl md:text-5xl", label: "text-base" },
  sm: { padding: "px-8 py-4", value: "text-3xl md:text-4xl", label: "text-sm" },
};

const FloatingPill = React.forwardRef<HTMLDivElement, FloatingPillProps>(
  (
    {
      className,
      value,
      label,
      variant = "sky",
      size = "md",
      ...props
    },
    ref,
  ) => {
    const v = variantStyles[variant];
    const s = sizeStyles[size];
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex flex-col items-center justify-center rounded-full border shadow-lg",
          v.bg,
          v.text,
          v.border,
          s.padding,
          className,
        )}
        {...props}
      >
        <span className={cn("font-bold leading-none", s.value)}>{value}</span>
        <span className={cn("mt-2 font-medium opacity-80", s.label)}>{label}</span>
      </div>
    );
  },
);
FloatingPill.displayName = "FloatingPill";

export { FloatingPill };
