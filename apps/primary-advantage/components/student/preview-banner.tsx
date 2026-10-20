import { useTranslations } from "next-intl";
import { Banner, RpgLink } from "@/components/rpg/chrome";

/**
 * The banner on every student page for a staff member: a blue hanging cloth, the note, and the way out.
 * It has its own spacing and `relative z-10`, so it shows over the fixed scene backdrop.
 * @param props.exitHref The role home that "Exit preview" opens.
 * @returns The banner.
 */
export function PreviewBanner({ exitHref }: { exitHref: string }) {
  const t = useTranslations("StudentView");
  return (
    <div role="status" data-preview-banner className="relative z-10 flex flex-col gap-1 pb-1">
      <div className="mb-3 flex items-start justify-between gap-3">
        <Banner blue className="!px-4 !pb-5 !pt-2 !text-base">
          <span className="whitespace-nowrap">{t("bannerTitle")}</span>
        </Banner>
        <RpgLink tone="iron" small href={exitHref} className="min-h-12">
          {t("exit")}
        </RpgLink>
      </div>
      {/* A dark backing: the light text was hard to read on the day sky (owner look check 2026-10-19). */}
      <p className="cq-on-scene self-start rounded-md bg-black/55 px-2 py-1 text-sm">{t("bannerNote")}</p>
    </div>
  );
}
