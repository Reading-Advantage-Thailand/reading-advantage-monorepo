import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ContactLinks } from "@/components/index/contact-links";
import { BookMockup, PhoneShot, ResponsiveShot } from "@/components/index/landing-pictures";
import { Panel, RpgLink, Sign, rpgButton } from "@/components/rpg/chrome";
import { Scene } from "@/components/rpg/scene";
import { LANDING_ART, tutorAdvantageUrl, type LandingPicture } from "@/configs/landing";
import { cn } from "@/lib/utils";

/**
 * Localizes the home page metadata; the title is complete, so the site template is not added.
 * @param props.params Route parameters carrying the locale.
 * @returns Title and description metadata.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PublicHome" });
  return { title: { absolute: t("meta.title") }, description: t("meta.description") };
}

/**
 * The "Inside the app" blocks: a phone capture, and a desktop capture for wide screens when there
 * is one. Reedy waits for decision D4; Word adventures and the teacher picture wait for Daniel's
 * look check of the demo-seed retakes (spec PP-10, PP-11). The class book is in section 2 only.
 * A block with a desktop capture spans both columns on wide screens.
 */
const INSIDE: { key: string; phone: LandingPicture; desktop?: LandingPicture }[] = [
  { key: "hero", phone: LANDING_ART.heroesPhone, desktop: LANDING_ART.heroesDesktop },
  { key: "shop", phone: LANDING_ART.shopPhone },
  { key: "quest", phone: LANDING_ART.questPhone },
];

/** The CEFR bands of the 15 levels, three levels each (approved fact, spec PP-11). */
const CEFR_BANDS = ["Pre-A1", "A1", "A2", "B1", "B2"] as const;

/**
 * The public home page at the gatehouse (spec PP-2): hero, the book and the app, inside the app,
 * for teachers, levels, for families, and contact. There is no form: the contact section lists
 * the channels.
 * @returns The page.
 */
export default async function Home() {
  const t = await getTranslations("PublicHome");
  const tSite = await getTranslations("PublicSite");
  const locale = await getLocale();
  const points = t.raw("teachers.points") as string[];

  return (
    <Scene place="gatehouse" className="container gap-12 py-8 md:gap-16 md:py-12">
      <section className="grid items-center gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h1 className="cq-on-scene text-4xl font-bold md:text-6xl">{t("hero.title")}</h1>
          <p className="cq-on-scene text-xl md:text-2xl">{t("hero.tagline")}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a href="#contact" className={cn(rpgButton("gold"), "min-h-12")}>
              {tSite("trialCta")}
            </a>
            <RpgLink href="/about#schools">{t("hero.forSchools")}</RpgLink>
            <RpgLink href="/auth/signin" tone="iron">
              {tSite("signIn")}
            </RpgLink>
          </div>
        </div>
        <PhoneShot picture={LANDING_ART.homePhone} alt={t("hero.phoneAlt")} eager className="max-w-72" />
      </section>

      <section aria-labelledby="book-title">
        <Panel className="grid items-center gap-8 md:grid-cols-3 md:p-8">
          <BookMockup picture={LANDING_ART.bookCover} alt={t("book.mockupAlt")} className="max-w-52" />
          <div className="flex flex-col gap-3">
            <h2 id="book-title" className="text-2xl font-bold md:text-3xl">
              {t("book.title")}
            </h2>
            <p className="text-lg">{t("book.body")}</p>
          </div>
          <figure className="flex flex-col items-center gap-2">
            <PhoneShot picture={LANDING_ART.classBookPhone} alt={t("book.classBookAlt")} className="max-w-48" />
            <figcaption className="cq-muted text-center text-sm text-balance">{t("book.classBookCaption")}</figcaption>
          </figure>
        </Panel>
      </section>

      <section aria-labelledby="inside-title" className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 id="inside-title">
            <Sign>{t("inside.title")}</Sign>
          </h2>
          <p className="cq-on-scene max-w-2xl text-lg">{t("inside.intro")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {INSIDE.map(({ key, phone, desktop }) => (
            <Panel key={key} className={cn("gap-4", desktop && "md:col-span-2")}>
              {desktop ? (
                <ResponsiveShot phone={phone} desktop={desktop} alt={t(`inside.${key}.alt`)} className="md:max-w-3xl" />
              ) : (
                <PhoneShot picture={phone} alt={t(`inside.${key}.alt`)} className="max-w-48" />
              )}
              <h3 className="text-xl font-bold">{t(`inside.${key}.title`)}</h3>
              <p>{t(`inside.${key}.body`)}</p>
            </Panel>
          ))}
        </div>
      </section>

      <section aria-labelledby="teachers-title">
        <Panel className="gap-4 md:p-8">
          <h2 id="teachers-title" className="text-2xl font-bold md:text-3xl">
            {t("teachers.title")}
          </h2>
          <p className="text-lg">{t("teachers.body")}</p>
          <ul className="flex list-disc flex-col gap-2 pl-6">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </Panel>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="levels-title">
          <Panel className="h-full gap-4">
            <h2 id="levels-title" className="text-2xl font-bold">
              {t("levels.title")}
            </h2>
            <p>{t("levels.body")}</p>
            <ol className="flex flex-wrap gap-2" aria-hidden="true">
              {CEFR_BANDS.map((band) => (
                <li key={band}>
                  <Sign small>{band}</Sign>
                </li>
              ))}
            </ol>
          </Panel>
        </section>
        <section aria-labelledby="families-title">
          <Panel className="h-full gap-4">
            <h2 id="families-title" className="text-2xl font-bold">
              {t("families.title")}
            </h2>
            <p>{t("families.body")}</p>
            <a href={tutorAdvantageUrl(locale)} className={cn(rpgButton("wood"), "min-h-12 self-start")}>
              {t("families.link")}
            </a>
          </Panel>
        </section>
      </div>

      <section id="contact" aria-labelledby="contact-title" className="scroll-mt-24">
        <Panel className="gap-4 md:p-8">
          <h2 id="contact-title" className="text-2xl font-bold md:text-3xl">
            {t("contact.title")}
          </h2>
          <p className="text-lg">{t("contact.body")}</p>
          <ContactLinks
            labels={{
              line: t("contact.line"),
              lineQrAlt: t("contact.lineQrAlt"),
              facebook: t("contact.facebook"),
              phone: t("contact.phone"),
              email: t("contact.email"),
            }}
          />
        </Panel>
      </section>
    </Scene>
  );
}
