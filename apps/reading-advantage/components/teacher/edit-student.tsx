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
import React, { useState } from "react";
import { Icons } from "@/components/icons";
import { toast } from "../ui/use-toast";
import { useRouter } from "next/navigation";
import { useScopedI18n } from "@/locales/client";
import { Input } from "../ui/input";

type Student = {
  id: string;
  display_name: string;
  email: string;
  last_activity: string;
  level: number;
  xp: number;
};

type MyStudentProps = {
  userData: Student;
};

export default function EditStudent({ userData }: MyStudentProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [studentName, setStudentName] = useState<string>(
    userData ? userData.display_name : ""
  );
  const t = useScopedI18n("components.reports.editStudent");

  const handleEditStudent = async (studentId: string) => {
    try {
      if (!studentName) {
        toast({
          title: t("toast.attentionUpdate"),
          description: t("toast.attentionUpdateDescription"),
          variant: "destructive",
        });
        return;
      } else {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/${studentId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              display_name: studentName,
            }),
          }
        );
        if (!response.ok) {
          toast({
            title: t("toast.errorUpdate"),
            description: t("toast.errorUpdateDescription"),
            variant: "destructive",
          });
          return;
        }
        if (response.ok) {
          toast({
            title: t("toast.successUpdate"),
            description: t("toast.successUpdateDescription"),
            variant: "default",
          });
          router.refresh();
          setOpen(false);
        }
      }
    } catch (error) {
      toast({
        title: t("toast.errorUpdate"),
        description: t("toast.errorUpdateDescription"),
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={() => setOpen(!open)}>
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
          <Input
            type="text"
            className="w-full border rounded-md p-2"
            placeholder={t("placeholder")}
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleEditStudent(userData.id)}
            >
              {t("update")}
            </Button>
            <Button onClick={() => setOpen(false)}>{t("cancel")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
