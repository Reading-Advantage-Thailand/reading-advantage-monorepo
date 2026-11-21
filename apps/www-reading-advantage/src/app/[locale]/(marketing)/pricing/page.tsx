import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "@/locales/navigation";
import { getScopedI18n } from "@/locales/server";
import { buildMarketingMetadata } from "@/lib/seo";
import { FaqList, type FaqItem } from "@/components/features/faq-list";
import { SubjectPriceTable } from "@/components/pricing/subject-price-table";

/** Shared class for the primary call-to-action on a light band. */
const PRIMARY_CTA =
  "inline-flex items-center gap-2 rounded-full bg-sky-800 px-8 py-4 font-semibold text-white transition-colors hover:bg-sky-900";

/**
 * Builds metadata for the public pricing route.
 * @param props The locale route parameters.
 * @returns The pricing route metadata.
 */
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getScopedI18n("pages.pricing");

  return buildMarketingMetadata({
    description: t("metadata.description"),
    locale,
    path: "/pricing",
    title: t("metadata.title"),
  });
}

/**
 * Renders the public pricing page with sections S1 to S10 in spec order.
 * @returns The rendered pricing page.
 */
export default async function PricingPage() {
  const t = await getScopedI18n("pages.pricing");
  const columns = [0, 1, 2].map((index) =>
    t(`subjects.columns.${index}` as "subjects.columns.0"),
  );
  const rowLabels = [0, 1, 2, 3].map((index) =>
    t(`subjects.rows.${index}.label` as "subjects.rows.0.label"),
  );
  const rows = [0, 1, 2, 3].map((row) =>
    [0, 1, 2].map((column) =>
      t(
        `subjects.rows.${row}.cells.${column}` as "subjects.rows.0.cells.0",
      ),
    ),
  );
  const includedBullets = [0, 1, 2].map((index) =>
    t(`included.bullets.${index}` as "included.bullets.0"),
  );
  const faqItems: FaqItem[] = [0, 1, 2].map((index) => ({
    q: t(`faq.items.${index}.q` as "faq.items.0.q"),
    a: t(`faq.items.${index}.a` as "faq.items.0.a"),
  }));

  return (
    <main className="overflow-x-hidden bg-white">
      <section
        data-testid="pricing-hero"
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
          <p className="mb-2 max-w-2xl text-base leading-relaxed text-site-body">
            {t("hero.body2")}
          </p>
        </div>
      </section>

      <section data-testid="pricing-subjects" className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {t("subjects.heading")}
          </h2>
          <div className="mx-auto max-w-4xl">
            <SubjectPriceTable
              caption={t("subjects.body")}
              columns={columns}
              columnsLabel={t("subjects.columnsLabel")}
              rowLabels={rowLabels}
              rows={rows}
            />
            <p className="mt-6 text-sm leading-relaxed text-site-body">
              {t("subjects.note")}
            </p>
          </div>
        </div>
      </section>

      <section data-testid="pricing-example" className="bg-site-page py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {t("example.heading")}
          </h2>
          <div className="grid max-w-4xl gap-4 md:grid-cols-2">
            <p className="text-base leading-relaxed text-site-body">
              {t("example.body1")}
            </p>
            <p className="text-base leading-relaxed text-site-body">
              {t("example.body2")}
            </p>
          </div>
        </div>
      </section>

      <section data-testid="pricing-included" className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {t("included.heading")}
          </h2>
          <ul className="max-w-3xl space-y-3">
            {includedBullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-3 rounded-2xl border border-site-border bg-white p-5 text-base leading-relaxed text-site-body shadow-panel"
              >
                <Check
                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800"
                  aria-hidden="true"
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section data-testid="pricing-books" className="bg-site-page py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {t("books.heading")}
          </h2>
          <p className="max-w-3xl text-base leading-relaxed text-site-body">
            {t("books.body")}
          </p>
        </div>
      </section>

      <section data-testid="pricing-which-subjects" className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {t("whichSubjects.heading")}
          </h2>
          <p className="max-w-3xl text-base leading-relaxed text-site-body">
            {t("whichSubjects.body")}
          </p>
        </div>
      </section>

      <section data-testid="pricing-family" className="bg-site-page py-20 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
            {t("family.heading")}
          </h2>
          <p className="mb-6 max-w-3xl text-base leading-relaxed text-site-body">
            {t("family.body")}
          </p>
          <div className="mb-8 inline-flex rounded-full border border-site-border bg-white px-6 py-3 text-lg font-semibold text-slate-900 shadow-panel">
            {t("priceFloor")}
          </div>
          <div>
            <Link href="/products/tutor-advantage" className={PRIMARY_CTA}>
              {t("family.button")}
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section data-testid="pricing-managed" className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <p className="mx-auto max-w-3xl text-center text-base leading-relaxed text-site-body">
            {t("managed.body")}
          </p>
        </div>
      </section>

      <FaqList
        testId="pricing-faq"
        heading={t("faq.heading")}
        items={faqItems}
      />

      <section data-testid="pricing-next-step" className="py-20 md:py-24">
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
