"use client";
import React, { useState } from "react";
import { Article } from "@/components/models/article-model";
import { toast } from "../ui/use-toast";
import CopyKeyButton from "@/components/copy-key-button";

type Props = {
  story: Article;
  storyId: string;
  userId: string;
};

export default function StoriesAssignDialog({ story, storyId, userId }: Props) {
  const [show, setShow] = useState(false);

  const handleCopied = () => {
    toast({
      title: "Link copied to clipboard",
      description: "successfully copied to clipboard",
    });
    setShow(true);
  };

  const handleCopyError = () => {
    toast({
      title: "Link not copied to clipboard",
      description: "could not be copied to clipboard",
    });
  };

  return (
    <CopyKeyButton
      copyText={`https://app.reading-advantage.com/en/student/stories/${storyId}`}
      onCopied={handleCopied}
      onError={handleCopyError}
    >
      Copy Link
    </CopyKeyButton>
  );
}
