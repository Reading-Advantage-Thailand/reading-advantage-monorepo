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
import { useScopedI18n } from "@/locales/client";

const GaugeChart = dynamic(() => import("react-gauge-chart"), { ssr: false });

interface Cefrlevel {
  currentLevel: string;
}

export default function CEFRLevels({ currentLevel }: Cefrlevel) {
  const td: string | any = useScopedI18n(
    "pages.student.reportpage.cefr.description"
  );
  const t = useScopedI18n("pages.student.reportpage.cefr");
  const levels = [
    "A0-",
    "A0",
    "A0+",
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
    "C2-",
    "C2",
  ];

  return (
    <Card className="md:col-span-1">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="w-full max-w-md mx-auto flex flex-col items-center">
        <GaugeChart
          id="gauge-chart"
          nrOfLevels={levels.length}
          percent={levels.indexOf(currentLevel) / 18}
          arcWidth={0.3}
          cornerRadius={8}
          hideText={true}
        />

        <div className="text-center text-xl font-bold">
          {t("yourlevel")} : {currentLevel}
        </div>
        <div className="mt-2">{td(currentLevel)}</div>
      </CardContent>
    </Card>
  );
}
