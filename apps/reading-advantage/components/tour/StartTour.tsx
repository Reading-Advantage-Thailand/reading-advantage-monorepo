"use client";
import React from "react";
import { useOnborda } from "onborda";
import { Button } from "../ui/button";
import { BookOpen, Sparkles } from "lucide-react";

function StartTour() {
  const { startOnborda } = useOnborda();
  const handleStartOnborda = (type: string) => {
    if (type === "desktop") {
      startOnborda("desktop");
    } else if (type === "mobile") {
      startOnborda("mobile");
    }
  };
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <Button
        className="sm:hidden"
        size="lg"
        onClick={() => handleStartOnborda("mobile")}
      >
        <Sparkles size={16} className="mr-2" /> Start the tour 1
      </Button>
      <div className="hidden sm:flex">
        <Button size="lg" onClick={() => handleStartOnborda("desktop")}>
          <Sparkles size={16} className="mr-2" /> Start the tour
        </Button>
      </div>
    </div>
  );
}

export default StartTour;
