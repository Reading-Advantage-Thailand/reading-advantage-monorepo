"use client";

import { retakeQuiz } from "@/actions/question";
import { Button } from "@/components/ui/button";
import { ActivityType } from "@/types/enum";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function RetakeButton({
  articleId,
  type,
}: {
  articleId: string;
  type: ActivityType;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const t = useTranslations("Components");

  const handleRetakeQuiz = async () => {
    await retakeQuiz(articleId, type);
    setIsOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size={"sm"} variant={"outline"}>
          {t("retakeButton")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("confirmRetake")}</DialogTitle>
          <DialogDescription>
            {t("areYouSureYouWantToRetakeThisQuiz")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t("cancelButton")}
          </Button>
          <Button onClick={handleRetakeQuiz}>{t("confirmRetake")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
