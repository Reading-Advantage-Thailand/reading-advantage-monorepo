"use client";

import React, { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Users,
  BookOpen,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { generateRandomClassCode } from "@/lib/utils";

interface Classroom {
  id: string;
  name: string;
  grade?: string;
  classCode?: string;
  passwordStudents?: string;
  codeExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
  schoolId?: string;
  school?: {
    id: string;
    name: string;
  };
  students?: Array<{
    id: string;
    student: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  teachers?: Array<{
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export function ClassroomsTable() {
  const t = useTranslations("Admin.Classrooms");
  const tc = useTranslations("TeacherCreateClass");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    classCode: generateRandomClassCode(),
    passwordStudents: "",
  });

  // Fetch classroom data from API
  const fetchClassrooms = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/classroom");

      if (!response.ok) {
        throw new Error("Failed to fetch classrooms");
      }

      const data = await response.json();

      // Extract classrooms array from the response
      if (data.classrooms && Array.isArray(data.classrooms)) {
        setClassrooms(data.classrooms);
      } else {
        console.error("Invalid classrooms data format:", data);
        setClassrooms([]);
        toast.error(t("toast.invalidData"));
      }
    } catch (error) {
      console.error("Error fetching classrooms:", error);
      toast.error(t("toast.loadFailed"));
      setClassrooms([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClassrooms = Array.isArray(classrooms)
    ? classrooms.filter(
        (classroom) =>
          classroom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          classroom.grade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          classroom.classCode?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : [];

  const handleCreateClassroom = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/classroom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create classroom");
      }

      setFormData({
        name: "",
        grade: "",
        classCode: generateRandomClassCode(),
        passwordStudents: "",
      });
      setIsAddDialogOpen(false);
      await fetchClassrooms();
      toast.success(t("toast.createSuccess"), {
        richColors: true,
      });
    } catch (error) {
      console.error("Error creating classroom:", error);
      toast.error(t("toast.createFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClassroom = async () => {
    if (!selectedClassroom) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/classroom/${selectedClassroom.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update classroom");
      }

      setIsEditDialogOpen(false);
      setSelectedClassroom(null);
      setFormData({
        name: "",
        grade: "",
        classCode: generateRandomClassCode(),
        passwordStudents: "",
      });
      await fetchClassrooms();
      toast.success(t("toast.updateSuccess"), {
        richColors: true,
      });
    } catch (error) {
      console.error("Error updating classroom:", error);
      toast.error(t("toast.updateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClassroom = async () => {
    if (!selectedClassroom) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/classroom/${selectedClassroom.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete classroom");
      }

      setIsDeleteDialogOpen(false);
      setSelectedClassroom(null);
      await fetchClassrooms();
      toast.success(t("toast.deleteSuccess"), {
        richColors: true,
      });
    } catch (error) {
      console.error("Error deleting classroom:", error);
      toast.error(t("toast.deleteFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setFormData({
      name: classroom.name,
      grade: classroom.grade || "",
      classCode: classroom.classCode || "",
      passwordStudents: classroom.passwordStudents || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (classroom: Classroom) => {
    setSelectedClassroom(classroom);
    setIsDeleteDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isCodeExpired = (expiryDate?: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      grade: "",
      classCode: generateRandomClassCode(),
      passwordStudents: "",
    });
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  return (
    <div className="space-y-6">
      {/* Classrooms Table */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <CardTitle className="flex flex-row items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t("classrooms")}
            </CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("createClassroom")}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{t("createClassroom")}</DialogTitle>
                  <DialogDescription>
                    {t("createClassroomDescription")}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      {t("name")}
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="col-span-3"
                      placeholder={t("namePlaceholder")}
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="classCode" className="text-right">
                      {t("classCode")}
                    </Label>
                    <Input
                      id="classCode"
                      value={formData.classCode}
                      disabled
                      readOnly
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="grade" className="text-right">
                      {t("grade")}
                    </Label>
                    <Select
                      value={formData.grade}
                      onValueChange={(value) =>
                        setFormData({ ...formData, grade: value })
                      }
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder={t("selectGrade")} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 10 }, (_, i) => i + 3).map(
                          (grade: number, index: number) => (
                            <SelectItem key={index} value={String(grade)}>
                              {tc("fields.gradeItem", { grade })}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleCreateClassroom}>
                    {t("create")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[200px] flex-1">
              <div className="relative">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("grade")}</TableHead>
                <TableHead>{t("classCode")}</TableHead>
                <TableHead>{t("students")}</TableHead>
                <TableHead>{t("teachers")}</TableHead>
                <TableHead>{t("createdAt")}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClassrooms.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-muted-foreground py-8 text-center"
                  >
                    {t("noClassrooms")}
                  </TableCell>
                </TableRow>
              ) : (
                filteredClassrooms.map((classroom) => (
                  <TableRow key={classroom.id}>
                    <TableCell className="font-medium">
                      {classroom.name}
                    </TableCell>
                    <TableCell>
                      {classroom.grade ? (
                        <Badge variant="secondary">{classroom.grade}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {classroom.classCode ? (
                          <Badge
                            variant={
                              isCodeExpired(classroom.codeExpiresAt)
                                ? "destructive"
                                : "default"
                            }
                            className="font-mono text-xs"
                          >
                            {classroom.classCode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {classroom.codeExpiresAt && (
                          <div className="text-muted-foreground text-xs">
                            {t("expires")}:{" "}
                            {formatDate(classroom.codeExpiresAt)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="text-muted-foreground h-4 w-4" />
                        <span>{classroom.students?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BookOpen className="text-muted-foreground h-4 w-4" />
                        <span>{classroom.teachers?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(classroom.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openEditDialog(classroom)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            {t("edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(classroom)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editClassroom")}</DialogTitle>
            <DialogDescription>
              {t("editClassroomDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">{t("name")}</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t("namePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="edit-grade">{t("grade")}</Label>
              <Input
                id="edit-grade"
                value={formData.grade}
                onChange={(e) =>
                  setFormData({ ...formData, grade: e.target.value })
                }
                placeholder={t("gradePlaceholder")}
              />
            </div>
            <div>
              <Label htmlFor="edit-passwordStudents">
                {t("studentPassword")}
              </Label>
              <Input
                id="edit-passwordStudents"
                value={formData.passwordStudents}
                onChange={(e) =>
                  setFormData({ ...formData, passwordStudents: e.target.value })
                }
                placeholder={t("studentPasswordPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isLoading}
            >
              {t("cancel")}
            </Button>
            <Button onClick={handleEditClassroom} disabled={isLoading}>
              {isLoading ? t("updating") : t("update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteClassroom")}</DialogTitle>
            <DialogDescription>
              {t("deleteClassroomDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground text-sm">
              {t("deleteClassroomWarning")}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteClassroom}
              disabled={isLoading}
            >
              {isLoading ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
