import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Panel, RpgLink, rpgButton } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { tutorAdvantageUrl } from "@/configs/landing";
import { cn } from "@/lib/utils";

/**
 * Localizes the About page metadata; the title is complete, so the site template is not added.
 * @param props.params Route parameters carrying the locale.
 * @returns Title and description metadata.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PublicAbout" });
  return { title: { absolute: t("meta.title") }, description: t("meta.description") };
}

/**
 * The About page in the guild hall (spec PP-7): who we are, what Primary Advantage is, how
 * schools use it (Blended Learning), and how families use it (Tutor Advantage).
 * @returns The page.
 */
export default async function AboutPage() {
  const t = await getTranslations("PublicAbout");
  const tSite = await getTranslations("PublicSite");
  const locale = await getLocale();

  return (
    <Scene place="guild-hall" className="container gap-6 py-8 md:py-12">
      <h1 className="cq-on-scene text-4xl font-bold md:text-5xl">{t("title")}</h1>
      <div className="grid gap-6 md:grid-cols-2">
        {(["who", "product", "schools"] as const).map((key) => (
          <Panel key={key} id={key === "schools" ? "schools" : undefined} className="scroll-mt-24 gap-3">
            <h2 className="text-2xl font-bold">{t(`${key}.title`)}</h2>
            <p className="text-lg">{t(`${key}.body`)}</p>
          </Panel>
        ))}
        <Panel className="gap-3">
          <h2 className="text-2xl font-bold">{t("families.title")}</h2>
          <p className="text-lg">{t("families.body")}</p>
          <a href={tutorAdvantageUrl(locale)} className={cn(rpgButton("wood"), "min-h-12 self-start")}>
            {t("families.link")}
          </a>
        </Panel>
      </div>
      <RpgLink href="/contact" tone="gold" className="self-start">
        {tSite("trialCta")}
      </RpgLink>
    </Scene>
  );
}
