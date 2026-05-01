"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useScopedI18n } from "@/locales/client";

interface CreateClassroomGoalDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classroomId: string;
  className: string;
}

export function CreateClassroomGoalDialog({
  open,
  onClose,
  onSuccess,
  classroomId,
  className,
}: CreateClassroomGoalDialogProps) {
  const t = useScopedI18n("pages.teacher.dashboardPage.classDetail.goals.createDialog") as any;
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    goalType: "XP_WEEKLY",
    title: "",
    description: "",
    targetValue: "",
    unit: "xp",
    targetDate: "",
    priority: "MEDIUM",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await fetch(
        `/api/v1/teacher/classroom/${classroomId}/goals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            targetValue: parseFloat(formData.targetValue),
            targetDate: new Date(formData.targetDate),
          }),
        }
      );

      if (res.ok) {
        const result = await res.json();
        
        toast({
          title: t("toast.successTitle"),
          description: t("toast.successDescription", { count: result.count, className }),
        });

        onSuccess();
        setFormData({
          goalType: "XP_WEEKLY",
          title: "",
          description: "",
          targetValue: "",
          unit: "xp",
          targetDate: "",
          priority: "MEDIUM",
        });
      } else {
        const error = await res.json();
        toast({
          title: t("toast.errorTitle"),
          description: error.message || t("toast.errorDescription"),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating goal:", error);
      toast({
        title: t("toast.errorTitle"),
        description: t("toast.genericError"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const goalTypes = [
    { value: "XP_TOTAL", label: t("goalTypes.XP_TOTAL"), unit: t("units.xp") },
    { value: "XP_DAILY", label: t("goalTypes.XP_DAILY"), unit: t("units.xp") },
    { value: "XP_WEEKLY", label: t("goalTypes.XP_WEEKLY"), unit: t("units.xp") },
    { value: "ARTICLES_READ", label: t("goalTypes.ARTICLES_READ"), unit: t("units.articles") },
    { value: "READING_TIME", label: t("goalTypes.READING_TIME"), unit: t("units.minutes") },
    { value: "VOCABULARY", label: t("goalTypes.VOCABULARY"), unit: t("units.words") },
    { value: "STREAK", label: t("goalTypes.STREAK"), unit: t("units.days") },
    { value: "CEFR_LEVEL", label: t("goalTypes.CEFR_LEVEL"), unit: t("units.level") },
    { value: "CUSTOM", label: t("goalTypes.CUSTOM"), unit: t("units.units") },
  ];

  const handleGoalTypeChange = (value: string) => {
    const selectedType = goalTypes.find((t) => t.value === value);
    setFormData({
      ...formData,
      goalType: value,
      unit: selectedType?.unit || t("units.units"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t("description", { className })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Goal Type */}
          <div className="space-y-2">
            <Label htmlFor="goalType">{t("goalType")}</Label>
            <Select
              value={formData.goalType}
              onValueChange={handleGoalTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {goalTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t("title_label")}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder={t("titlePlaceholder")}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("description_label")}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder={t("descriptionPlaceholder")}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Target Value */}
            <div className="space-y-2">
              <Label htmlFor="targetValue">{t("targetValue")}</Label>
              <Input
                id="targetValue"
                type="number"
                value={formData.targetValue}
                onChange={(e) =>
                  setFormData({ ...formData, targetValue: e.target.value })
                }
                placeholder={t("targetValuePlaceholder")}
                required
              />
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <Label htmlFor="unit">{t("unit")}</Label>
              <Input
                id="unit"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Target Date */}
            <div className="space-y-2">
              <Label htmlFor="targetDate">{t("targetDate")}</Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) =>
                  setFormData({ ...formData, targetDate: e.target.value })
                }
                required
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label htmlFor="priority">{t("priority")}</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) =>
                  setFormData({ ...formData, priority: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">{t("priorityLow")}</SelectItem>
                  <SelectItem value="MEDIUM">{t("priorityMedium")}</SelectItem>
                  <SelectItem value="HIGH">{t("priorityHigh")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {t("cancelButton")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("creatingButton") : t("createButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
