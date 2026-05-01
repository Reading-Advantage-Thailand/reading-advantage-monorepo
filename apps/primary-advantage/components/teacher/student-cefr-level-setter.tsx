"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { convertCefrLevel } from "@/lib/utils";
import { Settings } from "lucide-react";

interface StudentCefrLevelSetterProps {
  studentId: string;
  studentName: string;
  currentCefrLevel: string;
  onUpdate?: () => void;
}

const CEFR_LEVELS = [
  { value: "A0-", label: "A0- (Beginner)", description: "Pre-A0, very basic" },
  {
    value: "A0",
    label: "A0 (Beginner)",
    description: "Basic user, elementary",
  },
  {
    value: "A0+",
    label: "A0+ (High Beginner)",
    description: "Upper elementary",
  },
  {
    value: "A1-",
    label: "A1- (Pre-Intermediate)",
    description: "Lower intermediate",
  },
  {
    value: "A1",
    label: "A1 (Pre-Intermediate)",
    description: "Pre-intermediate",
  },
  {
    value: "A1+",
    label: "A1+ (High Pre-Intermediate)",
    description: "Upper pre-intermediate",
  },
  {
    value: "A2-",
    label: "A2- (Low Intermediate)",
    description: "Lower intermediate",
  },
  {
    value: "A2",
    label: "A2 (Intermediate)",
    description: "Independent user, intermediate",
  },
  {
    value: "A2+",
    label: "A2+ (High Intermediate)",
    description: "Upper intermediate",
  },
  {
    value: "B1-",
    label: "B1- (Low Upper-Intermediate)",
    description: "Lower upper-intermediate",
  },
  {
    value: "B1",
    label: "B1 (Upper-Intermediate)",
    description: "Upper-intermediate",
  },
  {
    value: "B1+",
    label: "B1+ (High Upper-Intermediate)",
    description: "Advanced lower",
  },
  { value: "B2-", label: "B2- (Low Advanced)", description: "Lower advanced" },
  {
    value: "B2",
    label: "B2 (Advanced)",
    description: "Proficient user, advanced",
  },
  { value: "B2+", label: "B2+ (High Advanced)", description: "Upper advanced" },
];

export default function StudentCefrLevelSetter({
  studentId,
  studentName,
  currentCefrLevel,
  onUpdate,
}: StudentCefrLevelSetterProps) {
  const t = useTranslations("teacher.cefrSetter");
  const [selectedLevel, setSelectedLevel] = useState(currentCefrLevel);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleUpdateLevel = async () => {
    if (selectedLevel === currentCefrLevel) {
      toast.info(t("toast.noChanges"));
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const raLevel = convertCefrLevel(selectedLevel);

      const response = await fetch(`/api/users/${studentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cefrLevel: selectedLevel,
          level: raLevel,
        }),
      });

      if (!response.ok) {
        throw new Error("FAILED");
      }

      toast.success(
        t("toast.success", { name: studentName, level: selectedLevel }),
      );
      setIsOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error updating CEFR level:", error);
      toast.error(t("toast.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const currentLevelInfo = CEFR_LEVELS.find(
    (level) => level.value === currentCefrLevel,
  );
  const selectedLevelInfo = CEFR_LEVELS.find(
    (level) => level.value === selectedLevel,
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Settings className="text-muted-foreground mr-1 size-4" />
          {t("button.setLevel")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("dialog.title", { name: studentName })}</DialogTitle>
          <DialogDescription>{t("dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="current-level">{t("labels.currentLevel")}</Label>
            <div className="bg-muted rounded p-2 text-sm">
              <strong>{currentLevelInfo?.label}</strong>
              {currentLevelInfo?.description && (
                <div className="text-muted-foreground">
                  {currentLevelInfo.description}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new-level">{t("labels.newLevel")}</Label>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger>
                <SelectValue placeholder={t("select.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {CEFR_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div className="flex flex-col">
                      <span>{level.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {level.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedLevel && selectedLevel !== currentCefrLevel && (
            <div className="rounded border border-blue-200 bg-blue-50 p-2 text-sm">
              <div className="font-medium text-blue-900">
                {t("preview.title")}
              </div>
              <div className="text-blue-700">
                <strong>{t("preview.cefr")}</strong> {selectedLevelInfo?.label}
              </div>
              <div className="text-blue-700">
                <strong>{t("preview.ra")}</strong>{" "}
                {convertCefrLevel(selectedLevel)}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            {t("actions.cancel")}
          </Button>
          <Button
            onClick={handleUpdateLevel}
            disabled={isLoading || selectedLevel === currentCefrLevel}
          >
            {isLoading ? t("actions.updating") : t("actions.update")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
