import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Card frame of the teacher screens (same look as the student home cards). */
export const TEACHER_CARD = "bg-card text-card-foreground flex min-w-0 flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:p-5";
/** Tap target for teacher actions: 44 px or more. */
export const TEACHER_ACTION = "min-h-11";

/** Props of {@link TeacherPageHeader}. */
export interface TeacherPageHeaderProps {
  /** The page heading (the only h1 of the page). */
  title: ReactNode;
  /** A short line under the heading. */
  description?: ReactNode;
  /** Page actions; they wrap below the heading on a phone. */
  actions?: ReactNode;
  /** A link back to the parent page, shown above the heading. */
  back?: ReactNode;
  /** Extra classes. */
  className?: string;
}

/**
 * Heading block of a teacher screen: an optional back link, the h1, a description, and actions
 * that wrap on narrow screens (375 px) instead of being cut.
 * @param props The heading, the description, the actions, the back link, and extra classes.
 * @returns The header element.
 */
export function TeacherPageHeader({ title, description, actions, back, className }: TeacherPageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-3", className)}>
      {back}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold break-words md:text-3xl">{title}</h1>
          {description ? <p className="text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
