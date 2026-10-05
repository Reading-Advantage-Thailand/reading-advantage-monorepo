import { SparklesIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The home toast of a student with no avatar (FR-10b): one line and a link to the picker.
 * @param props.t The `Avatar` translator.
 * @returns The callout.
 */
export function AvatarNudge({ t }: { t: (key: "nudgeTitle" | "nudgeBody" | "nudgeLink") => string }) {
  return (
    <aside role="status" className="bg-brand-50 text-brand-900 dark:bg-brand-950 dark:text-brand-100 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-200 p-4 dark:border-brand-800">
      <div className="flex items-start gap-3">
        <SparklesIcon aria-hidden="true" className="mt-1 size-5 shrink-0" />
        <div className="flex flex-col">
          <span className="font-semibold">{t("nudgeTitle")}</span>
          <span className="text-sm">{t("nudgeBody")}</span>
        </div>
      </div>
      <Link href="/student/avatar" className={cn(buttonVariants({ variant: "default" }), "min-h-12 rounded-xl px-5 text-base")}>
        {t("nudgeLink")}
      </Link>
    </aside>
  );
}
