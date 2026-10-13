import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BookMockup } from "@/components/index/landing-pictures";
import { Panel, RpgLink } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { BOOK_COVERS, LANDING_ART } from "@/configs/landing";

/**
 * Localizes the Our books page metadata; the title is complete, so the site template is not added.
 * @param props.params Route parameters carrying the locale.
 * @returns Title and description metadata.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PublicBooks" });
  return { title: { absolute: t("meta.title") }, description: t("meta.description") };
}

/**
 * Our books in the library (spec PP-6): the series (Origins, Quest, Adventure) with a row of
 * flat covers each, and the team that writes and edits them.
 * @returns The page.
 */
export default async function BooksPage() {
  const t = await getTranslations("PublicBooks");
  const tSite = await getTranslations("PublicSite");

  return (
    <Scene place="library" className="container gap-6 py-8 md:py-12">
      <h1 className="cq-on-scene text-4xl font-bold md:text-5xl">{t("title")}</h1>
      <Panel className="grid items-center gap-8 md:grid-cols-3 md:p-8">
        <BookMockup picture={LANDING_ART.bookCover} alt={t("mockupAlt")} className="max-w-52" />
        <p className="text-lg md:col-span-2">{t("intro")}</p>
      </Panel>
      <div className="grid gap-6 md:grid-cols-3">
        {(["origins", "quest", "adventure"] as const).map((series) => (
          <Panel key={series} className="gap-3">
            <h2 className="text-xl font-bold">{t(`series.${series}.title`)}</h2>
            <p>{t(`series.${series}.body`)}</p>
            {BOOK_COVERS[series].length > 0 && (
              <ul className="mt-auto flex flex-wrap gap-3 pt-2">
                {BOOK_COVERS[series].map((cover) => (
                  <li key={cover.key} className="w-20">
                    <img
                      src={cover.src}
                      alt={t(`covers.${cover.key}`)}
                      width={cover.width}
                      height={cover.height}
                      loading="lazy"
                      decoding="async"
                      className="h-auto w-full rounded-sm shadow-md"
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
      <Panel className="gap-3 md:p-8">
        <h2 className="text-2xl font-bold">{t("team.title")}</h2>
        <p className="text-lg">{t("team.body")}</p>
      </Panel>
      <RpgLink href="/contact" tone="gold" className="self-start">
        {tSite("trialCta")}
      </RpgLink>
    </Scene>
  );
}
