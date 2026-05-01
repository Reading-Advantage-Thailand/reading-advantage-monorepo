"use client";
import React, { useState } from "react";
import { Button } from "../ui/button";
import { Article } from "@/components/models/article-model";
import { toast } from "../ui/use-toast";

type Props = {
  story: Article;
  storyId: string;
  userId: string;
};

export default function StoriesAssignDialog({ story, storyId, userId }: Props) {
  const [show, setShow] = useState(false);

  const handleShow = () => {
    const storiesUri = `https://app.reading-advantage.com/en/student/stories/${storyId}`;
    navigator.clipboard
      .writeText(storiesUri)
      .then(() => {
        toast({
          title: "Link copied to clipboard",
          description: "successfully copied to clipboard",
        });
        setShow(true);
      })
      .catch(() => {
        toast({
          title: "Link not copied to clipboard",
          description: "could not be copied to clipboard",
        });
      });
  };

  return <Button onClick={handleShow}>Copy Link</Button>;
}
