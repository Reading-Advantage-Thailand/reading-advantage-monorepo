import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { db } from "@reading-advantage/db";
import { getAvatarProfile } from "@reading-advantage/domain/primary-avatar";
import { getVoiceEntitlement, voiceConfigFromEnv, type VoiceEntitlement } from "@reading-advantage/domain/primary-voice";
import { getCurrentSession } from "@/lib/session";
import { redirect } from "@/i18n/navigation";
import { ReedyMeter } from "@/components/reedy/reedy-meter";
import { ReedySession } from "@/components/reedy/reedy-session";
import { Sign } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";

/** The Reedy limits of this process. */
const voiceConfig = voiceConfigFromEnv(process.env);

/**
 * Page title: Reedy.
 * @returns The metadata.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Reedy");
  return { title: `${t("title")} · ${t("preview")}` };
}

/**
 * The Reedy page (FR-8): the Preview label with the bilingual explanation, the meter, and the
 * session. A student with no avatar goes to the picker first (FR-10b).
 * @param props.searchParams `articleId` from the lesson flow (FR-4).
 * @returns The page.
 */
export default async function ReedyPage({ searchParams }: { searchParams: Promise<{ articleId?: string }> }) {
  const session = await getCurrentSession();
  const locale = await getLocale();
  if (!session) return redirect({ href: "/auth/signin", locale });
  const user = session.user;
  const [{ articleId }, profile, t] = await Promise.all([searchParams, getAvatarProfile({ db, user }).catch(() => null), getTranslations("Reedy")]);
  if (!profile) return redirect({ href: "/student/avatar?from=reedy", locale });
  let entitlement: VoiceEntitlement | null = null;
  try {
    entitlement = await getVoiceEntitlement({ db, user, authStrength: session.authStrength, config: voiceConfig });
  } catch {
    entitlement = null;
  }
  const data = entitlement ?? { remainingSeconds: 0, budgetSeconds: voiceConfig.monthBudgetSeconds, blockedBy: "DISABLED" as const };
  // The campfire talk in the clearing (docs/primary-rpg-skin.md §4).
  return (
    <Scene place="clearing">
      <header className="cq-on-scene flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold md:text-3xl">
          {t("title")}
          <Sign small className="text-xs uppercase">{t("preview")}</Sign>
        </h1>
        <p lang="en" className="text-sm">
          {t("explainEn")}
        </p>
        <p lang="th" className="text-sm">
          {t("explainTh")}
        </p>
      </header>
      <ReedyMeter data={data} t={t} link={false} />
      <ReedySession profile={profile} articleId={articleId && /^[0-9a-f-]{36}$/i.test(articleId) ? articleId : null} remainingSeconds={data.remainingSeconds} blockedBy={data.blockedBy} />
    </Scene>
  );
}
