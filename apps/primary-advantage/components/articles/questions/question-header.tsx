"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from "react";

type Props = {
  children: React.ReactNode;
  heading: string;
  description: string;
  buttonLabel: string;
  className?: string;
  disabled?: boolean;
  userId?: string;
  articleId?: string;
};

type ActivityType = {
  [key: string]: string;
};

export default function QuestionHeader({
  children,
  heading,
  description,
  buttonLabel,
  disabled = true,
}: Props) {
  const [isButtonClicked, setIsButtonClicked] = React.useState<boolean>(false);
  async function onButtonClick() {
    setIsButtonClicked(true);
    //   const activityTypes: ActivityType = {
    //     "Practice Writing": "la_question",
    //     "Start Quiz": "mc_question",
    //     "Start Writing": "sa_question",
    //   };

    //   const activityType = activityTypes[buttonLabel as keyof ActivityType];

    // if (activityType) {
    //   fetch(`/api/users/${userId}/activitylog`, {
    //     method: "POST",
    //     body: JSON.stringify({
    //       activityType,
    //       articleId,
    //     }),
    //   });
  }
  return isButtonClicked ? (
    <>{children}</>
  ) : (
    <>
      <CardHeader>
        <CardTitle className="text-3xl font-bold md:text-3xl">
          {heading}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onButtonClick} disabled={disabled}>
          {buttonLabel}
        </Button>
      </CardContent>
    </>
  );
}
