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
const GAUGE_COLORS = ["#a5f3fc", "#0e7490"];

/**
 * The student's CEFR level on a gauge, with a text about what the student can do at that level.
 * A level without a text (not on the gauge) shows the level only. A teacher sees "Level: A1"
 * without the can-do text, because that text speaks to the student ("You can ...").
 * @param props.currentLevel The CEFR level, for example "A1-".
 * @param props.audience Who reads the card: the student (default) or a teacher.
 * @returns The level card.
 */
export default function CEFRLevels({
  currentLevel,
  audience = "student",
}: {
  currentLevel: string;
  audience?: "student" | "teacher";
}) {
  const td = useTranslations("Reports.level.description");
  const t = useTranslations("Reports.level");
  const tt = useTranslations("TeacherStudents");
  const position = Math.max(0, CEFR_GAUGE_LEVELS.indexOf(currentLevel as (typeof CEFR_GAUGE_LEVELS)[number]));

  return (
    <Card className="min-w-0 lg:col-span-1">
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
          {audience === "teacher" ? tt("studentLevel", { level: currentLevel }) : `${t("yourlevel")} : ${currentLevel}`}
        </div>
        {audience === "student" && td.has(currentLevel) ? <p className="mt-2 text-center">{td(currentLevel)}</p> : null}
      </CardContent>
    </Card>
  );
}
