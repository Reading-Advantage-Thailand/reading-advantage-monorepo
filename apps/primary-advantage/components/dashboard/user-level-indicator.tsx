"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

const GaugeChart = dynamic(() => import("react-gauge-component"), {
  ssr: false,
});

interface Cefrlevel {
  currentLevel: string;
}

export default function CEFRLevels({ currentLevel }: Cefrlevel) {
  const td: string | any = useTranslations("Reports.level.description");
  const t = useTranslations("Reports.level");
  const levels = [
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
  ];

  return (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle className="text-muted-foreground">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="mx-auto flex w-full max-w-md flex-col items-center">
        <GaugeChart
          value={(levels.indexOf(currentLevel) / levels.length) * 100}
          minValue={0}
          maxValue={100}
          type="semicircle"
          arc={{
            colorArray: ["#5BE12C", "#EA4228"],
            padding: 0.02,
            width: 0.3,
            nbSubArcs: levels.length,
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
        <div className="mt-2">{td(currentLevel)}</div>
      </CardContent>
    </Card>
  );
}
