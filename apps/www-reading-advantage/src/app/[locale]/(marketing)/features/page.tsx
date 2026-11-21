import type { Metadata } from "next";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Link } from "@/locales/navigation";
import { getScopedI18n } from "@/locales/server";
import { buildMarketingMetadata } from "@/lib/seo";
import { siteLogos } from "@/lib/site-assets";
import { FaqList, type FaqItem } from "@/components/features/faq-list";
import {
  ProgramCard,
  type ProgramCardCopy,
} from "@/components/features/program-card";

/** Program card keys in the spec order (S2). */
const CARD_KEYS = [
  "storytime",
  "primary",
  "reading",
  "codecamp",
  "schoolSubjects",
] as const;

type CardKey = (typeof CARD_KEYS)[number];

/** Rendered hooks; the school subjects card uses the spec's kebab-case hook. */
const CARD_TEST_ID: Record<CardKey, string> = {
  storytime: "storytime",
  primary: "primary",
  reading: "reading",
  codecamp: "codecamp",
  schoolSubjects: "school-subjects",
};

/** Screenshot slots that have an approved current-set crop (D7). */
const CARD_IMAGES: Partial<
  Record<
    CardKey,
    {
      src: string;
      alt: string;
      width: number;
      height: number;
      pictureClass?: string;
    }
  >
> = {
  storytime: {
    src: "/images/features/storytime-reader-card.webp",
    alt: "Storytime Advantage reader screen",
    width: 366,
    height: 282,
  },
  primary: {
    src: "/images/features/primary-lesson-step05.webp",
    alt: "Primary Advantage lesson screen",
    width: 375,
    height: 622,
  },
  reading: {
    src: "/images/products/ra-origins-2-cover.jpg",
    alt: "Reading Advantage Origins 2 book cover",
    width: 600,
    height: 814,
    pictureClass: "max-h-[300px] [&>img]:max-h-[300px] [&>img]:object-contain",
  },
};

/** Product logos for the app-family section, in the agreed order (D8). */
const APP_LOGOS = [
  { id: "storytime", src: siteLogos.storytime.square, alt: "Storytime Advantage" },
  { id: "primary", src: siteLogos.primary.square, alt: "Primary Advantage" },
  { id: "reading", src: siteLogos.reading.square, alt: "Reading Advantage" },
  { id: "tutor", src: siteLogos.tutor.square, alt: "Tutor Advantage" },
  { id: "science", src: siteLogos.science.square, alt: "Science Advantage" },
  { id: "math", src: siteLogos.math.square, alt: "Math Advantage" },
  { id: "zhongwen", src: siteLogos.zhongwen.square, alt: "Zhongwen Advantage" },
] as const;

/** Shared class for the primary call-to-action on a light band. */
const PRIMARY_CTA =
  "inline-flex items-center gap-2 rounded-full bg-sky-800 px-8 py-4 font-semibold text-white transition-colors hover:bg-sky-900";

/**
 * Builds metadata for the public features route.
 * @param props The locale route parameters.
 * @returns The features route metadata.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getScopedI18n("pages.feature");

  return buildMarketingMetadata({
    description: t("metadata.description"),
    locale,
    path: "/features",
    title: t("metadata.title"),
  });
}

/**
 * Renders the public features page with sections S1 to S9 in spec order.
 * @returns The rendered features page.
 */
export default async function FeaturesPage() {
  const t = await getScopedI18n("pages.feature");
  const cardCopy = (cardKey: CardKey): ProgramCardCopy => {
    const field = (name: "name" | "forText" | "status" | "body") =>
      t(
        `programs.cards.${cardKey}.${name}` as "programs.cards.storytime.name",
      );
    const bulletCounts: Record<CardKey, number> = {
      storytime: 3,
      primary: 3,
      reading: 0,
      codecamp: 0,
      schoolSubjects: 0,
    };
    return {
      name: field("name"),
      forText: field("forText"),
      status: field("status"),
      body: field("body"),
      bullets: Array.from({ length: bulletCounts[cardKey] }, (_, index) =>
        t(
          `programs.cards.${cardKey}.bullets.${index}` as "programs.cards.storytime.bullets.0",
        ),
      ),
    };
  };
  const faqItems: FaqItem[] = [0, 1, 2].map((index) => ({
    q: t(`faq.items.${index}.q` as "faq.items.0.q"),
    a: t(`faq.items.${index}.a` as "faq.items.0.a"),
  }));

  return (
    <main className="overflow-x-hidden bg-white">
      <section
        data-testid="features-hero"
        className="bg-site-page py-20 md:py-28"
      >
        <div className="container mx-auto px-4">
          <span className="mb-5 block text-xs font-semibold uppercase tracking-eyebrow text-sky-800">
            {t("hero.eyebrow")}
          </span>
          <h1 className="mb-6 max-w-3xl text-3xl font-bold leading-display tracking-tight text-slate-900 md:text-5xl">
            {t("hero.heading")}
          </h1>
          <p className="mb-4 max-w-2xl text-lg leading-relaxed text-slate-700">
            {t("hero.body1")}
          </p>
          <p className="mb-8 max-w-2xl text-base leading-relaxed text-site-body">
            {t("hero.body2")}
          </p>
          <a href="#programs" className={PRIMARY_CTA}>
            {t("hero.button")}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </a>
        </div>
      </section>

      <section
        data-testid="features-programs"
        id="programs"
        className="py-20 md:py-24"
      >
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {t("programs.heading")}
          </h2>
          <p className="mb-10 max-w-3xl text-base leading-relaxed text-site-body">
            {t("programs.body")}
          </p>
          <div className="grid items-start gap-6 sm:grid-cols-2">
            {CARD_KEYS.map((key) => {
              const image = CARD_IMAGES[key];
              return (
                <ProgramCard
                  key={key}
                  testId={`program-card-${CARD_TEST_ID[key]}`}
                  imageSrc={image?.src}
                  imageAlt={image?.alt}
                  imageWidth={image?.width}
                  imageHeight={image?.height}
                  pictureClass={image?.pictureClass}
                  featured={Boolean(image)}
                  {...cardCopy(key)}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section data-testid="features-engine" className="bg-site-page py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                {t("engine.heading")}
              </h2>
              <p className="max-w-2xl text-base leading-relaxed text-site-body">
                {t("engine.body")}
              </p>
            </div>
            <div className="rounded-panel border border-site-border bg-white p-8 shadow-panel">
              <span className="text-xs font-semibold uppercase tracking-eyebrow text-sky-800">
                Mastery Advantage
              </span>
              <div className="mt-5 flex justify-center">
                <Image
                  src={siteLogos.mastery.square}
                  alt="Mastery Advantage"
                  width={160}
                  height={160}
                  className="h-28 w-28 object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section data-testid="features-blended" className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {t("blended.heading")}
          </h2>
          <div className="grid max-w-4xl gap-4 md:grid-cols-2">
            <p className="text-base leading-relaxed text-site-body">
              {t("blended.body1")}
            </p>
            <p className="text-base leading-relaxed text-site-body">
              {t("blended.body2")}
            </p>
          </div>
        </div>
      </section>

      <section data-testid="features-tutor" className="bg-site-page py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                {t("tutor.heading")}
              </h2>
              <p className="mb-4 text-base leading-relaxed text-site-body">
                {t("tutor.body1")}
              </p>
              <p className="mb-4 text-base leading-relaxed text-site-body">
                {t("tutor.body2")}
              </p>
              <p className="mb-8 text-base leading-relaxed text-site-body">
                {t("tutor.body3")}
              </p>
              <Link href="/products/tutor-advantage" className={PRIMARY_CTA}>
                {t("tutor.button")}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
            <div className="mx-auto w-full max-w-xs">
              <Image
                src="/images/features/tutor-class-leaderboard.webp"
                alt="Tutor Advantage live class leaderboard screen"
                width={520}
                height={880}
                className="h-auto w-full rounded-panel border border-site-border shadow-panel"
              />
            </div>
          </div>
        </div>
      </section>

      <section data-testid="features-next-subjects" className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {t("nextSubjects.heading")}
          </h2>
          <p className="max-w-3xl text-base leading-relaxed text-site-body">
            {t("nextSubjects.body")}
          </p>
        </div>
      </section>

      <section data-testid="features-app-family" className="bg-site-page py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {t("appFamily.heading")}
          </h2>
          <p className="mb-10 max-w-3xl text-base leading-relaxed text-site-body">
            {t("appFamily.body")}
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
            {APP_LOGOS.map((logo) => (
              <li
                key={logo.id}
                data-testid={`app-logo-${logo.id}`}
                className="flex items-center justify-center rounded-2xl border border-site-border bg-white p-4 shadow-panel"
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={120}
                  height={120}
                  className="h-16 w-16 object-contain"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FaqList
        testId="features-faq"
        heading={t("faq.heading")}
        items={faqItems}
      />

      <section data-testid="features-next-step" className="py-20 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {t("nextStep.heading")}
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-base leading-relaxed text-site-body">
            {t("nextStep.body")}
          </p>
          <Link href="/contact" className={PRIMARY_CTA}>
            {t("nextStep.button")}
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
