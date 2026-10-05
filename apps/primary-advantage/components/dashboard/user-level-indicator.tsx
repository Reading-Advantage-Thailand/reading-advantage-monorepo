"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const GaugeChart = dynamic(() => import("react-gauge-component"), {
  ssr: false,
});

/** The CEFR levels on the gauge, lowest first. Every level has a text in `Reports.level.description`. */
export const CEFR_GAUGE_LEVELS = [
  "A0-",
  "A0",
  "A0+",
  "A1-",
  "A1",
  "A1+",
  "A2-",
  "A2",
  "A2+",
  "B1-",
  "B1",
  "B1+",
  "B2-",
  "B2",
  "B2+",
  "C1-",
  "C1",
  "C1+",
  "C2",
] as const;

/** Gauge arc colors: brand green from light (start) to dark (top level). */
const GAUGE_COLORS = ["#bbf7d2", "#047d36"];

/**
 * The student's CEFR level on a gauge, with a text about what the student can do at that level.
 * A level without a text (not on the gauge) shows the level only.
 * @param props.currentLevel The CEFR level, for example "A1-".
 * @returns The level card.
 */
export default function CEFRLevels({ currentLevel }: { currentLevel: string }) {
  const td = useTranslations("Reports.level.description");
  const t = useTranslations("Reports.level");
  const position = Math.max(0, CEFR_GAUGE_LEVELS.indexOf(currentLevel as (typeof CEFR_GAUGE_LEVELS)[number]));

  return (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle className="text-muted-foreground">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="mx-auto flex w-full max-w-md flex-col items-center">
        <GaugeChart
          value={(position / CEFR_GAUGE_LEVELS.length) * 100}
          minValue={0}
          maxValue={100}
          type="semicircle"
          arc={{
            colorArray: GAUGE_COLORS,
            padding: 0.02,
            width: 0.3,
            nbSubArcs: CEFR_GAUGE_LEVELS.length,
            cornerRadius: 10,
          }}
          pointer={{
            type: "needle",
            length: 0.6,
            animationDelay: 0,
          }}
          labels={{
            valueLabel: {
              hide: true,
            },
            tickLabels: {
              hideMinMax: true,
            },
          }}
        />

        <div className="text-center text-xl font-bold">
          {t("yourlevel")} : {currentLevel}
        </div>
        {td.has(currentLevel) ? <p className="mt-2 text-center">{td(currentLevel)}</p> : null}
      </CardContent>
    </Card>
  );
}
