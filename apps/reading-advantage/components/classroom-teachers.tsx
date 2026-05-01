"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { ClassroomTeachersResponse } from "@/types/classroom-teacher";

interface ClassroomTeachersProps {
  classroomId: string;
  isCreator: boolean;
}

export function ClassroomTeachers({ classroomId, isCreator }: ClassroomTeachersProps) {
  const [teachers, setTeachers] = useState<ClassroomTeachersResponse["teachers"]>([]);
  const [newTeacherEmail, setNewTeacherEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingTeacher, setIsAddingTeacher] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, [classroomId]);

  const fetchTeachers = async () => {
    try {
      const response = await fetch(`/api/v1/classroom/${classroomId}/teachers`);
      if (response.ok) {
        const data: ClassroomTeachersResponse = await response.json();
        setTeachers(data.teachers);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
      toast({
        title: "Error",
        description: "Failed to load teachers",
        variant: "destructive",
      });
    }
  };

  const addCoTeacher = async () => {
    if (!newTeacherEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter teacher email",
        variant: "destructive",
      });
      return;
    }

    setIsAddingTeacher(true);
    try {
      const response = await fetch(`/api/v1/classroom/${classroomId}/teachers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherEmail: newTeacherEmail.trim(),
          role: "CO_TEACHER",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Co-teacher added successfully",
        });
        setNewTeacherEmail("");
        await fetchTeachers();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add co-teacher",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding co-teacher:", error);
      toast({
        title: "Error",
        description: "Failed to add co-teacher",
        variant: "destructive",
      });
    } finally {
      setIsAddingTeacher(false);
    }
  };

  const removeCoTeacher = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Are you sure you want to remove ${teacherName} as a co-teacher?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/v1/classroom/${classroomId}/teachers`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacherId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Co-teacher removed successfully",
        });
        await fetchTeachers();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to remove co-teacher",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error removing co-teacher:", error);
      toast({
        title: "Error",
        description: "Failed to remove co-teacher",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Classroom Teachers ({teachers.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Co-Teacher Form */}
        {isCreator && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <Label htmlFor="teacher-email" className="text-sm font-medium">
              Add Co-Teacher
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="teacher-email"
                type="email"
                placeholder="Enter teacher email"
                value={newTeacherEmail}
                onChange={(e) => setNewTeacherEmail(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addCoTeacher()}
              />
              <Button
                onClick={addCoTeacher}
                disabled={isAddingTeacher || !newTeacherEmail.trim()}
                size="sm"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                {isAddingTeacher ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        )}

        {/* Teachers List */}
        <div className="space-y-2">
          {teachers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No teachers found
            </p>
          ) : (
            teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{teacher.name || "Unknown"}</span>
                    <Badge
                      variant={teacher.role === "OWNER" ? "default" : "secondary"}
                    >
                      {teacher.role === "OWNER" ? "Owner" : "Co-Teacher"}
                    </Badge>
                    {teacher.is_creator && (
                      <Badge variant="outline">Creator</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{teacher.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined: {new Date(teacher.joined_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Remove Button (only for creator and non-owners) */}
                {isCreator && teacher.role !== "OWNER" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCoTeacher(teacher.id, teacher.name || "Unknown")}
                    disabled={isLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
