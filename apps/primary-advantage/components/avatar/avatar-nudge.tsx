import { ART } from "@/lib/rpg/places";
import { Panel, RpgLink } from "@/components/rpg/chrome";

/**
 * The home notice of a student with no avatar (FR-10b): one line and the way to the shrine.
 * @param props.t The `Avatar` translator.
 * @returns The notice.
 */
export function AvatarNudge({ t }: { t: (key: "nudgeTitle" | "nudgeBody" | "nudgeLink") => string }) {
  return (
    <Panel pinned role="status" className="grid grid-cols-[48px_1fr] items-center gap-3 sm:grid-cols-[48px_1fr_auto]">
      <img src={ART.banner} alt="" className="cq-shadowed w-12" />
      <div className="flex flex-col">
        <span className="font-semibold">{t("nudgeTitle")}</span>
        <span className="cq-muted text-sm">{t("nudgeBody")}</span>
      </div>
      <RpgLink tone="gold" href="/student/avatar" className="col-span-2 justify-self-start sm:col-span-1">
        {t("nudgeLink")}
      </RpgLink>
    </Panel>
  );
}
