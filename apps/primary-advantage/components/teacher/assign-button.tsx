"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AssignForm from "./assign-form";
import { toast } from "sonner";
import { ClipboardCheckIcon, Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "next-intl";

interface article {
  title: string;
  summary: string;
  id: string;
}

export default function AssignButton({ article }: { article: article }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const formId = "assign-form";
  const t = useTranslations("Assignment");
  const tComponents = useTranslations("Components");

  const onClose = () => {
    if (!isLoading) {
      setIsOpen(false);
    }
  };

  const onSave = () => {
    setIsOpen(false);
    toast.success("Assignment saved successfully!", {
      richColors: true,
    });
  };

  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <ClipboardCheckIcon />
          {tComponents("assignments")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[80vh] overflow-y-auto"
        closeButtonShow={false}
      >
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <div>
          <h3 className="text-lg font-semibold">{article.title}</h3>
          <p className="text-muted-foreground text-sm">{article.summary}</p>
        </div>
        <AssignForm
          onSave={onSave}
          articleId={article.id}
          formId={formId}
          onLoadingChange={handleLoadingChange}
        />
        <DialogFooter>
          <Button onClick={onClose} disabled={isLoading}>
            {tComponents("cancelButton")}
          </Button>
          <Button type="submit" form={formId} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {tComponents("waitingButton")}
              </>
            ) : (
              tComponents("submitButton")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
