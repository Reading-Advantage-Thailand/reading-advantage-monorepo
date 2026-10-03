import * as React from "react";
import { cn } from "@/lib/utils";

export interface Step {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export interface StepFlowProps
  extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[];
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
}

const variantStyles: Record<string, { dot: string; line: string; text: string }> = {
  sky: { dot: "bg-sky-400", line: "bg-sky-300", text: "text-sky-800" },
  cyan: { dot: "bg-cyan-400", line: "bg-cyan-300", text: "text-cyan-800" },
  orange: { dot: "bg-orange-400", line: "bg-orange-300", text: "text-orange-800" },
  rose: { dot: "bg-rose-400", line: "bg-rose-300", text: "text-rose-800" },
  indigo: { dot: "bg-indigo-400", line: "bg-indigo-300", text: "text-indigo-800" },
  amber: { dot: "bg-amber-400", line: "bg-amber-300", text: "text-amber-800" },
  fuchsia: { dot: "bg-fuchsia-400", line: "bg-fuchsia-300", text: "text-fuchsia-800" },
  emerald: { dot: "bg-emerald-400", line: "bg-emerald-300", text: "text-emerald-800" },
  slate: { dot: "bg-slate-500", line: "bg-slate-300", text: "text-slate-700" },
};

const StepFlow = React.forwardRef<HTMLDivElement, StepFlowProps>(
  ({ className, steps, variant = "sky", ...props }, ref) => {
    const v = variantStyles[variant];
    return (
      <div
        ref={ref}
        className={cn("w-full", className)}
        {...props}
      >
        {/* Desktop: horizontal */}
        <div className="hidden md:flex items-start justify-between gap-4 relative">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div className="flex-1 flex flex-col items-center text-center relative">
                <div
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg z-10",
                    v.dot,
                  )}
                >
                  {step.icon ?? index + 1}
                </div>
                <h4 className={cn("mt-4 font-bold text-lg", v.text)}>
                  {step.title}
                </h4>
                <p className="mt-2 text-sm text-site-body max-w-xs">
                  {step.description}
                </p>
              </div>
              {index < steps.length - 1 && (
                <div className={cn("flex-1 h-0.5 mt-8", v.line)} />
              )}
            </React.Fragment>
          ))}
        </div>
        {/* Mobile: vertical */}
        <div className="flex md:hidden flex-col gap-8 relative">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg z-10",
                    v.dot,
                  )}
                >
                  {step.icon ?? index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={cn("w-0.5 h-full mt-2", v.line)} />
                )}
              </div>
              <div className="flex-1 pb-6">
                <h4 className={cn("font-bold text-lg", v.text)}>
                  {step.title}
                </h4>
                <p className="mt-1 text-sm text-site-body">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
);
StepFlow.displayName = "StepFlow";

export { StepFlow };
