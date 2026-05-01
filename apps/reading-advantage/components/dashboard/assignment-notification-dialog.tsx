"use client";

import React, { useState, useEffect } from "react";
import { useScopedI18n } from "@/locales/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  BookOpen,
  Users,
  History,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { th } from "date-fns/locale";

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  articleId: string;
  classroomId: string;
  createdAt: string;
  updatedAt: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  isCompleted: boolean;
}

interface NotificationHistory {
  id: string;
  assignmentTitle: string;
  studentCount: number;
  createdAt: Date;
  notifiedStudents: string[];
}

interface AssignmentNotificationDialogProps {
  open: boolean;
  onClose: () => void;
  classroomId: string;
  selectedStudentIds: string[];
}

export function AssignmentNotificationDialog({
  open,
  onClose,
  classroomId,
  selectedStudentIds,
}: AssignmentNotificationDialogProps) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentsForNotif, setSelectedStudentsForNotif] =
    useState<string[]>(selectedStudentIds);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );
  const [currentView, setCurrentView] = useState<"select" | "detail">("select");
  const [selectedAssignmentForDetail, setSelectedAssignmentForDetail] =
    useState<string | null>(null);
  const t = useScopedI18n("components.assignmentNotificationDialog") as any;

  useEffect(() => {
    if (open) {
      fetchAssignments();
      fetchHistory();
      setSelectedStudentsForNotif(selectedStudentIds);
      setSendStatus("idle"); // รีเซ็ตสถานะเมื่อเปิด dialog
    }
  }, [open, classroomId]);

  const fetchAssignments = async () => {
    try {
      const response = await fetch(
        `/api/v1/classroom/${classroomId}/assignments`
      );
      const data = await response.json();

      // กรองเฉพาะการบ้านที่ยังมีนักเรียนทำไม่เสร็จ
      const assignmentsWithIncompleteStudents = [];
      for (const assignment of data) {
        const studentsResponse = await fetch(
          `/api/v1/classroom/${classroomId}/assignments/${assignment.id}/students`
        );
        const students = await studentsResponse.json();

        // ถ้ามีนักเรียนที่ยังทำไม่เสร็จ ให้เอาการบ้านนี้มาแสดง
        const hasIncompleteStudents = students.some(
          (s: Student) => !s.isCompleted
        );
        if (hasIncompleteStudents) {
          assignmentsWithIncompleteStudents.push(assignment);
        }
      }

      setAssignments(assignmentsWithIncompleteStudents);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    }
  };

  const fetchStudentsForAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(
        `/api/v1/classroom/${classroomId}/assignments/${assignmentId}/students`
      );
      const data = await response.json();
      setStudents(data);
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(
        `/api/v1/classroom/${classroomId}/assignment-notifications/history`
      );
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const toggleAssignment = (assignmentId: string) => {
    setSelectedAssignments((prev) =>
      prev.includes(assignmentId)
        ? prev.filter((id) => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudentsForNotif((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    setSelectedStudentsForNotif(students.map((s) => s.id));
  };

  const deselectAllStudents = () => {
    setSelectedStudentsForNotif([]);
  };

  const handleShowDetail = async (assignmentId: string) => {
    setSelectedAssignmentForDetail(assignmentId);
    await fetchStudentsForAssignment(assignmentId);
    setCurrentView("detail");
  };

  const handleBackToSelect = () => {
    setCurrentView("select");
    setSelectedAssignmentForDetail(null);
  };

  const handleSendNotifications = async () => {
    setLoading(true);
    setSendStatus("idle");
    try {
      // ถ้าอยู่ในมุมมอง select ให้ส่งแจ้งเตือนไปยังนักเรียนที่ยังทำไม่เสร็จทั้งหมด
      // โดยไม่ต้องระบุ studentIds (API จะหานักเรียนที่ยังไม่เสร็จเอง)
      const bodyData =
        currentView === "select"
          ? { assignmentIds: selectedAssignments }
          : {
              assignmentIds: selectedAssignments,
              studentIds: selectedStudentsForNotif,
            };

      const response = await fetch(
        `/api/v1/classroom/${classroomId}/assignment-notifications/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bodyData),
        }
      );

      if (response.ok) {
        setSendStatus("success");
        setSelectedAssignments([]);
        fetchHistory();
        // รีเซ็ตสถานะกลับเป็นปกติหลัง 3 วินาที
        setTimeout(() => {
          setSendStatus("idle");
        }, 3000);
      } else {
        setSendStatus("error");
        // รีเซ็ตสถานะกลับเป็นปกติหลัง 3 วินาที
        setTimeout(() => {
          setSendStatus("idle");
        }, 3000);
      }
    } catch (error) {
      console.error("Error sending notifications:", error);
      setSendStatus("error");
      // รีเซ็ตสถานะกลับเป็นปกติหลัง 3 วินาที
      setTimeout(() => {
        setSendStatus("idle");
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const renderSelectView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("selectInstruction")}</p>
        <Badge variant="secondary">{selectedAssignments.length} {t("selected")}</Badge>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedAssignments.includes(assignment.id)}
                  onCheckedChange={() => toggleAssignment(assignment.id)}
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{assignment.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {assignment.description}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShowDetail(assignment.id)}
                    >
                      {t("detail")}
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(assignment.createdAt), "dd MMM yyyy", {
                        locale: th,
                      })}
                    </div>
                    {" - "}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(assignment.dueDate), "dd MMM yyyy", {
                        locale: th,
                      })}
                    </div>
{(() => {
                      const dueDate = new Date(assignment.dueDate);
                      const today = new Date();
                      const daysRemaining = differenceInDays(dueDate, today);
                      const isOverdue = isPast(dueDate) && daysRemaining < 0;
                      
                      if (isOverdue) {
                        return (
                          <Badge
                            variant="destructive"
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {t("badges.overdue")} {Math.abs(daysRemaining)} {t("days")}
                          </Badge>
                        );
                      } else if (daysRemaining === 0) {
                        return (
                          <Badge
                            variant="destructive"
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {t("badges.dueToday")}
                          </Badge>
                        );
                      } else if (daysRemaining === 1) {
                        return (
                          <Badge
                            variant="destructive"
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {t("badges.oneDay")}
                          </Badge>
                        );
                      } else if (daysRemaining <= 3) {
                        return (
                          <Badge
                            variant="destructive"
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {t("badges.daysRemaining")} {daysRemaining} {t("days")}
                          </Badge>
                        );
                      } else if (daysRemaining <= 7) {
                        return (
                          <Badge
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {t("badges.daysRemaining")} {daysRemaining} {t("days")}
                          </Badge>
                        );
                      } else {
                        return (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Clock className="h-3 w-3" />
                            {t("badges.daysRemaining")} {daysRemaining} {t("days")}
                          </Badge>
                        );
                      }
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const renderDetailView = () => {
    const assignment = assignments.find(
      (a) => a.id === selectedAssignmentForDetail
    );
    if (!assignment) return null;

    const completedCount = students.filter((s) => s.isCompleted).length;
    const incompletedStudents = students.filter((s) => !s.isCompleted);

    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBackToSelect}>
          ← {t("back")}
        </Button>

        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-lg">{assignment.title}</h3>
          <p className="text-sm text-muted-foreground">
            {assignment.description}
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {format(new Date(assignment.dueDate), "dd MMM yyyy HH:mm", {
                locale: th,
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-3">
            <div className="text-sm text-muted-foreground">{t("students.completedLabel")}</div>
            <div className="text-2xl font-bold text-green-600">
              {completedCount}
            </div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-sm text-muted-foreground">{t("students.incompleteLabel")}</div>
            <div className="text-2xl font-bold text-orange-600">
              {students.length - completedCount}
            </div>
          </div>
        </div>

        <div className="space-y-2">
            <div className="flex items-center justify-between">
            <p className="font-medium">{t("selectStudents")}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={deselectAllStudents}>{t("deselectAll")}</Button>
              <Button variant="outline" size="sm" onClick={selectAllStudents}>{t("selectAll")}</Button>
            </div>
          </div>

          <ScrollArea className="h-[250px] border rounded-lg p-3">
            <div className="space-y-2">
              {incompletedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-3 p-2 hover:bg-accent rounded-md"
                >
                  <Checkbox
                    checked={selectedStudentsForNotif.includes(student.id)}
                    onCheckedChange={() => toggleStudent(student.id)}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{student.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {student.email}
                    </div>
                  </div>
                    <Badge
                    variant={student.isCompleted ? "default" : "secondary"}
                  >
                    {student.isCompleted ? t("studentStatus.completed") : t("studentStatus.incomplete")}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  };

  const renderHistoryView = () => (
    <ScrollArea className="h-[450px] pr-4">
      <div className="space-y-3">
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{t("history.empty")}</p>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{item.assignmentTitle}</h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Users className="h-3 w-3" />
                    {t("history.sentTo")} {item.studentCount} {t("studentsLabel")}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(item.createdAt), "dd MMM yyyy HH:mm", {
                    locale: th,
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="select" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="select">{t("tabs.select")}</TabsTrigger>
            <TabsTrigger value="history">{t("tabs.history")}</TabsTrigger>
          </TabsList>

          <TabsContent value="select" className="mt-4">
            {currentView === "select" ? renderSelectView() : renderDetailView()}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {renderHistoryView()}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t("cancel")}
          </Button>
          {currentView === "select" && (
            <Button
              onClick={handleSendNotifications}
              disabled={selectedAssignments.length === 0 || loading}
              variant={
                sendStatus === "success"
                  ? "default"
                  : sendStatus === "error"
                    ? "destructive"
                    : "default"
              }
            >
              {loading ? (
                  <>
                  <BookOpen className="h-4 w-4 mr-2 animate-spin" />
                  {t("sending")}
                </>
              ) : sendStatus === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("sentSuccess")}
                </>
              ) : sendStatus === "error" ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t("sentError")}
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  {t("sendDefault")}
                </>
              )}
            </Button>
          )}
          {currentView === "detail" && (
            <Button
              onClick={() => {
                if (selectedAssignmentForDetail) {
                  setSelectedAssignments([selectedAssignmentForDetail]);
                  handleSendNotifications();
                }
              }}
              disabled={selectedStudentsForNotif.length === 0 || loading}
              variant={
                sendStatus === "success"
                  ? "default"
                  : sendStatus === "error"
                    ? "destructive"
                    : "default"
              }
            >
              {loading ? (
                <>
                  <BookOpen className="h-4 w-4 mr-2 animate-spin" />
                  {t("sending")}
                </>
              ) : sendStatus === "success" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t("sentSuccess")}
                </>
              ) : sendStatus === "error" ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t("sentError")}
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  {t("sendToSelected", { count: selectedStudentsForNotif.length })}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
