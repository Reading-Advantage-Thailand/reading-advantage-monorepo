import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Code2,
  GitPullRequest,
  GraduationCap,
  LayoutDashboard,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { getScopedI18n } from "@/locales/server";

/** Metadata describing the live Codecamp Advantage product page. */
export const metadata: Metadata = {
  title: "Codecamp Advantage | Full-Stack Internship with Mastery Advantage",
  description:
    "Explore the live 20-module Codecamp Advantage internship—the first Advantage app to implement Mastery Advantage end to end.",
  openGraph: {
    title: "Codecamp Advantage | Mastery-Driven Full-Stack Internship",
    description:
      "A live 20-module, 106-lesson development pathway with verified mastery evidence, targeted tutoring, and production projects.",
  },
};

const PHASES = [
  { key: "A", moduleCount: 6 },
  { key: "B", moduleCount: 4 },
  { key: "C", moduleCount: 3 },
  { key: "D", moduleCount: 7 },
] as const;

const MASTERY_STEPS = [
  "objectives",
  "evidence",
  "confidence",
  "review",
] as const;
const PEDAGOGY_STEPS = ["iDo", "weDo", "youDo"] as const;

/**
 * Renders the production-aligned Codecamp Advantage marketing page.
 * @param params Promise containing the active site locale.
 * @returns The localized Codecamp Advantage page.
 */
export default async function CodecampAdvantage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, t] = await Promise.all([
    params,
    getScopedI18n("pages.products.codecampAdvantage"),
  ]);
  const appLocale = locale === "th" ? "th" : "en";
  const liveHref = `https://codecamp.reading-advantage.com/${appLocale}`;

  return (
    <main className="overflow-x-hidden bg-[#f6f2e9] text-slate-950">
      <section className="relative isolate overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(251,191,36,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(251,191,36,0.07)_1px,transparent_1px)] bg-[size:42px_42px]" />
        <div className="absolute -right-24 top-0 h-96 w-96 rounded-full bg-amber-500/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              {t("hero.badge")}
            </div>
            <p className="mb-4 font-mono text-sm uppercase tracking-[0.28em] text-amber-400">
              {t("hero.eyebrow")}
            </p>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              {t("hero.title")}
            </h1>
            <p className="mt-7 max-w-2xl text-xl font-semibold text-slate-200 sm:text-2xl">
              {t("hero.subtitle")}
            </p>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
              {t("hero.description")}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                data-testid="codecamp-live-cta"
                href={liveHref}
                className="inline-flex items-center justify-center gap-2 bg-amber-400 px-7 py-4 font-bold text-slate-950 transition hover:bg-amber-300"
              >
                {t("hero.primaryCta")}
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href="#curriculum"
                className="inline-flex items-center justify-center gap-2 border border-slate-600 px-7 py-4 font-bold text-white transition hover:border-slate-300 hover:bg-white/5"
              >
                {t("hero.secondaryCta")}
                <ChevronRight className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 border border-amber-400/15" />
            <div className="relative overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-slate-400">
                <span>{t("hero.previewLabel")}</span>
                <span className="text-emerald-400">{t("hero.status")}</span>
              </div>
              <Image
                src="/images/codecamp/dashboard-20260715.png"
                alt={t("hero.dashboardAlt")}
                width={1440}
                height={900}
                className="h-auto w-full"
                priority
              />
            </div>
          </div>
        </div>

        <div className="relative border-t border-slate-800 bg-slate-900/80">
          <div className="mx-auto grid max-w-7xl grid-cols-3 divide-x divide-slate-800 px-5 sm:px-8">
            {(["phases", "modules", "lessons"] as const).map((stat) => (
              <div
                data-testid="proof-point"
                key={stat}
                className="py-6 text-center sm:py-8"
              >
                <div className="font-mono text-3xl font-black text-amber-400 sm:text-5xl">
                  {t(`hero.stats.${stat}.value`)}
                </div>
                <div className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-400 sm:text-sm">
                  {t(`hero.stats.${stat}.label`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        data-testid="mastery-evidence"
        className="border-b border-stone-300 bg-amber-400"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center bg-slate-950 text-amber-400">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-slate-700">
                {t("mastery.eyebrow")}
              </p>
              <h2 className="mt-4 text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl">
                {t("mastery.heading")}
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-800">
                {t("mastery.description")}
              </p>
            </div>
            <ol className="grid gap-px bg-slate-950/20 sm:grid-cols-2">
              {MASTERY_STEPS.map((step, index) => (
                <li key={step} className="bg-[#f7cc48] p-7">
                  <span className="font-mono text-xs font-bold text-slate-600">
                    0{index + 1}
                  </span>
                  <h3 className="mt-4 text-xl font-black">
                    {t(`mastery.steps.${step}.title`)}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-700">
                    {t(`mastery.steps.${step}.description`)}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        id="curriculum"
        data-testid="codecamp-curriculum"
        className="py-20 sm:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-amber-700">
              {t("curriculum.eyebrow")}
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              {t("curriculum.heading")}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              {t("curriculum.description")}
            </p>
            <p className="mt-5 border-l-4 border-amber-400 bg-amber-50 px-5 py-4 text-sm leading-6 text-slate-700">
              {t("curriculum.cohortNote")}
            </p>
          </div>

          <div className="mt-12 grid border-l border-t border-stone-300 md:grid-cols-2 xl:grid-cols-4">
            {PHASES.map((phase) => (
              <article
                key={phase.key}
                className="border-b border-r border-stone-300 bg-white p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-amber-700">
                    {t(`curriculum.phases.${phase.key}.name`)}
                  </span>
                  <span className="font-mono text-xs text-slate-500">
                    {phase.moduleCount} {t("curriculum.moduleLabel")}
                  </span>
                </div>
                <h3 className="mt-4 text-2xl font-black">
                  {t(`curriculum.phases.${phase.key}.title`)}
                </h3>
                <p className="mt-3 min-h-14 text-sm leading-6 text-slate-600">
                  {t(`curriculum.phases.${phase.key}.description`)}
                </p>
                <ol className="mt-6 space-y-3 border-t border-stone-200 pt-5">
                  {Array.from({ length: phase.moduleCount }, (_, index) => {
                    const module = t(
                      `curriculum.phases.${phase.key}.modules.${index}`,
                    );
                    return (
                      <li
                        key={module}
                        className="flex gap-3 text-sm leading-5 text-slate-700"
                      >
                        <span className="font-mono text-amber-700">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {module}
                      </li>
                    );
                  })}
                </ol>
              </article>
            ))}
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <article
              data-testid="measure-module"
              className="overflow-hidden bg-slate-950 text-white"
            >
              <div className="p-8 sm:p-10">
                <div className="flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                  <Target className="h-5 w-5" />
                  {t("curriculum.spotlights.measure.label")}
                </div>
                <h3 className="mt-5 text-3xl font-black">
                  {t("curriculum.spotlights.measure.title")}
                </h3>
                <p className="mt-4 leading-7 text-slate-300">
                  {t("curriculum.spotlights.measure.description")}
                </p>
              </div>
              <Image
                src="/images/codecamp/measure-lesson-20260715.png"
                alt={t("curriculum.spotlights.measure.alt")}
                width={1440}
                height={900}
                className="h-auto w-full border-t border-slate-700"
              />
            </article>
            <article
              data-testid="apk-unit"
              className="flex flex-col justify-between border-2 border-slate-950 bg-white p-8 sm:p-10"
            >
              <div>
                <div className="flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                  <Code2 className="h-5 w-5" />
                  {t("curriculum.spotlights.apk.label")}
                </div>
                <h3 className="mt-5 text-3xl font-black">
                  {t("curriculum.spotlights.apk.title")}
                </h3>
                <p className="mt-4 text-lg leading-8 text-slate-600">
                  {t("curriculum.spotlights.apk.description")}
                </p>
              </div>
              <div className="mt-12 border-l-4 border-amber-400 bg-amber-50 p-5 font-mono text-sm leading-6 text-slate-700">
                {t("curriculum.spotlights.apk.outcome")}
              </div>
            </article>
          </div>

          <div
            data-testid="tech-stack"
            className="mt-12 border border-slate-800 bg-slate-950 p-8 text-white sm:p-10"
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
              {t("toolchain.eyebrow")}
            </p>
            <div className="mt-4 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <h3 className="text-3xl font-black">
                  {t("toolchain.heading")}
                </h3>
                <p className="mt-3 leading-7 text-slate-400">
                  {t("toolchain.description")}
                </p>
              </div>
              <ul className="flex flex-wrap gap-2 lg:justify-end">
                {Array.from({ length: 8 }, (_, index) => {
                  const tool = t(`toolchain.items.${index}`);
                  return (
                    <li
                      key={tool}
                      className="border border-slate-700 px-3 py-2 font-mono text-sm text-slate-200"
                    >
                      {tool}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <GraduationCap className="h-12 w-12 text-amber-600" />
              <h2 className="mt-6 text-4xl font-black tracking-[-0.04em]">
                {t("pedagogy.heading")}
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                {t("pedagogy.description")}
              </p>
            </div>
            <div className="divide-y divide-stone-200 border-y border-stone-200">
              {PEDAGOGY_STEPS.map((step, index) => (
                <div
                  key={step}
                  className="grid grid-cols-[52px_1fr] gap-5 py-7"
                >
                  <span className="flex h-11 w-11 items-center justify-center bg-slate-950 font-mono font-bold text-amber-400">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-xl font-black">
                      {t(`pedagogy.steps.${step}.title`)}
                    </h3>
                    <p className="mt-2 leading-7 text-slate-600">
                      {t(`pedagogy.steps.${step}.description`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <article
              data-testid="targeted-tutor"
              className="border border-slate-700 p-8 sm:p-10"
            >
              <Bot className="h-10 w-10 text-amber-400" />
              <p className="mt-8 font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                {t("evidence.tutor.label")}
              </p>
              <h2 className="mt-3 text-3xl font-black">
                {t("evidence.tutor.title")}
              </h2>
              <p className="mt-5 leading-7 text-slate-300">
                {t("evidence.tutor.description")}
              </p>
            </article>
            <article
              data-testid="advisory-pr-review"
              className="border border-slate-700 p-8 sm:p-10"
            >
              <GitPullRequest className="h-10 w-10 text-amber-400" />
              <p className="mt-8 font-mono text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                {t("evidence.prReview.label")}
              </p>
              <h2 className="mt-3 text-3xl font-black">
                {t("evidence.prReview.title")}
              </h2>
              <p className="mt-5 leading-7 text-slate-300">
                {t("evidence.prReview.description")}
              </p>
              <div className="mt-6 flex gap-3 border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                {t("evidence.prReview.guardrail")}
              </div>
            </article>
          </div>

          <div className="mt-6 grid gap-px bg-slate-700 sm:grid-cols-3">
            {(["ledger", "scaffolds", "followUp"] as const).map((item) => {
              const icons = {
                ledger: LayoutDashboard,
                scaffolds: Check,
                followUp: RefreshCw,
              };
              const Icon = icons[item];
              return (
                <div key={item} className="bg-slate-900 p-6">
                  <Icon className="h-6 w-6 text-amber-400" />
                  <h3 className="mt-4 font-bold">
                    {t(`evidence.signals.${item}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {t(`evidence.signals.${item}.description`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-amber-400 py-20">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 sm:px-8 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-slate-700">
              {t("cta.eyebrow")}
            </p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              {t("cta.heading")}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-800">
              {t("cta.description")}
            </p>
          </div>
          <a
            href={liveHref}
            className="inline-flex shrink-0 items-center gap-2 bg-slate-950 px-8 py-4 font-bold text-white transition hover:bg-slate-800"
          >
            {t("cta.button")}
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>
    </main>
  );
}
