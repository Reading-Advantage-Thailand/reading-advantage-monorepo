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

interface CreateGoalDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export function CreateGoalDialog({
  open,
  onClose,
  onSuccess,
  userId,
}: CreateGoalDialogProps) {
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

      const res = await fetch("/api/v1/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          targetValue: parseFloat(formData.targetValue),
          targetDate: new Date(formData.targetDate),
        }),
      });

      if (res.ok) {
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
      }
    } catch (error) {
      console.error("Error creating goal:", error);
    } finally {
      setLoading(false);
    }
  };

  const goalTypes = [
    { value: "XP_TOTAL", label: "Total XP", unit: "xp" },
    { value: "XP_DAILY", label: "Daily XP", unit: "xp" },
    { value: "XP_WEEKLY", label: "Weekly XP", unit: "xp" },
    { value: "ARTICLES_READ", label: "Articles Read", unit: "articles" },
    { value: "READING_TIME", label: "Reading Time", unit: "minutes" },
    { value: "VOCABULARY", label: "Vocabulary", unit: "words" },
    { value: "STREAK", label: "Reading Streak", unit: "days" },
    { value: "CEFR_LEVEL", label: "CEFR Level", unit: "level" },
    { value: "CUSTOM", label: "Custom Goal", unit: "units" },
  ];

  const handleGoalTypeChange = (value: string) => {
    const selectedType = goalTypes.find((t) => t.value === value);
    setFormData({
      ...formData,
      goalType: value,
      unit: selectedType?.unit || "units",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Learning Goal</DialogTitle>
            <DialogDescription>
              Set a new goal to track your learning progress
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Goal Type */}
            <div className="grid gap-2">
              <Label htmlFor="goalType">Goal Type</Label>
              <Select value={formData.goalType} onValueChange={handleGoalTypeChange}>
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
            <div className="grid gap-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Earn 500 XP this week"
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Add more details about your goal..."
                rows={3}
              />
            </div>

            {/* Target Value */}
            <div className="grid gap-2">
              <Label htmlFor="targetValue">Target *</Label>
              <div className="flex gap-2">
                <Input
                  id="targetValue"
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) =>
                    setFormData({ ...formData, targetValue: e.target.value })
                  }
                  placeholder="100"
                  required
                  className="flex-1"
                />
                <Input
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData({ ...formData, unit: e.target.value })
                  }
                  placeholder="units"
                  className="w-32"
                />
              </div>
            </div>

            {/* Target Date */}
            <div className="grid gap-2">
              <Label htmlFor="targetDate">Target Date *</Label>
              <Input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) =>
                  setFormData({ ...formData, targetDate: e.target.value })
                }
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            {/* Priority */}
            <div className="grid gap-2">
              <Label htmlFor="priority">Priority</Label>
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
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
