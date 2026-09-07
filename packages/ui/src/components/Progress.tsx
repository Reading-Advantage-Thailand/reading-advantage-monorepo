"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@reading-advantage/utils"

/** Displays a determinate or indeterminate progress value. */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, max = 100, ...props }, ref) => {
  const effectiveMax = Number.isNaN(max) || max <= 0 ? 100 : max
  const effectiveValue = value !== null && value !== undefined && !Number.isNaN(value) && value >= 0 && value <= effectiveMax ? value : 0
  const percentage = (effectiveValue / effectiveMax) * 100
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800",
        className
      )}
      value={value}
      max={max}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-neutral-900 transition-all dark:bg-neutral-50"
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </ProgressPrimitive.Root>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
