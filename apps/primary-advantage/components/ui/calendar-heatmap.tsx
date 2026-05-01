"use client";

import * as React from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";

// type utilities
type UnionKeys<T> = T extends T ? keyof T : never;
type Expand<T> = T extends T ? { [K in keyof T]: T[K] } : never;
type OneOf<T extends {}[]> = {
  [K in keyof T]: Expand<
    T[K] & Partial<Record<Exclude<UnionKeys<T[number]>, keyof T[K]>, never>>
  >;
}[number];

// types
export type Classname = string;
export type WeightedDateEntry = {
  date: Date;
  weight: number;
};

interface IDatesPerVariant {
  datesPerVariant: Date[][];
}
interface IWeightedDatesEntry {
  weightedDates: WeightedDateEntry[];
}

type VariantDatesInput = OneOf<[IDatesPerVariant, IWeightedDatesEntry]>;

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  variantClassnames: Classname[];
} & VariantDatesInput;

/// utlity functions
function useModifers(
  variantClassnames: Classname[],
  datesPerVariant: Date[][],
): [Record<string, Date[]>, Record<string, string>] {
  const noOfVariants = variantClassnames.length;

  const variantLabels = [...Array(noOfVariants)].map(
    (_, idx) => `__variant${idx}`,
  );

  const modifiers = variantLabels.reduce(
    (acc, key, index) => {
      acc[key] = datesPerVariant[index];
      return acc;
    },
    {} as Record<string, Date[]>,
  );

  const modifiersClassNames = variantLabels.reduce(
    (acc, key, index) => {
      acc[key] = variantClassnames[index];
      return acc;
    },
    {} as Record<string, string>,
  );

  return [modifiers, modifiersClassNames];
}

function categorizeDatesPerVariant(
  weightedDates: WeightedDateEntry[],
  noOfVariants: number,
) {
  const sortedEntries = weightedDates.sort((a, b) => a.weight - b.weight);

  const categorizedRecord = [...Array(noOfVariants)].map(() => [] as Date[]);

  const minNumber = sortedEntries[0].weight;
  const maxNumber = sortedEntries[sortedEntries.length - 1].weight;
  const range =
    minNumber == maxNumber ? 1 : (maxNumber - minNumber) / noOfVariants;

  sortedEntries.forEach((entry) => {
    const category = Math.min(
      Math.floor((entry.weight - minNumber) / range),
      noOfVariants - 1,
    );
    categorizedRecord[category].push(entry.date);
  });

  return categorizedRecord;
}

function CalendarHeatmap({
  variantClassnames,
  datesPerVariant,
  weightedDates,
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  ...props
}: CalendarProps & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
}) {
  const noOfVariants = variantClassnames.length;

  weightedDates = weightedDates ?? [];
  datesPerVariant =
    datesPerVariant ?? categorizeDatesPerVariant(weightedDates, noOfVariants);

  const [modifiers, modifiersClassNames] = useModifers(
    variantClassnames,
    datesPerVariant,
  );

  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      modifiers={modifiers}
      modifiersClassNames={modifiersClassNames}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months,
        ),
        month: cn(
          "flex flex-col w-full gap-4 items-center",
          defaultClassNames.month,
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5",
          defaultClassNames.caption_label,
        ),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
          defaultClassNames.button_next,
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          defaultClassNames.weekday,
        ),
        week: cn("flex w-full mt-2", defaultClassNames.week),
        day: cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
          defaultClassNames.day,
        ),
        today: cn("bg-accent text-accent-foreground", defaultClassNames.today),
        outside: cn(
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            );
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          );
        },
      }}
      {...props}
    />
  );
}
CalendarHeatmap.displayName = "CalendarHeatmap";

export { CalendarHeatmap };
