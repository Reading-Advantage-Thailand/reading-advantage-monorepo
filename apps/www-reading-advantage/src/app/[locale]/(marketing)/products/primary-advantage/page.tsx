import { Fragment } from "react";
import Image from "next/image";
import { Link } from "@/locales/navigation";
import { getScopedI18n } from "@/locales/server";
import { ArrowRight } from "lucide-react";
import { ExperienceDemo } from "@/components/marketing/experience-demo";
import { buildMarketingMetadata } from "@/lib/seo";
import type { Metadata } from "next";

const IMAGE_DIR = "/images/primary-advantage";

/** The games demo section (spec section 7a) comes after the first five sections. */
const DEMO_AFTER = 5;

/** Page sections 1 to 7, in page order, with their screenshots and output sizes. */
const SECTIONS = [
  {
    testId: "pa-section-1",
    key: "workbook",
    images: [
      { name: "workbook-and-app-series", alt: "workbookAndAppSeries", width: 1216, height: 350 },
      { name: "workbook-qr-link-landing", alt: "workbookQrLinkLanding", width: 1279, height: 846 },
    ],
  },
  {
    testId: "pa-section-2",
    key: "blended",
    images: [
      { name: "blended-student-class-book", alt: "blendedStudentClassBook", width: 954, height: 236 },
      { name: "blended-teacher-class-book", alt: "blendedTeacherClassBook", width: 960, height: 640 },
    ],
  },
  {
    testId: "pa-section-3",
    key: "cefr",
    images: [{ name: "cefr-book-series", alt: "cefrBookSeries", width: 1216, height: 184 }],
  },
  {
    testId: "pa-section-4",
    key: "students",
    images: [
      { name: "student-story-listen", alt: "studentStoryListen", width: 1279, height: 846 },
      { name: "student-language-questions-ai", alt: "studentLanguageQuestionsAi", width: 672, height: 190 },
      { name: "student-long-answer-feedback", alt: "studentLongAnswerFeedback", width: 915, height: 424 },
      { name: "student-home-thai", alt: "studentHomeThai", width: 953, height: 448 },
    ],
  },
  {
    testId: "pa-section-5",
    key: "games",
    images: [
      { name: "games-vocabulary-picker", alt: "gamesVocabularyPicker", width: 712, height: 480 },
      { name: "game-enchanted-library", alt: "gameEnchantedLibrary", width: 1279, height: 846 },
    ],
  },
  {
    testId: "pa-section-6",
    key: "reedy",
    images: [{ name: "reedy-preview", alt: "reedyPreview", width: 1280, height: 912 }],
  },
  {
    testId: "pa-section-7",
    key: "teacher",
    images: [
      { name: "teacher-live-guide", alt: "teacherLiveGuide", width: 956, height: 560 },
      { name: "teacher-projector-games", alt: "teacherProjectorGames", width: 964, height: 500 },
      { name: "teacher-print-lesson", alt: "teacherPrintLesson", width: 898, height: 505 },
    ],
  },
] as const;

const PRIMARY_BUTTON =
  "bg-white hover:bg-cyan-50 text-cyan-800 px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-xl inline-flex items-center justify-center gap-3";
const OUTLINE_BUTTON =
  "border-2 border-white hover:bg-white hover:text-cyan-800 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:-translate-y-1 inline-flex items-center justify-center gap-3";
const SECTION_BUTTON =
  "bg-gradient-to-br from-cyan-400 to-cyan-800 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:-translate-y-1 hover:shadow-xl inline-flex items-center justify-center gap-3";
const SCREENSHOT = "w-full h-auto rounded-2xl border border-site-border bg-white shadow-lg";

/**
 * Builds metadata for the public Primary Advantage route.
 * @param props The locale route parameters.
 * @returns The Primary Advantage route metadata.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getScopedI18n("pages.products.primaryAdvantage");

  return buildMarketingMetadata({
    description: t("meta.description"),
    locale,
    path: "/products/primary-advantage",
    title: t("meta.title"),
  });
}

/**
 * Renders the public Primary Advantage page: hero, sections 1 to 8, and the closing call to action.
 * @param props The locale route parameters.
 * @returns The rendered Primary Advantage page.
 */
export default async function PrimaryAdvantage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getScopedI18n("pages.products.primaryAdvantage");

  return (
    <main className="min-h-screen bg-sky-50">
      <section
        data-testid="pa-hero"
        className="relative overflow-hidden pt-24 min-h-hero flex items-center bg-gradient-to-br from-cyan-400 to-cyan-800 text-white"
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="container relative z-10 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {t("hero.headline")}
            </h1>
            <p className="text-lg md:text-xl leading-relaxed text-cyan-100 mb-10">
              {t("hero.body")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/pricing" className={PRIMARY_BUTTON}>
                {t("buttons.pricing")}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/contact" className={OUTLINE_BUTTON}>
                {t("buttons.contact")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {SECTIONS.map((section, index) => {
        // The demo section sits after section 5, so later sections shift one place in the
        // background and side alternation.
        const position = index < DEMO_AFTER ? index : index + 1;
        return (
          <Fragment key={section.testId}>
            {index === DEMO_AFTER && (
              <section data-testid="pa-demo" className="py-20 md:py-24 bg-sky-50">
                <div className="container mx-auto px-4 max-w-6xl">
                  <div className="text-center mb-12 max-w-3xl mx-auto">
                    <span className="uppercase tracking-widest text-xs font-semibold text-cyan-800 mb-4 block">
                      {t("experience.eyebrow")}
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                      {t("experience.heading")}
                    </h2>
                    <p className="text-base md:text-lg leading-relaxed text-site-body">
                      {t("experience.description")}
                    </p>
                  </div>
                  <ExperienceDemo
                    text={{
                      play: t("experience.play"),
                      fullscreen: t("experience.fullscreen"),
                      hint: t("experience.hint"),
                      frameTitle: t("experience.frameTitle"),
                      posterAlt: t("experience.posterAlt"),
                    }}
                  />
                </div>
              </section>
            )}
            <section
              data-testid={section.testId}
              className={`py-20 md:py-24 ${position % 2 === 0 ? "bg-white" : "bg-sky-50"}`}
            >
              <div className="container mx-auto px-4 max-w-7xl">
                <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-start">
                  <div
                    className={`lg:col-span-5 lg:sticky lg:top-24 ${position % 2 === 1 ? "lg:order-2" : ""}`}
                  >
                    {section.key === "reedy" && (
                      <span className="inline-block bg-cyan-50 text-cyan-800 border border-site-border px-4 py-1 rounded-full text-sm font-bold mb-4">
                        {t("reedy.badge")}
                      </span>
                    )}
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                      {t(`${section.key}.headline`)}
                    </h2>
                    <p className="text-base md:text-lg leading-relaxed text-site-body">
                      {t(`${section.key}.body`)}
                    </p>
                    {section.key === "students" && (
                      <p className="mt-6 rounded-2xl bg-cyan-50 border border-site-border p-6 text-base leading-relaxed text-site-body">
                        {t("students.features")}
                      </p>
                    )}
                    {section.key === "blended" && (
                      <div className="mt-8">
                        <Link href="/pricing" className={SECTION_BUTTON}>
                          {t("buttons.pricing")}
                          <ArrowRight className="w-5 h-5" />
                        </Link>
                      </div>
                    )}
                  </div>
                  <div
                    className={`lg:col-span-7 space-y-6 ${position % 2 === 1 ? "lg:order-1" : ""}`}
                  >
                    {section.images.map((image) => (
                      <Image
                        key={image.name}
                        src={`${IMAGE_DIR}/${image.name}.webp`}
                        alt={t(`images.${image.alt}`)}
                        width={image.width}
                        height={image.height}
                        sizes="(max-width: 1024px) 100vw, 58vw"
                        className={SCREENSHOT}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </Fragment>
        );
      })}

      <section data-testid="pa-section-8" className="py-20 md:py-24 bg-white">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-5">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                {t("nextStep.headline")}
              </h2>
              <p className="text-base md:text-lg leading-relaxed text-site-body mb-8">
                {t("nextStep.body")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/contact" className={SECTION_BUTTON}>
                  {t("buttons.contact")}
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/pricing"
                  className="border-2 border-cyan-800 text-cyan-800 hover:bg-cyan-50 px-8 py-4 rounded-2xl font-bold transition-all duration-300 hover:-translate-y-1 inline-flex items-center justify-center gap-3"
                >
                  {t("buttons.pricing")}
                </Link>
              </div>
            </div>
            <div className="lg:col-span-7">
              <Image
                src={`${IMAGE_DIR}/contact-channels.webp`}
                alt={t("images.contactChannels")}
                width={712}
                height={248}
                sizes="(max-width: 1024px) 100vw, 58vw"
                className={SCREENSHOT}
              />
            </div>
          </div>
        </div>
      </section>

      <section
        data-testid="pa-closing"
        className="py-24 bg-gradient-to-br from-cyan-600 via-cyan-600 to-cyan-800 text-white relative overflow-hidden"
      >
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">{t("closing.headline")}</h2>
          <p className="text-xl text-cyan-100 max-w-2xl mx-auto mb-12">{t("closing.body")}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link href="/contact" className={PRIMARY_BUTTON}>
              {t("buttons.contact")}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/pricing" className={OUTLINE_BUTTON}>
              {t("buttons.pricing")}
            </Link>
          </div>
          <Link
            href="/products/tutor-advantage"
            className="inline-block mt-10 text-lg font-semibold text-white underline underline-offset-4 hover:text-cyan-100"
          >
            {t("closing.tutorLink")}
          </Link>
        </div>
      </section>
    </main>
  );
}
