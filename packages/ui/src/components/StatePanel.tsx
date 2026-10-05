import * as React from "react";
import { cn } from "@reading-advantage/utils";

/** Props for EmptyState and ErrorState. */
export interface StatePanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** A decorative icon (hidden from assistive technology). */
  icon?: React.ReactNode;
  /** The short message. */
  title: React.ReactNode;
  /** A hint that tells the user what to do next. */
  description?: React.ReactNode;
  /** The next action, for example a link or a retry button. */
  action?: React.ReactNode;
  /** The element for the title. Use a heading when the panel is the main content of a page. */
  titleAs?: "p" | "h1" | "h2" | "h3";
}

/**
 * Lays out an icon, a message, a hint, and an action in a centered block.
 * @param props The panel parts, extra classes for the icon circle, and div attributes.
 * @returns The panel element.
 */
function StatePanel({
  icon,
  title,
  description,
  action,
  titleAs: Title = "p",
  className,
  iconClassName,
  ...props
}: StatePanelProps & { iconClassName?: string }) {
  return (
    <div
      className={cn("flex flex-col items-center gap-3 rounded-xl px-4 py-8 text-center", className)}
      {...props}
    >
      {icon ? (
        <div aria-hidden="true" className={cn("flex size-14 items-center justify-center rounded-full [&>svg]:size-7", iconClassName)}>
          {icon}
        </div>
      ) : null}
      <Title className="text-lg font-semibold text-balance">{title}</Title>
      {description ? <p className="text-muted-foreground max-w-prose text-sm text-balance">{description}</p> : null}
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * Shows that a list or a section has no content yet, and what to do next.
 * @param props The icon, the message, the hint, the action, and div attributes.
 * @returns The empty state.
 */
export function EmptyState(props: StatePanelProps) {
  return <StatePanel data-slot="empty-state" iconClassName="bg-muted text-muted-foreground" {...props} />;
}

/**
 * Shows that loading failed, as an alert, with a retry action.
 * @param props The icon, the message, the hint, the retry action, and div attributes.
 * @returns The error state.
 */
export function ErrorState(props: StatePanelProps) {
  return <StatePanel data-slot="error-state" role="alert" iconClassName="bg-destructive/10 text-destructive" {...props} />;
}
