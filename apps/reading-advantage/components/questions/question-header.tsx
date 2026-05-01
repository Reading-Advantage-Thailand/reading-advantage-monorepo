"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Icons } from "../icons";
import { toast } from "../ui/use-toast";

type Props = {
  children: React.ReactNode;
  heading: string;
  description: string;
  buttonLabel: string;
  className?: string;
  disabled?: boolean;
  userId: string;
  articleId: string;
  isLocked?: boolean;
  activityType?: string;
};

export default function QuestionHeader({
  children,
  heading,
  description,
  buttonLabel,
  userId,
  articleId,
  disabled = true,
  isLocked = false,
  activityType,
}: Props) {
  const [isButtonClicked, setIsButtonClicked] = React.useState<boolean>(false);

  async function onButtonClick() {
    if (isLocked) {
      toast({
        title: "🔒 Premium Feature",
        description:
          "This is a premium feature! Please contact your school to unlock this exciting content.",
        variant: "default",
      });
      return;
    }

    setIsButtonClicked(true);

    if (activityType) {
      fetch(`/api/v1/users/${userId}/activitylog`, {
        method: "POST",
        body: JSON.stringify({
          activityType,
          articleId,
        }),
      });
    }
  }
  return isButtonClicked ? (
    <>{children}</>
  ) : (
    <div className="w-full">
      <CardHeader>
        <CardTitle className="font-bold text-3xl md:text-3xl">
          {heading}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onButtonClick}
          disabled={disabled}
          className={isLocked ? "relative" : ""}
        >
          {isLocked && <Icons.lock className="mr-2 h-4 w-4" />}
          {buttonLabel}
        </Button>
      </CardContent>
    </div>
  );
}
