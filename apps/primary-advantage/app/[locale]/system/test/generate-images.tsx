"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { generateImages } from "@/actions/test";
import { useTransition } from "react";
import { toast } from "sonner";

export default function GenerateImages() {
  const [articleId, setArticleId] = useState("");
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <Input
        type="text"
        value={articleId}
        id="articleId"
        onChange={(e) => setArticleId(e.target.value)}
        placeholder="Enter article ID"
      />
      <Button
        disabled={isPending}
        onClick={async () => {
          startTransition(async () => {
            const result = await generateImages(articleId);
            if (result.success) {
              toast.success(result.message);
            } else {
              const message =
                "message" in result && result.message
                  ? result.message
                  : "error" in result && typeof result.error === "string"
                    ? result.error
                    : "Failed to generate images";
              toast.error(message);
            }
          });
        }}
      >
        Generate Images
      </Button>
    </div>
  );
}
