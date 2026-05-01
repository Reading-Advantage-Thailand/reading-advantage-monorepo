"use client";
import { useScopedI18n } from "@/locales/client";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Confetti from "react-confetti";
import React from "react";
import { levelCalculation } from "@/lib/utils";

function ProgressBar({ progress, level }: { progress: number; level: number }) {
  const t = useScopedI18n("components.progressBarXp");
  const [isOpen, setIsOpen] = useState(false);
  const [previousLevel, setPreviousLevel] = useState(level);
  const levelCalResult = levelCalculation(progress);

  const closeDialog = () => {
    setIsOpen(false);
  };

  const levels = [
    { min: 0, max: 4999, cefrLevel: "A0-", raLevel: 0 },
    { min: 5000, max: 10999, cefrLevel: "A0", raLevel: 1 },
    { min: 11000, max: 17999, cefrLevel: "A0+", raLevel: 2 },
    { min: 18000, max: 25999, cefrLevel: "A1", raLevel: 3 },
    { min: 26000, max: 34999, cefrLevel: "A1+", raLevel: 4 },
    { min: 35000, max: 44999, cefrLevel: "A2-", raLevel: 5 },
    { min: 45000, max: 55999, cefrLevel: "A2", raLevel: 6 },
    { min: 56000, max: 67999, cefrLevel: "A2+", raLevel: 7 },
    { min: 68000, max: 80999, cefrLevel: "B1-", raLevel: 8 },
    { min: 81000, max: 94999, cefrLevel: "B1", raLevel: 9 },
    { min: 95000, max: 109999, cefrLevel: "B1+", raLevel: 10 },
    { min: 110000, max: 125999, cefrLevel: "B2-", raLevel: 11 },
    { min: 126000, max: 142999, cefrLevel: "B2", raLevel: 12 },
    { min: 143000, max: 160999, cefrLevel: "B2+", raLevel: 13 },
    { min: 161000, max: 179999, cefrLevel: "C1-", raLevel: 14 },
    { min: 180000, max: 199999, cefrLevel: "C1", raLevel: 15 },
    { min: 200000, max: 220999, cefrLevel: "C1+", raLevel: 16 },
    { min: 221000, max: 242999, cefrLevel: "C2-", raLevel: 17 },
    { min: 243000, max: 243000, cefrLevel: "C2", raLevel: 18 },
  ];

  let percentage = 0;

  for (let level of levels) {
    if (progress >= level.min && progress <= level.max) {
      const range = level.max - level.min;
      const progressInlevel = progress - level.min;
      percentage = (progressInlevel * 100) / range;
    }
  }

  const xp = [
    4999, 10999, 17999, 25999, 34999, 44999, 55999, 67999, 80999, 94999, 109999,
    125999, 142999, 160999, 179999, 199999, 220999, 242999,
  ];

  let maxProgress = xp.find((xp) => progress <= xp);

  if (!maxProgress) {
    maxProgress = progress;
  }

  useEffect(() => {
    // Check if user has actually leveled up (current level is higher than the stored previous level)
    if (level > previousLevel && percentage > 0 && percentage <= 15) {
      // percentage <= 15, 15 is based on max userXpEarned in activity, will be changed later with variable
      setIsOpen(true);
      setPreviousLevel(level); // Update the previous level to current level
    } else if (level !== previousLevel) {
      // Update previous level without showing dialog (for initial load or level down scenarios)
      setPreviousLevel(level);
    }
  }, [level, percentage, previousLevel]);

  return (
    <>
      <style>
        {`
          @keyframes progress-bar-animation {
            from{
              width: 0%;
            }
            to {
              width: ${percentage}%;
            }
          }
        `}
      </style>
      <div id="onborda-xp" className="gap-2 justify-center w-[50%] flex">
        <p className="hidden md:block">{t("xp")}</p>
        <div className="w-[50%] bg-[#f3f3f3] rounded-xl hidden md:block h-5">
          <div
            className="w-full animated-pulse rounded-x bg-blue-500 h-5 rounded-xl relative items-center flex"
            style={{
              animationName: "progress-bar-animation",
              animationDuration: "2s",
              animationTimingFunction: "ease-out",
              animationFillMode: "forwards",
            }}
          >
            <span
              className="text-white absolute left-2/4 transform translateX(-50%)"
              style={{
                color: percentage < 25 ? "black" : "white",
              }}
            >
              {progress}
            </span>
          </div>
        </div>
        <p>{t("level", { level })} </p>
      </div>
      {isOpen &&
        levelCalResult.cefrLevel !== "" &&
        level !== 0 &&
        progress >= 0 && (
          <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogContent>
                <Confetti className="absolute w-[500px] h-[200px]" />
                <DialogHeader>
                  <DialogTitle className="text-center font-bold text-transparent text-3xl bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 ">
                    {t("congratulations")} <br />
                    {t("upLevel")}
                  </DialogTitle>
                </DialogHeader>
                <DialogDescription className="text-center font-bold text-transparent text-3xl bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                  {t("level", { level })}
                </DialogDescription>
                <DialogFooter>
                  <Button onClick={closeDialog}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
    </>
  );
}

export default ProgressBar;
