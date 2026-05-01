"use client";
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Article } from "@/components/models/article-model";
import { toast } from "./ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useScopedI18n } from "@/locales/client";
import { useRouter } from "next/navigation";

type Props = {
  story: Article;
  storyId: string;
};

export default function StoriesActions({ story, storyId }: Props) {
  const [open, setOpen] = useState(false);
  const t = useScopedI18n("components.article");
  const router = useRouter();

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleDelete = async (storyId: string) => {
    //console.log(`Deleted article with ID: ${storyId}`);
    try {
      await fetch(`/api/v1/stories/${storyId}`, { method: "DELETE" });
      setOpen(false);
      toast({
        title: "Article Deleted",
        description: `The article with title: ${story.title} has been deleted`,
      });
      router.push(`/student/stories`);
    } catch (error) {
      console.error(`Failed to delete article with ID: ${storyId}`, error);
      toast({
        title: "Error",
        description: `Failed to delete article with title: ${story.title}`,
        variant: "destructive",
      });
    }
  };

  const handleApprove = (storyId: string) => {
    //console.log(`Approved article with ID: ${storyId}`);
    toast({
      title: "Article Approved",
      description: "The  article has been approved",
    });
  };

  return (
    <>
      <Button
        onClick={() => {
          handleOpen();
        }}
      >
        {t("deleteButton")}
      </Button>
      <Button onClick={() => handleApprove(storyId)}>
        {t("appoveButton")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete article &quot;{story.title}&quot;</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Are you sure you want to delete this article?
          </DialogDescription>
          <DialogFooter>
            <Button variant="destructive" onClick={() => handleDelete(storyId)}>
              Delete
            </Button>
            <Button onClick={handleClose}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
