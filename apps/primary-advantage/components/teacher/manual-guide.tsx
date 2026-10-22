import Image from "next/image";
import { Fragment, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { TEACHER_ACTION, TEACHER_CARD } from "@/components/teacher/teacher-shell";
import { CLASS_SHEET_CASE, MANUAL_LABELS, MANUAL_SECTIONS, type ManualBlock, type ManualLink } from "@/lib/teacher-manual-guide";
import { MANUAL_FIGURES, type ManualFigure, type ManualFigureId } from "@/lib/teacher-manual-figures";
import { cn } from "@/lib/utils";

/** The LINE support contact of the print guide. */
const LINE_SUPPORT = "https://line.me/ti/p/Pf7_EF98Pv";
const NOTE = "rounded-md border bg-muted/40 p-3 text-sm";
const WARN = "rounded-md border border-amber-500/60 bg-amber-500/10 p-3 text-sm";

/**
 * A screen label in the manual text, in a box like the print guide.
 * @param props.children The label.
 * @returns The label.
 */
function UiLabel({ children }: { children?: ReactNode }) {
  return <span className="bg-muted rounded border px-1 py-0.5 font-medium box-decoration-clone">{children}</span>;
}

/**
 * A manual picture with its numbered marks, in the print style: a black stroke with a white outline
 * outside the control, and the number in a circle outside the top-right corner (or above the middle, or left).
 * @param props.id The picture.
 * @param props.caption What the picture shows; also its alternative text.
 * @param props.testData The note that the picture holds test data.
 * @returns The figure.
 */
function ManualPicture({ id, caption, testData }: { id: ManualFigureId; caption: string; testData: string }) {
  const figure: ManualFigure = MANUAL_FIGURES[id];
  return (
    <figure className="mt-4 max-w-2xl space-y-1 pr-4" data-figure={id}>
      {/* No clipping here: a mark's number circle sits outside the top-right corner of its box. */}
      <div className="relative">
        <Image src={figure.src} width={figure.width} height={figure.height} alt={caption} unoptimized className="h-auto w-full rounded-md border" />
        {figure.marks.map((mark, index) => (
          <span
            key={index}
            aria-hidden="true"
            data-mark={mark.n ?? ""}
            className="absolute rounded-sm shadow-[0_0_0_3px_black,0_0_0_5px_white]"
            style={{ left: `${mark.x}%`, top: `${mark.y}%`, width: `${mark.w}%`, height: `${mark.h}%` }}
          >
            {mark.n && (
              <span
                className={cn(
                  "absolute grid size-6 place-items-center rounded-full bg-black text-xs font-bold text-white shadow-[0_0_0_2px_white]",
                  mark.at === "top" ? "-top-4 left-1/2 -translate-x-1/2" : mark.at === "left" ? "top-1/2 -left-8 -translate-y-1/2" : "-top-4 -right-4",
                )}
              >
                {mark.n}
              </span>
            )}
          </span>
        ))}
      </div>
      <figcaption className="text-muted-foreground text-xs">
        {caption} · {testData}
      </figcaption>
    </figure>
  );
}

/**
 * The picture guide of the teacher manual (S5 request, PR draft v0.1 of 2026-10-20): a table of
 * contents and six sections with numbered steps, pictures with marks, notes, and link buttons.
 * Every screen label in the text comes from the live message key of that label.
 * The page awaits it, so the page renders in one pass.
 * @param classPath The class page of a teacher with one class; null sends class links to My classes.
 * @returns The table of contents and the sections.
 */
export async function renderManualGuide(classPath: string | null): Promise<ReactNode> {
  const [root, t, tb] = await Promise.all([getTranslations(), getTranslations("TeacherManual"), getTranslations("TeacherUi.classBook")]);
  const labels = Object.fromEntries(
    Object.entries(MANUAL_LABELS).map(([name, label]) => {
      const text = root(label.key as never, ("values" in label ? label.values : undefined) as never);
      return [name, "blank" in label ? text.replace(label.blank, "…") : text];
    }),
  );
  const rich = (key: string) => t.rich(key as never, { ...labels, ui: (chunks: ReactNode) => <UiLabel>{chunks}</UiLabel> } as never);
  const picture = (id: ManualFigureId) => <ManualPicture id={id} caption={t(`figures.${id}` as never)} testData={t("testData")} />;
  const href = (link: ManualLink) => ("page" in link ? link.page : classPath ? `${classPath}${link.classAnchor}` : "/teacher/my-classes");

  const block = (section: string, item: ManualBlock, index: number) => {
    switch (item.kind) {
      case "steps":
        return (
          <div key={index} className="space-y-2">
            {item.title && <h3 className="font-semibold">{t(`${section}.${item.title}` as never)}</h3>}
            {item.intro && <p className="text-sm">{rich(`${section}.${item.intro}`)}</p>}
            <ol start={item.start} className="list-decimal space-y-3 pl-6 marker:font-bold">
              {item.steps.map((step) => (
                <li key={step.key} className="pl-1">
                  {rich(`${section}.${step.key}`)}
                  {[step.figure ?? []].flat().map((id) => (
                    <Fragment key={id}>{picture(id)}</Fragment>
                  ))}
                </li>
              ))}
            </ol>
          </div>
        );
      case "note":
        return (
          <div key={index} className={item.tone === "warn" ? WARN : NOTE}>
            <p>{rich(`${section}.${item.key}`)}</p>
            {item.figure && picture(item.figure)}
          </div>
        );
      case "list":
        return (
          <div key={index} className={item.tone === "warn" ? WARN : NOTE}>
            <h3 className="font-semibold">{t(`${section}.${item.title}` as never)}</h3>
            <ul className={cn("mt-1 space-y-1", !item.plain && "list-disc pl-5")}>
              {item.keys.map((key) => (
                <li key={key}>{rich(`${section}.${key}`)}</li>
              ))}
            </ul>
            {item.figure && picture(item.figure)}
          </div>
        );
      case "classSheetCase":
        return (
          <div key={index} className="space-y-2" data-class-sheet-case={CLASS_SHEET_CASE}>
            {(["A", "B"] as const)
              .filter((which) => CLASS_SHEET_CASE === "both" || CLASS_SHEET_CASE === which)
              .map((which) => (
                <div key={which} className={NOTE}>
                  {CLASS_SHEET_CASE === "both" && <h3 className="font-semibold">{t(`${section}.version${which}Title` as never)}</h3>}
                  <p>{rich(`${section}.version${which}`)}</p>
                </div>
              ))}
          </div>
        );
    }
  };

  return (
    <>
      <nav aria-labelledby="manual-toc" className={TEACHER_CARD}>
        <h2 id="manual-toc" className="text-lg font-semibold">
          {t("tocTitle")}
        </h2>
        <ol className="space-y-1">
          {MANUAL_SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline">
                <span className="font-bold">{section.number}</span> {t(`${section.key}.title` as never)}
              </a>
            </li>
          ))}
          <li>
            <a href="#steps" className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline">
              {tb("manual.stepsTitle")}
            </a>
          </li>
        </ol>
        <p className="text-muted-foreground text-sm">
          {t.rich("help", {
            line: (chunks: ReactNode) => (
              <a href={LINE_SUPPORT} target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-4">
                {chunks}
              </a>
            ),
          })}
        </p>
      </nav>
      {MANUAL_SECTIONS.map((section) => (
        <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className={cn(TEACHER_CARD, "scroll-mt-24 gap-4")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 id={`${section.id}-title`} className="flex items-center gap-3 text-lg font-semibold">
              <span className="grid min-w-9 place-items-center rounded-md bg-black px-2 py-1 text-white">{section.number}</span>
              {t(`${section.key}.title` as never)}
            </h2>
            {section.link && (
              <Link href={href(section.link)} className={cn(buttonVariants({ variant: "outline" }), TEACHER_ACTION)}>
                {t("openPage")}
              </Link>
            )}
          </div>
          {section.lead && <p>{rich(`${section.key}.lead`)}</p>}
          {section.blocks.map((item, index) => block(section.key, item, index))}
        </section>
      ))}
    </>
  );
}
