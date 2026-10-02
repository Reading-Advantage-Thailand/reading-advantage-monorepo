import { Metadata } from "next";
import { Link } from "@/locales/navigation";
import { ArrowRight, Check, Mic } from "lucide-react";
import { getScopedI18n } from "@/locales/server";
import { buildMarketingMetadata } from "@/lib/seo";
import { siteImages, siteLogos } from "@/lib/site-assets";
import { SiteImageView } from "@/components/marketing/site-image";
import { SectionHeader } from "@/components/marketing/section-header";
import { TutorClassStepper } from "@/components/marketing/tutor-class-stepper";
import { OverlappingSection } from "@/components/ui/overlapping-section";
import { FAQAccordion } from "@/components/ui/faq-accordion";

const PRINTED_STEPS = 13;
const PHASE_COUNT = 18;
const BOOK_ART = [siteImages.primaryBook, siteImages.primaryBookWarm, siteImages.classroomStudentsApp];
const BOOK_LOGOS = [siteLogos.primary.color, siteLogos.primary.color, siteLogos.reading.color];

/**
 * Builds metadata for the localized Tutor Advantage route.
 * @param params The locale route parameters.
 * @returns The localized route metadata.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getScopedI18n("pages.products.tutorAdvantage");
  const title = t("hero.title");
  const description = t("hero.description");

  return buildMarketingMetadata({
    description,
    locale,
    path: "/products/tutor-advantage",
    title,
  });
}

/**
 * Renders the localized Tutor Advantage marketing page.
 * @param params The locale route parameters.
 * @returns The localized Tutor Advantage page.
 */
export default async function TutorAdvantage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  const t = await getScopedI18n("pages.products.tutorAdvantage");
  // Indexed keys are built at run time, so the typed key union does not apply.
  const key = t as unknown as (k: string) => string;

  const phases = Array.from({ length: PHASE_COUNT }, (_, i) => ({
    title: key(`classTour.phases.${i}.title`),
    description: key(`classTour.phases.${i}.description`),
  }));
  const faqItems = Array.from({ length: 6 }, (_, i) => ({
    question: key(`faq.items.${i}.question`),
    answer: key(`faq.items.${i}.answer`),
  }));
  const books = [0, 1, 2].map((i) => ({
    name: key(`books.items.${i}.name`),
    series: key(`books.items.${i}.series`),
    alt: key(`books.items.${i}.alt`),
  }));
  const roleKeys = [0, 1, 2, 3];
  const reedyKeys = [0, 1, 2, 3];

  return (
    <main className="overflow-x-hidden bg-[#fbfaf6]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-emerald-950 text-white">
        <div
          aria-hidden="true"
          className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-emerald-500/25 blur-[120px]"
        />
        <div className="container relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 md:py-24 lg:grid-cols-12 lg:gap-14 lg:px-8">
          <div className="lg:col-span-6">
            <div className="mb-8 inline-block rounded-2xl bg-[#0f172a] p-4 ring-1 ring-emerald-300/40">
              <img
                src={siteLogos.tutor.reversed}
                alt={t("logoAlt")}
                className="h-12 w-auto md:h-14"
              />
            </div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-950">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-900 motion-safe:animate-pulse" />
              {t("hero.comingSoon")}
            </p>
            <h1 className="mb-6 text-4xl font-semibold leading-[1.05] tracking-[-0.02em] sm:text-5xl lg:text-6xl">
              {t("hero.title")}
            </h1>
            <p className="mb-3 text-xl font-medium text-emerald-100 md:text-2xl">{t("hero.subtitle")}</p>
            <p className="mb-8 max-w-xl text-base leading-relaxed text-emerald-50 md:text-lg">
              {t("hero.description")}
            </p>
            <div className="mb-8 border-l-4 border-emerald-300 pl-4">
              <p className="text-2xl font-semibold text-white">{t("heroExtra.price")}</p>
              <p className="text-sm text-emerald-100">{t("heroExtra.priceNote")}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-8 py-3 text-base font-semibold text-emerald-950 shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950 motion-reduce:transition-none"
              >
                {t("heroExtra.cta")}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <a
                href="#become-a-tutor"
                className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-emerald-200 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950"
              >
                {t("heroExtra.ctaTutor")}
              </a>
            </div>
          </div>
          <div className="lg:col-span-6">
            <div className="overflow-hidden rounded-[2rem] border border-white/20 shadow-2xl">
              <SiteImageView
                image={siteImages.classroomSmallGroup}
                alt={t("heroExtra.imageAlt")}
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Facts */}
      <section aria-label={t("heroExtra.factsLabel")} className="border-b border-[#e5e1d6] bg-white">
        <dl className="container mx-auto grid max-w-5xl grid-cols-1 gap-6 px-4 py-10 text-center sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col">
              <dt className="order-2 text-sm font-medium text-slate-600">{t(`stats.${i}.label` as "stats.0.label")}</dt>
              <dd className="text-4xl font-semibold text-emerald-900">{t(`stats.${i}.value` as "stats.0.value")}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Inside one class */}
      <section className="py-20 md:py-28" data-testid="process-flow">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            eyebrow={t("classTour.eyebrow")}
            title={t("classTour.heading")}
            description={t("classTour.description")}
            accent="text-emerald-800"
            className="mb-12"
          />
          <TutorClassStepper
            phases={phases}
            printedCount={PRINTED_STEPS}
            printedGroup={t("classTour.printedGroup")}
            addedGroup={t("classTour.addedGroup")}
            stepOf={t("classTour.stepOf")}
            addedTag={t("classTour.addedTag")}
            prev={t("classTour.prev")}
            next={t("classTour.next")}
            listLabel={t("classTour.listLabel")}
          />
        </div>
      </section>

      {/* Three books */}
      <section className="bg-emerald-50 py-20 md:py-28">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            eyebrow={t("books.eyebrow")}
            title={t("books.heading")}
            description={t("books.description")}
            accent="text-emerald-800"
            className="mb-12"
          />
          <ul className="grid gap-6 md:grid-cols-3">
            {books.map((book, i) => (
              <li
                key={book.name}
                className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm"
              >
                <SiteImageView
                  image={BOOK_ART[i]}
                  alt={book.alt}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="p-6">
                  <img src={BOOK_LOGOS[i]} alt="" className="mb-4 h-8 w-auto" />
                  <h3 className="text-xl font-semibold text-slate-950">{book.name}</h3>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-slate-700">{t("books.note")}</p>
        </div>
      </section>

      {/* Reedy */}
      <section className="relative overflow-hidden bg-emerald-950 py-20 pb-36 text-white md:py-28 md:pb-40">
        <div className="container relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <SectionHeader
              eyebrow={t("reedyBlock.eyebrow")}
              title={t("reedyBlock.heading")}
              description={t("reedyBlock.description")}
              tone="dark"
              accent="text-emerald-300"
              className="mb-8 [&_p:last-child]:text-emerald-50"
            />
            <ul className="space-y-4">
              {reedyKeys.map((i) => (
                <li key={i} className="flex gap-3 text-base leading-relaxed text-emerald-50">
                  <Mic className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-300" aria-hidden="true" />
                  <span>{t(`reedyBlock.points.${i}` as "reedyBlock.points.0")}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-3xl border border-white/20 shadow-2xl">
              <SiteImageView
                image={siteImages.chibiOakClearing}
                alt={t("reedyBlock.alt")}
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* What is in a class package */}
      <OverlappingSection background="bg-[#fbfaf6]" data-testid="overlapping-section">
        <div className="container mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-24">
          <h2 className="mb-12 text-3xl font-semibold tracking-[-0.02em] text-slate-950 md:text-4xl">
            {t("platformFeatures.heading")}
          </h2>
          <ul className="grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex gap-4">
                <span className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-800 text-white">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-950">
                    {t(`platformFeatures.features.${i}.title` as "platformFeatures.features.0.title")}
                  </h3>
                  <p className="leading-relaxed text-slate-700">
                    {t(`platformFeatures.features.${i}.description` as "platformFeatures.features.0.description")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </OverlappingSection>

      {/* Become a tutor */}
      <section id="become-a-tutor" className="scroll-mt-24 bg-emerald-50 py-20 md:py-28">
        <div className="container mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12">
          <div className="order-2 lg:order-1 lg:col-span-5">
            <div className="overflow-hidden rounded-3xl border border-emerald-200 shadow-lg">
              <SiteImageView
                image={siteImages.tutorQuestion}
                alt={t("tutorRole.alt")}
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="h-auto w-full"
              />
            </div>
          </div>
          <div className="order-1 lg:order-2 lg:col-span-7">
            <SectionHeader
              eyebrow={t("tutorRole.eyebrow")}
              title={t("tutorRole.heading")}
              description={t("tutorRole.description")}
              accent="text-emerald-800"
              className="mb-8"
            />
            <ul className="mb-8 space-y-3">
              {roleKeys.map((i) => (
                <li key={i} className="flex gap-3 leading-relaxed text-slate-800">
                  <Check className="mt-1 h-5 w-5 flex-shrink-0 text-emerald-800" aria-hidden="true" />
                  <span>{t(`tutorRole.points.${i}` as "tutorRole.points.0")}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-900 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
            >
              {t("tutorRole.cta")}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Honest basics */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeader
            eyebrow={t("commitments.eyebrow")}
            title={t("trustSignals.heading")}
            accent="text-emerald-800"
            className="mb-10"
          />
          <div className="grid gap-6 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                data-testid="testimonial-card"
                className="rounded-3xl border border-[#e5e1d6] bg-white p-8"
              >
                <h3 className="mb-3 text-xl font-semibold text-slate-950">
                  {t(`trustSignals.items.${i}.title` as "trustSignals.items.0.title")}
                </h3>
                <p className="leading-relaxed text-slate-700">
                  {t(`trustSignals.items.${i}.description` as "trustSignals.items.0.description")}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20 md:py-24">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeader
            eyebrow={t("faq.eyebrow")}
            title={t("faq.heading")}
            accent="text-emerald-800"
            className="mb-10"
          />
          <FAQAccordion items={faqItems} variant="emerald" />
        </div>
      </section>

      {/* Final CTA */}
      <section
        className="relative overflow-hidden bg-emerald-950 py-20 text-white md:py-24"
        data-testid="combined-stats-cta"
      >
        <div className="container relative z-10 mx-auto max-w-4xl px-4 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            {t("eyebrows.readyToStart")}
          </p>
          <h2 className="mb-6 text-4xl font-semibold tracking-[-0.02em] md:text-5xl">{t("cta.heading")}</h2>
          <p className="mx-auto mb-10 max-w-2xl text-lg text-emerald-50">{t("cta.description")}</p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-8 py-3 text-base font-semibold text-emerald-950 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950"
            >
              {t("cta.buttons.register")}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-12 items-center justify-center rounded-full border-2 border-emerald-200 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950"
            >
              {t("cta.buttons.apply")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
