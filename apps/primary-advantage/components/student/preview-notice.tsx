import { useTranslations } from "next-intl";
import { Panel } from "@/components/rpg/chrome";
import { ART } from "@/lib/rpg/places";

type NoticeKey = Parameters<ReturnType<typeof useTranslations<"StudentView">>>[0];

/**
 * The preview state of a page that needs a student record: one parchment notice with a title and
 * one line that says what a student sees there. It never shows sample student data.
 * @param props.titleKey The `StudentView` key of the title.
 * @param props.lineKey The `StudentView` key of the line.
 * @param props.className Extra classes.
 * @returns The notice.
 */
export function PreviewNotice({ titleKey, lineKey, className }: { titleKey: NoticeKey; lineKey: NoticeKey; className?: string }) {
  const t = useTranslations("StudentView");
  return (
    <Panel pinned role="status" data-preview-notice className={`grid grid-cols-[48px_1fr] items-center gap-3 ${className ?? ""}`}>
      <img src={ART.scroll} alt="" className="cq-shadowed w-12" />
      <div className="flex flex-col">
        <span className="font-semibold">{t(titleKey)}</span>
        <span className="cq-muted text-sm">{t(lineKey)}</span>
      </div>
    </Panel>
  );
}
