import React from "react";
import { Progress } from "./ui/progress";
import { LEVELS_XP } from "@/lib/utils";

export default function ProgressBar({
  currentXP,
  currentLevel,
}: {
  currentXP: number;
  currentLevel: number;
}) {
  const nextLevelXP =
    LEVELS_XP.find((level) => level.min <= currentXP)?.max || 0;
  const progressValue = (currentXP / nextLevelXP) * 100;

  return (
    <>
      <div className="flex w-1/2 items-center space-x-2 lg:w-1/3">
        <span className="font-bold text-cyan-500">RA. {currentLevel}</span>
        <div className="relative w-full flex-1">
          <Progress value={progressValue} className="h-4" />
          <p className="text-muted-foreground pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold">
            {currentXP} / {nextLevelXP} XP
          </p>
        </div>
      </div>
    </>
  );
}
