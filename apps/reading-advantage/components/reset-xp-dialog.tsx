// ResetDialog.tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/use-toast";

export default function ResetDialog({ users }: { users: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const closeDialog = () => {
    setIsOpen(false);
  };

  const resetXP = async (userId: string) => {
    try {
      const response = await fetch(`/api/v1/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          xp: 0,
          level: 0,
          cefrLevel: "",
          cefr_level: "",
          resetXP: true,
        }),
      });

      if (response.status === 400) {
        toast({
          title: "Fail.",
          description: `XP reset Fail.`,
        });
      }

      if (response.status === 200) {
        toast({
          title: "Success.",
          description: `XP reset successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Fail.",
        description: `XP reset Fail.`,
      });
    } finally {
      closeDialog();
      router.refresh();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="secondary" size="sm">
            Reset XP
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset all XP progress</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            If you click <span className="font-bold">‘Confirm Reset’</span> then
            all your progress will be reset and you will essentially have a new
            account. Do this only if you feel your level is incorrect and you
            can’t fix it. <span className="font-bold">‘Cancel’</span> if you are
            not sure what to do.”
          </DialogDescription>
          <DialogFooter>
            <Button onClick={closeDialog}>Cancel</Button>
            <Button variant="destructive" onClick={() => resetXP(users)}>
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
