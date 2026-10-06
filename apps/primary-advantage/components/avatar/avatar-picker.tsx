"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckIcon } from "lucide-react";
import { STARTER_SETS, TINT_SLOTS, type TintSlot } from "@reading-advantage/avatar-kit";
import type { AvatarClassId, AvatarProfile, AvatarTints } from "@reading-advantage/game-contracts";
import { setAvatarProfileAction } from "@/actions/avatar";
import { Link, useRouter } from "@/i18n/navigation";
import { Panel, RpgButton, Sign, rpgButton } from "@/components/rpg/chrome";
import { cn } from "@/lib/utils";
import { AvatarPortrait } from "./portrait-canvas";
import { TINT_OPTIONS, swatchColor } from "./colors";

/**
 * The avatar picker in the shrine (docs/primary-rpg-skin.md §4): the 15 heroes on pedestals, the
 * chosen one steps forward; then the colors as dye pots on the stone table with a live preview.
 * The hero is the 2D portrait; the 3D composer arrives with the games port.
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
        <h2 id="avatar-class" className="cq-on-scene text-xl font-bold">
          {t("stepClass")}
        </h2>
        <ul className="cq-pedestals">
          {STARTER_SETS.map((set) => (
            <li key={set.id}>
              <button type="button" onClick={() => pick(set.id as AvatarClassId)} aria-pressed={classId === set.id} className="cq-pedestal min-h-12">
                <AvatarPortrait classId={set.id} alt="" className="cq-shadowed" />
                <Sign small className="mb-1 text-sm">
                  {t(`classes.${set.id}`)}
                </Sign>
              </button>
            </li>
          ))}
        </ul>
        <Link href={returnTo} className={cn(rpgButton("iron"), "min-h-12 w-fit")}>
          {t("skip")}
        </Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="avatar-colors" className="flex flex-col gap-4">
      <h2 id="avatar-colors" className="cq-on-scene text-xl font-bold">
        {t("stepColors", { class: t(`classes.${classId}`) })}
      </h2>
      <Panel className="grid gap-6 md:grid-cols-[16rem_1fr]">
        <figure className="flex flex-col items-center gap-2">
          <div className="cq-beam w-56">
            <AvatarPortrait classId={classId} tints={tints} alt={t("preview")} className="cq-shadowed cq-bob" />
          </div>
          <figcaption className="cq-muted text-sm">{t("preview")}</figcaption>
        </figure>
        <div className="flex flex-col gap-5">
          {TINT_SLOTS.map((slot) => (
            <fieldset key={slot} className="flex flex-col gap-2">
              <legend className="mb-2">
                <Sign small>{t(`slots.${slot}`)}</Sign>
              </legend>
              <div role="radiogroup" aria-label={t(`slots.${slot}`)} className="flex flex-wrap gap-3">
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
                      className="cq-pot size-12"
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
            <p role="alert" className="text-destructive text-sm font-semibold">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <RpgButton tone="gold" onClick={save} disabled={pending} className="min-h-12 px-6">
              {pending ? t("saving") : t("save")}
            </RpgButton>
            <RpgButton tone="iron" onClick={() => setStep("class")} className="min-h-12">
              {t("back")}
            </RpgButton>
            <Link href={returnTo} className="cq-ink hover:text-foreground inline-flex min-h-12 items-center text-base font-medium underline">
              {t("skip")}
            </Link>
          </div>
        </div>
      </Panel>
    </section>
  );
}
