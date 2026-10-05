"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import { STARTER_SETS, TINT_SLOTS, type TintSlot } from "@reading-advantage/avatar-kit";
import type { AvatarClassId, AvatarProfile, AvatarTints } from "@reading-advantage/game-contracts";
import { setAvatarProfileAction } from "@/actions/avatar";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AvatarPortrait } from "./portrait-canvas";
import { TINT_OPTIONS, swatchColor } from "./colors";

/** A 48 px card or button of the picker. */
const CHOICE = "focus-visible:ring-ring flex min-h-12 items-center justify-center rounded-2xl border-2 bg-card text-card-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

/**
 * The avatar picker (FR-10a): 15 class cards with portraits, then the colors with a live preview.
 * @param props.initial The saved avatar, when the student changes it.
 * @param props.returnTo Where to go after saving or skipping.
 * @returns The two-step picker.
 */
export function AvatarPicker({ initial, returnTo = "/student/home" }: { initial: AvatarProfile | null; returnTo?: string }) {
  const t = useTranslations("Avatar");
  const router = useRouter();
  const [classId, setClassId] = useState<AvatarClassId | null>(initial?.classId ?? null);
  const [tints, setTints] = useState<AvatarTints | null>(initial?.tints ?? null);
  const [step, setStep] = useState<"class" | "colors">(initial ? "colors" : "class");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pick = (id: AvatarClassId) => {
    const set = STARTER_SETS.find((s) => s.id === id)!;
    setClassId(id);
    setTints(set.tints as AvatarTints);
    setStep("colors");
  };
  const save = () => {
    if (!classId || !tints) return;
    setError(null);
    start(async () => {
      const result = await setAvatarProfileAction({ classId, tints });
      if (result.success) router.push(returnTo);
      else setError(t("error"));
    });
  };

  if (step === "class" || !classId || !tints) {
    return (
      <section aria-labelledby="avatar-class" className="flex flex-col gap-4">
        <h2 id="avatar-class" className="text-xl font-bold">
          {t("stepClass")}
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {STARTER_SETS.map((set) => (
            <li key={set.id}>
              <button
                type="button"
                onClick={() => pick(set.id as AvatarClassId)}
                aria-pressed={classId === set.id}
                className={cn(CHOICE, "h-full w-full flex-col gap-2 p-3 hover:border-primary", classId === set.id ? "border-primary" : "border-transparent")}
              >
                <AvatarPortrait classId={set.id} alt="" className="max-w-40" />
                <span className="text-base font-semibold">{t(`classes.${set.id}`)}</span>
              </button>
            </li>
          ))}
        </ul>
        <Link href={returnTo} className="text-muted-foreground hover:text-foreground inline-flex min-h-12 w-fit items-center text-base font-medium underline">
          {t("skip")}
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="avatar-colors" className="flex flex-col gap-4">
      <button type="button" onClick={() => setStep("class")} className="text-muted-foreground hover:text-foreground inline-flex min-h-12 w-fit items-center gap-2 text-sm font-medium [&>svg]:size-4">
        <ArrowLeftIcon aria-hidden="true" />
        {t("back")}
      </button>
      <h2 id="avatar-colors" className="text-xl font-bold">
        {t("stepColors", { class: t(`classes.${classId}`) })}
      </h2>
      <div className="grid gap-6 md:grid-cols-[16rem_1fr]">
        <figure className="flex flex-col items-center gap-2">
          <AvatarPortrait classId={classId} tints={tints} alt={t("preview")} className="max-w-64 rounded-2xl" />
          <figcaption className="text-muted-foreground text-sm">{t("preview")}</figcaption>
        </figure>
        <div className="flex flex-col gap-5">
          {TINT_SLOTS.map((slot) => (
            <fieldset key={slot} className="flex flex-col gap-2">
              <legend className="text-base font-semibold">{t(`slots.${slot}`)}</legend>
              <div role="radiogroup" aria-label={t(`slots.${slot}`)} className="flex flex-wrap gap-2">
                {TINT_OPTIONS[slot].map((option) => {
                  const selected = tints[slot] === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={t(`options.${slot}.${option}`)}
                      onClick={() => setTints({ ...tints, [slot]: option } as AvatarTints)}
                      className={cn(CHOICE, "size-12", selected ? "border-foreground" : "border-transparent")}
                      style={{ backgroundColor: swatchColor(slot as TintSlot, option) }}
                    >
                      {selected ? <CheckIcon aria-hidden="true" className="size-6 text-white drop-shadow" /> : null}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={save} disabled={pending} className="min-h-12 rounded-xl px-6 text-base">
              {pending ? t("saving") : t("save")}
            </Button>
            <Link href={returnTo} className="text-muted-foreground hover:text-foreground inline-flex min-h-12 items-center text-base font-medium underline">
              {t("skip")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
