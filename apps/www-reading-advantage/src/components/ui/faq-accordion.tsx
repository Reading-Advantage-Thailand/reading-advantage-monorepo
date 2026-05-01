"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQAccordionProps
  extends React.HTMLAttributes<HTMLDivElement> {
  items: FAQItem[];
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

const variantStyles: Record<string, { border: string; accent: string; icon: string }> = {
  sky: { border: "border-sky-200", accent: "bg-sky-50", icon: "text-sky-600" },
  cyan: { border: "border-cyan-200", accent: "bg-cyan-50", icon: "text-cyan-600" },
  orange: { border: "border-orange-200", accent: "bg-orange-50", icon: "text-orange-600" },
  rose: { border: "border-rose-200", accent: "bg-rose-50", icon: "text-rose-600" },
  indigo: { border: "border-indigo-200", accent: "bg-indigo-50", icon: "text-indigo-600" },
  amber: { border: "border-amber-200", accent: "bg-amber-50", icon: "text-amber-600" },
  fuchsia: { border: "border-fuchsia-200", accent: "bg-fuchsia-50", icon: "text-fuchsia-600" },
  emerald: { border: "border-emerald-200", accent: "bg-emerald-50", icon: "text-emerald-600" },
  slate: { border: "border-slate-200", accent: "bg-slate-50", icon: "text-slate-600" },
};

const FAQAccordion = React.forwardRef<HTMLDivElement, FAQAccordionProps>(
  ({ className, items, variant = "sky", ...props }, ref) => {
    const v = variantStyles[variant];
    const [openIndex, setOpenIndex] = React.useState<number | null>(null);

    const toggle = (index: number) => {
      setOpenIndex((prev) => (prev === index ? null : index));
    };

    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className={cn(
                "rounded-3xl border transition-all duration-300 overflow-hidden",
                v.border,
                isOpen ? v.accent : "bg-white",
              )}
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                className="w-full flex items-center justify-between p-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
                aria-expanded={isOpen}
              >
                <span className="font-semibold text-slate-900 text-lg pr-4">
                  {item.question}
                </span>
                <ChevronDown
                  className={cn(
                    "w-5 h-5 flex-shrink-0 transition-transform duration-300",
                    v.icon,
                    isOpen && "rotate-180",
                  )}
                />
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300",
                  isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
                )}
              >
                <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                  {item.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  },
);
FAQAccordion.displayName = "FAQAccordion";

export { FAQAccordion };
