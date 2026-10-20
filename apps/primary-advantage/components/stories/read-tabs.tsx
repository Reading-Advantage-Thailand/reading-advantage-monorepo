import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** The two tabs of Read. */
export type ReadTab = "articles" | "stories";

const TAB_CLASS = "cq-sign cq-sign--small min-h-12 inline-flex items-center no-underline";

/**
 * The sign row "Articles | Stories" above the Read content (STU-04). The toolbar keeps its four tabs.
 * @param props.active The tab that shows now.
 * @returns The tab sign navigation.
 */
export function ReadTabs({ active }: { active: ReadTab }) {
  const t = useTranslations("Stories");
  const tabs: { key: ReadTab; href: string; label: string }[] = [
    { key: "articles", href: "/student/read", label: t("tabArticles") },
    { key: "stories", href: "/student/read/stories", label: t("tabStories") },
  ];
  return (
    <nav aria-label={t("tabsLabel")} className="cq-signs">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? "page" : undefined}
          className={cn(TAB_CLASS, tab.key === active && "cq-sign--active")}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
