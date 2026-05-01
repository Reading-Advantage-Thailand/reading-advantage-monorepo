import * as React from "react";
import { cn } from "@/lib/utils";

export interface HorizontalStripProps
  extends React.HTMLAttributes<HTMLDivElement> {
  background?: string;
  padding?: string;
}

const HorizontalStrip = React.forwardRef<
  HTMLDivElement,
  HorizontalStripProps
>(
  (
    {
      className,
      background = "bg-sky-50",
      padding = "py-12",
      children,
      ...props
    },
    ref,
  ) => (
    <section
      ref={ref}
      className={cn(
        "relative w-full overflow-hidden",
        background,
        padding,
        className,
      )}
      {...props}
    >
      <div className="w-full overflow-x-auto scrollbar-hide snap-x snap-mandatory">
        <div className="flex gap-6 px-4 md:px-8 min-w-max">
          {children}
        </div>
      </div>
    </section>
  ),
);
HorizontalStrip.displayName = "HorizontalStrip";

export { HorizontalStrip };
