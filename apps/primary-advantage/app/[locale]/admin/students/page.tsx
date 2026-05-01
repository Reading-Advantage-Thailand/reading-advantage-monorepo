"use client";
import { Header } from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  TrendingUp,
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Loader2,
  X,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

// Student interface based on the API response
interface Student {
  id: string;
  name: string | null;
  email: string | null;
  cefrLevel: string | null;
  xp: number;
  role: string;
  createdAt: string;
  className: string | null;
  classroomId: string | null;
}

// Form data interface
interface StudentFormData {
  name: string;
  email: string;
  cefrLevel: string;
  role: string;
}

// Statistics interface
interface Statistics {
  totalStudents: number;
  averageXp: number;
  mostCommonLevel: string;
  activeThisWeek: number;
  activePercentage: number;
}

// Classroom interface
interface Classroom {
  id: string;
  name: string;
  grade: string | null;
  studentCount: number;
}

// API Response interface
interface StudentsResponse {
  students: Student[];
  statistics: Statistics;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function StudentsPage() {
  const t = useTranslations("AdminStudents");
  // State management
  const [students, setStudents] = useState<Student[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    totalStudents: 0,
    averageXp: 0,
    mostCommonLevel: "A0-",
    activeThisWeek: 0,
    activePercentage: 0,
  });
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassroom, setSelectedClassroom] = useState("");
  const [selectedCefrLevel, setSelectedCefrLevel] = useState("");

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form data
  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    email: "",
    cefrLevel: "A1",
    role: "student",
  });

  // Fetch students data
  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchQuery) params.append("search", searchQuery);
      if (selectedClassroom) params.append("classroomId", selectedClassroom);
      if (selectedCefrLevel) params.append("cefrLevel", selectedCefrLevel);

      const response = await fetch(`/api/students?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(
          `Failed to fetch students: ${response.status} ${response.statusText}`,
        );
      }

      const data: StudentsResponse = await response.json();

      setStudents(data.students);
      setStatistics(data.statistics);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch classrooms data
  const fetchClassrooms = async () => {
    try {
      const response = await fetch("/api/classrooms");

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to fetch classrooms: ${response.status} ${response.statusText}`,
        );
      }

      const data: Classroom[] = await response.json();
      setClassrooms(data);
    } catch (error) {
      console.error("Error fetching classrooms:", error);
    }
  };

  // Effects
  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [pagination.page, searchQuery, selectedClassroom, selectedCefrLevel]);

  // Handle search with debounce
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle filter changes
  const handleClassroomFilter = (value: string) => {
    setSelectedClassroom(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleCefrLevelFilter = (value: string) => {
    setSelectedCefrLevel(value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedClassroom("");
    setSelectedCefrLevel("");
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery !== "" || selectedClassroom !== "" || selectedCefrLevel !== "";

  // Count active filters
  const activeFiltersCount = [
    searchQuery,
    selectedClassroom,
    selectedCefrLevel,
  ].filter((filter) => filter !== "").length;

  // Handle form input changes
  const handleInputChange = (field: keyof StudentFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      cefrLevel: "A1",
      role: "student",
    });
  };

  // Handle add student
  const handleAddStudent = () => {
    const newStudent: Student = {
      id: Date.now().toString(),
      name: formData.name,
      email: formData.email,
      cefrLevel: formData.cefrLevel,
      xp: 0,
      role: formData.role,
      createdAt: new Date().toISOString().split("T")[0],
      className: null,
      classroomId: null,
    };

    setStudents((prev) => [...prev, newStudent]);
    setIsAddDialogOpen(false);
    resetForm();

    // Refresh data from server
    fetchStudents();
  };

  // Handle edit student
  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name || "",
      email: student.email || "",
      cefrLevel: student.cefrLevel || "A1",
      role: student.role,
    });
    setIsEditDialogOpen(true);
  };

  // Handle update student
  const handleUpdateStudent = () => {
    if (!editingStudent) return;

    setStudents((prev) =>
      prev.map((student) =>
        student.id === editingStudent.id
          ? {
              ...student,
              name: formData.name,
              email: formData.email,
              cefrLevel: formData.cefrLevel,
              role: formData.role,
            }
          : student,
      ),
    );

    setIsEditDialogOpen(false);
    setEditingStudent(null);
    resetForm();

    // Refresh data from server
    fetchStudents();
  };

  // Handle delete student
  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((student) => student.id !== id));
    // Refresh data from server
    fetchStudents();
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "teacher":
        return "default";
      case "student":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div>
      <Header heading={t("header.title")} text={t("header.subtitle")} />
      <Separator className="my-4" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.totalStudents")}
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                statistics.totalStudents
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("stats.allClassrooms")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.averageXp")}
            </CardTitle>
            <TrendingUp className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                statistics.averageXp.toLocaleString()
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("stats.averageXpDesc")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.mostCommonLevel")}
            </CardTitle>
            <BookOpen className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                statistics.mostCommonLevel
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("stats.mostCommonLevelDesc")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("stats.activeThisWeek")}
            </CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                `${statistics.activePercentage}%`
              )}
            </div>
            <p className="text-muted-foreground text-xs">
              {t("stats.activeThisWeekDetail", {
                count: statistics.activeThisWeek,
                total: statistics.totalStudents,
              })}
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="mt-6 space-y-6">
        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-row items-center justify-between">
              <CardTitle>{t("page.title")}</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => resetForm()}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("actions.addStudent")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{t("dialogs.add.title")}</DialogTitle>
                    <DialogDescription>
                      {t("dialogs.add.description")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        {t("form.name")}
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className="col-span-3"
                        placeholder={t("form.namePlaceholder")}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="email" className="text-right">
                        {t("form.email")}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className="col-span-3"
                        placeholder={t("form.emailPlaceholder")}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="cefrLevel" className="text-right">
                        {t("form.cefrLevel")}
                      </Label>
                      <Select
                        value={formData.cefrLevel}
                        onValueChange={(value) =>
                          handleInputChange("cefrLevel", value)
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue
                            placeholder={t("form.cefrPlaceholder")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A0-">A0-</SelectItem>
                          <SelectItem value="A0">A0</SelectItem>
                          <SelectItem value="A0+">A0+</SelectItem>
                          <SelectItem value="A1-">A1-</SelectItem>
                          <SelectItem value="A1">A1</SelectItem>
                          <SelectItem value="A1+">A1+</SelectItem>
                          <SelectItem value="A2-">A2-</SelectItem>
                          <SelectItem value="A2">A2</SelectItem>
                          <SelectItem value="A2+">A2+</SelectItem>
                          <SelectItem value="B1-">B1-</SelectItem>
                          <SelectItem value="B1">B1</SelectItem>
                          <SelectItem value="B1+">B1+</SelectItem>
                          <SelectItem value="B2-">B2-</SelectItem>
                          <SelectItem value="B2">B2</SelectItem>
                          <SelectItem value="B2+">B2+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="role" className="text-right">
                        {t("form.role")}
                      </Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) =>
                          handleInputChange("role", value)
                        }
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue
                            placeholder={t("form.rolePlaceholder")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">
                            {t("roles.student")}
                          </SelectItem>
                          <SelectItem value="teacher">
                            {t("roles.teacher")}
                          </SelectItem>
                          <SelectItem value="admin">
                            {t("roles.admin")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" onClick={handleAddStudent}>
                      {t("actions.saveStudent")}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="min-w-[200px] flex-1">
                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
                  <Input
                    placeholder={t("filters.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select
                value={selectedClassroom}
                onValueChange={handleClassroomFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue
                    placeholder={t("filters.classroomPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name} ({classroom.studentCount})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedCefrLevel}
                onValueChange={handleCefrLevelFilter}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={t("filters.cefrPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A0-">A0-</SelectItem>
                  <SelectItem value="A0">A0</SelectItem>
                  <SelectItem value="A0+">A0+</SelectItem>
                  <SelectItem value="A1-">A1-</SelectItem>
                  <SelectItem value="A1">A1</SelectItem>
                  <SelectItem value="A1+">A1+</SelectItem>
                  <SelectItem value="A2-">A2-</SelectItem>
                  <SelectItem value="A2">A2</SelectItem>
                  <SelectItem value="A2+">A2+</SelectItem>
                  <SelectItem value="B1-">B1-</SelectItem>
                  <SelectItem value="B1">B1</SelectItem>
                  <SelectItem value="B1+">B1+</SelectItem>
                  <SelectItem value="B2-">B2-</SelectItem>
                  <SelectItem value="B2">B2</SelectItem>
                  <SelectItem value="B2+">B2+</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="default"
                  onClick={clearFilters}
                  className="px-3"
                >
                  <X className="mr-2 h-4 w-4" />
                  {t("actions.clearFilters")}
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-2 h-5 w-5 rounded-full p-0 text-xs"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              )}
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 border-t pt-4">
                <span className="text-muted-foreground text-sm">
                  {t("filters.activeFiltersLabel")}
                </span>
                {searchQuery && (
                  <Badge variant="outline" className="text-xs">
                    {t("filters.searchLabel")} "{searchQuery}"
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedClassroom && (
                  <Badge variant="outline" className="text-xs">
                    {t("filters.classroomLabel")} {""}
                    {classrooms.find((c) => c.id === selectedClassroom)?.name ||
                      selectedClassroom}
                    <button
                      onClick={() => {
                        setSelectedClassroom("");
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {selectedCefrLevel && (
                  <Badge variant="outline" className="text-xs">
                    {t("filters.levelLabel")} {selectedCefrLevel}
                    <button
                      onClick={() => {
                        setSelectedCefrLevel("");
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="hover:text-destructive ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">{t("table.loading")}</span>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("tableHeaders.name")}</TableHead>
                      <TableHead>{t("tableHeaders.email")}</TableHead>
                      <TableHead>{t("tableHeaders.className")}</TableHead>
                      <TableHead>{t("tableHeaders.cefr")}</TableHead>
                      <TableHead>{t("tableHeaders.xp")}</TableHead>
                      <TableHead>{t("tableHeaders.role")}</TableHead>
                      <TableHead className="text-right">
                        {t("tableHeaders.actions")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-8 text-center">
                          {t("table.empty")}
                        </TableCell>
                      </TableRow>
                    ) : (
                      students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.name || "N/A"}
                          </TableCell>
                          <TableCell>{student.email || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant="default">
                              {student.className || t("badges.noClass")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{student.cefrLevel}</Badge>
                          </TableCell>
                          <TableCell>{student.xp.toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(student.role)}>
                              {student.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditStudent(student)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      {t("dialogs.delete.title")}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {t("dialogs.delete.description", {
                                        name:
                                          student.name || student.email || "",
                                      })}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      {t("actions.cancel")}
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteStudent(student.id)
                                      }
                                    >
                                      {t("actions.delete")}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-muted-foreground text-sm">
                      {t("pagination.showing", {
                        from: (pagination.page - 1) * pagination.limit + 1,
                        to: Math.min(
                          pagination.page * pagination.limit,
                          pagination.total,
                        ),
                        total: pagination.total,
                      })}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        {t("pagination.previous")}
                      </Button>
                      <span className="flex items-center px-3 text-sm">
                        {t("pagination.pageOf", {
                          page: pagination.page,
                          totalPages: pagination.totalPages,
                        })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                      >
                        {t("pagination.next")}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t("dialogs.edit.title")}</DialogTitle>
              <DialogDescription>
                {t("dialogs.edit.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  {t("form.name")}
                </Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="col-span-3"
                  placeholder={t("form.namePlaceholder")}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  {t("form.email")}
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="col-span-3"
                  placeholder={t("form.emailPlaceholder")}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-cefrLevel" className="text-right">
                  {t("form.cefrLevel")}
                </Label>
                <Select
                  value={formData.cefrLevel}
                  onValueChange={(value) =>
                    handleInputChange("cefrLevel", value)
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("form.cefrPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A0-">A0-</SelectItem>
                    <SelectItem value="A0">A0</SelectItem>
                    <SelectItem value="A0+">A0+</SelectItem>
                    <SelectItem value="A1-">A1-</SelectItem>
                    <SelectItem value="A1">A1</SelectItem>
                    <SelectItem value="A1+">A1+</SelectItem>
                    <SelectItem value="A2-">A2-</SelectItem>
                    <SelectItem value="A2">A2</SelectItem>
                    <SelectItem value="A2+">A2+</SelectItem>
                    <SelectItem value="B1-">B1-</SelectItem>
                    <SelectItem value="B1">B1</SelectItem>
                    <SelectItem value="B1+">B1+</SelectItem>
                    <SelectItem value="B2-">B2-</SelectItem>
                    <SelectItem value="B2">B2</SelectItem>
                    <SelectItem value="B2+">B2+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-role" className="text-right">
                  {t("form.role")}
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange("role", value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("form.rolePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      {t("roles.student")}
                    </SelectItem>
                    <SelectItem value="teacher">
                      {t("roles.teacher")}
                    </SelectItem>
                    <SelectItem value="admin">{t("roles.admin")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleUpdateStudent}>
                {t("actions.saveChanges")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
