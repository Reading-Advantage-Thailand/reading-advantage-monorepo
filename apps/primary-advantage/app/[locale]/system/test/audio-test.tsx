"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import React, { useState, useTransition } from "react";
import { generateAudios } from "@/actions/test";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import FlashcardGame from "@/components/flashcards/flashcard-game";
// import { FlashcardType } from "@/types/enum";

export default function AudioTest() {
  const [articleId, setArticleId] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const handleGenerateAudio = () => {
    startTransition(() => {
      generateAudios(articleId).then((res) => {
        if (res.success) {
          toast.success("Audio generated successfully");
        } else {
          toast.error("Failed to generate audio");
        }
      });
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Audio Regeneration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Input
            type="text"
            value={articleId}
            onChange={(e) => setArticleId(e.target.value)}
          />
          <Button disabled={isPending} onClick={() => handleGenerateAudio()}>
            Generate Audio
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
