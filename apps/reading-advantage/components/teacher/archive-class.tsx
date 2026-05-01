import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { toast } from "../ui/use-toast";
import { useRouter } from "next/navigation";
import { useScopedI18n } from "@/locales/client";

interface ArchiveClassProps {
  classroomData: Classes;
}

type Classes = {
  classroomName: string;
  grade: string;
  id: string;
};

function ArchiveClass({ classroomData }: ArchiveClassProps) {
  const [open, setOpen] = useState(false);

  const router = useRouter();
  const t = useScopedI18n("components.myClasses.archieve");

  const handleArchiveClass = async (classroomId: string) => {
    setOpen(true);
    try {
      const res = await fetch(`/api/v1/classroom/${classroomId}/achived`, {
        method: "PATCH",
        body: JSON.stringify({ archived: true }),
      });

      if (res.status === 200) {
        toast({
          title: t("toast.successArchive"),
          description: t("toast.successArchiveDescription"),
          variant: "default",
        });
        router.refresh();
      } else {
        throw new Error("Failed to archive class");
      }
    } catch (error) {
      console.error(error);
      toast({
        title: t("toast.errorArchive"),
        description: t("toast.errorArchiveDescription"),
        variant: "destructive",
      });
    }
    setOpen(false);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div>
      <div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Icons.archive
              className="h-4 w-4 cursor-pointer"
              aria-label="archive class"
            />
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("title")}</DialogTitle>
            </DialogHeader>
            <DialogDescription>
              {t("descriptionBefore")}
              <span className="font-bold">{classroomData.classroomName}</span>
              {t("descriptionAfter")}
            </DialogDescription>
            <DialogFooter>
              <Button
                variant="secondary"
                onClick={() => handleArchiveClass(classroomData.id)}
              >
                {t("archive")}
              </Button>
              <Button onClick={handleClose}>{t("cancel")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default ArchiveClass;
