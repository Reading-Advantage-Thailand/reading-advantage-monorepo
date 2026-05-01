import React, { useEffect, useState } from "react";
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
import { Input } from "../ui/input";
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
import { Label } from "../ui/label";
import { useClassroomStore } from "@/store/classroom-store";

function CreateNewClass() {
  const [classroomName, setClassroomName] = useState<string>("");
  const [grade, setGrade] = useState<string>("");
  const [classCode, setClassCode] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const router = useRouter();
  const { fetchClassrooms } = useClassroomStore();
  const t = useScopedI18n("components.myClasses.createNewClass");

  const handleCreateClass = async () => {
    setOpen(true);
    try {
      const classroom = {
        classCode: classCode,
        classroomName: classroomName,
        description: "description",
        grade: grade,
        student: [],
      };

      if (!classCode || !classroomName || !grade) {
        toast({
          title: t("toast.attention"),
          description: t("toast.attentionDescription"),
          variant: "destructive",
        });
        return;
      } else {
        const res = await fetch(`/api/v1/classroom`, {
          method: "POST",
          body: JSON.stringify({ classroom }),
        });

        if (res.ok) {
          fetchClassrooms();
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      toast({
        title: t("toast.successCreate"),
        description: t("toast.successDescription"),
      });
      setClassCode(generateRandomCode());
      setOpen(false);
      router.refresh();
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const generateRandomCode = () => {
    return Math.random().toString(36).substring(2, 8);
  };

  useEffect(() => {
    setClassCode(generateRandomCode());
  }, []);

  return (
    <div className="max-w-sm">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Icons.add />
            &nbsp; {t("button")}
          </Button>
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
              <Label>{t("classCode")}</Label>
              <Input
                type="text"
                className="col-span-3 cursor-default "
                value={classCode}
                readOnly
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label>{t("selectGrade")}</Label>
              <Select onValueChange={(value) => setGrade(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={t("selectGrade")} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 3).map(
                    (grade: number, index: number) => (
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
            <Button variant="outline" onClick={() => handleCreateClass()}>
              {t("create")}
            </Button>
            <Button onClick={handleClose}>{t("cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CreateNewClass;
