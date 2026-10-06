import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@reading-advantage/utils";

/** Tone classes for StatusChip. Every tone keeps text at WCAG AA contrast on its fill. */
const statusChipVariants = cva(
  "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold",
  {
    variants: {
      tone: {
        success: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
        warning: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
        danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
        info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
        neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

/** Props for StatusChip: span attributes plus the tone. */
export interface StatusChipProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusChipVariants> {}

/**
 * Shows a short status label (for example "Done" or "Due soon") with a colored dot.
 * The dot is decorative; the label text carries the meaning.
 * @param props Span attributes, the tone, and the label as children.
 * @returns The status chip element.
 */
function StatusChip({ className, tone, children, ...props }: StatusChipProps) {
  return (
    <span data-slot="status-chip" className={cn(statusChipVariants({ tone }), className)} {...props}>
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}

export { StatusChip, statusChipVariants };
