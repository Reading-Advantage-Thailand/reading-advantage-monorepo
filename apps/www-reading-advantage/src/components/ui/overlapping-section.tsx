import * as React from "react";
import { cn } from "@/lib/utils";

export interface OverlappingSectionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  background?: string;
  overlapAmount?: string;
  topRadius?: string;
}

const OverlappingSection = React.forwardRef<
  HTMLDivElement,
  OverlappingSectionProps
>(
  (
    {
      className,
      background = "bg-sky-50",
      overlapAmount = "-mt-20",
      topRadius = "rounded-t-[40px]",
      children,
      ...props
    },
    ref,
  ) => (
    <section
      ref={ref}
      className={cn(overlapAmount, topRadius, background, "relative z-10", className)}
      {...props}
    >
      {children}
    </section>
  ),
);
OverlappingSection.displayName = "OverlappingSection";

export { OverlappingSection };
