import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
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
import { Input } from "../ui/input";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "../ui/label";
import { PlusIcon } from "lucide-react";
import { generateRandomClassCode } from "@/lib/utils";

interface CreateNewClassProps {
  buttonText?: string;
  onClassCreated?: () => void;
}

export default function CreateNewClass({
  onClassCreated,
  buttonText,
}: CreateNewClassProps) {
  const t = useTranslations("TeacherCreateClass");
  const [classroomName, setClassroomName] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [classCode, setClassCode] = useState<string>(generateRandomClassCode());
  const [open, setOpen] = useState<boolean>(false);

  const handleCreateClass = async () => {
    try {
      if (!classCode || !classroomName || !grade) {
        toast.error(t("toast.attention"), {
          description: t("toast.fillAllFields"),
          richColors: true,
        });
        return;
      }

      const classroom = {
        name: classroomName,
        classCode: classCode,
        grade: grade,
      };

      const response = await fetch("/api/classroom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(classroom),
      });

      if (!response.ok) {
        throw new Error("FAILED_CREATE");
      }

      toast.success(t("toast.success"), {
        description: t("toast.classCreated"),
        richColors: true,
      });

      setClassroomName("");
      setGrade("");
      setClassCode(generateRandomClassCode());
      setOpen(false);

      // Call the callback to refresh the parent component's data
      if (onClassCreated) {
        onClassCreated();
      }
    } catch (error) {
      console.error(error);
      toast.error(t("toast.error"), {
        description: t("toast.failedCreate"),
        richColors: true,
      });
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div className="max-w-sm">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <PlusIcon className="size-4" />
            &nbsp; {buttonText || t("button.newClassroom")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
          </DialogHeader>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>{t("fields.className")}</Label>
              <Input
                type="text"
                className="col-span-3"
                placeholder={t("fields.classNamePlaceholder")}
                value={classroomName}
                onChange={(e) => setClassroomName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>{t("fields.classCode")}</Label>
              <Input
                type="text"
                className="col-span-3 cursor-default"
                value={classCode}
                disabled
                readOnly
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>{t("fields.grade")}</Label>
              <Select onValueChange={(value) => setGrade(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t("fields.gradePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 3).map(
                    (grade: number, index: number) => (
                      <SelectItem key={index} value={String(grade)}>
                        {t("fields.gradeItem", { grade })}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleCreateClass()}>
              {t("actions.create")}
            </Button>
            <Button onClick={handleClose}>{t("actions.cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
