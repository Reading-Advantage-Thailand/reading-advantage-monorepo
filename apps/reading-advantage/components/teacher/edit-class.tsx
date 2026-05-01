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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

type Classes = {
  classroomName: string;
  classCode: string;
  grade: string;
  id: string;
};

interface EditClassProps {
  classroomData: Classes;
}

function EditClass({ classroomData }: EditClassProps) {
  const [classroomName, setClassroomName] = useState<string>(
    classroomData.classroomName
  );
  const [grade, setGrade] = useState<string>(classroomData.grade);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const t = useScopedI18n("components.myClasses.edit");

  const handleEditClass = async (classroomId: string) => {
    setOpen(true);
    try {
      if (!classroomName || !grade) {
        toast({
          title: t("toast.attention"),
          description: t("toast.attentionDescription"),
          variant: "destructive",
        });
        return;
      } else {
        await fetch(`/api/v1/classroom/${classroomId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classroomName,
            grade,
          }),
        });
      }
    } catch (error) {
      console.error(error);
    }
    toast({
      title: t("toast.successUpdate"),
      description: t("toast.successUpdateDescription"),
      variant: "default",
    });
    router.refresh();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Icons.edit
          className="ml-2 h-4 w-4 cursor-pointer"
          aria-label="edit class"
        />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <DialogDescription>{t("description")}</DialogDescription>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label>{t("className")}</Label>
            <Input
              type="text"
              className="col-span-3"
              placeholder={t("className")}
              value={classroomName}
              onChange={(e) => setClassroomName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label>{t("selectGrade")}</Label>
            <Select value={grade} onValueChange={(value) => setGrade(value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t("selectGrade")} />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 3).map(
                  (grade, index) => (
                    <SelectItem key={index} value={String(grade)}>
                      {t("grade")} {grade}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => handleEditClass(classroomData.id)}>
            {t("update")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EditClass;
