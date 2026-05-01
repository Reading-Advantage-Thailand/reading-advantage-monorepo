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
import { useClassroomStore } from "@/store/classroom-store";

interface DeleteClassProps {
  classroomData: Classes;
}

type Classes = {
  classroomName: string;
  grade: string;
  id: string;
};

function DeleteClass({ classroomData }: DeleteClassProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { classrooms, setClassrooms } = useClassroomStore();

  const t = useScopedI18n("components.myClasses.delete");

  const handleDeleteClass = async (classroomId: string) => {
    setOpen(true);
    try {
      const res = await fetch(`/api/v1/classroom/${classroomId}`, {
        method: "DELETE",
      });
      if (res.status === 200) {
        toast({
          title: t("toast.successDelete"),
          description: t("toast.successDeleteDescription"),
          variant: "default",
        });
        const newClassrooms = classrooms.filter(
          (classroom) => classroom.id !== classroomId
        );
        setClassrooms(newClassrooms);
      } else {
        toast({
          title: t("toast.errorDelete"),
          description: t("toast.errorDeleteDescription"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: t("toast.errorDelete"),
        description: t("toast.errorDeleteDescription"),
        variant: "destructive",
      });
    } finally {
      router.refresh();
      setOpen(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };
  return (
    <div>
      <div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Icons.delete
              className="h-4 w-4 cursor-pointer"
              aria-label="delete class"
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
                variant="destructive"
                onClick={() => handleDeleteClass(classroomData.id)}
              >
                {t("delete")}
              </Button>
              <Button onClick={handleClose}>{t("cancel")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default DeleteClass;
