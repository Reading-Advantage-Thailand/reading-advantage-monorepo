import { cn } from "@reading-advantage/utils"

/**
 * A loading skeleton component for placeholder content.
 * @param props - HTML div attributes including className for styling
 * @returns A pulsing div element used as a loading placeholder
 */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

export { Skeleton }
