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
} from "lucide-react";
import React, { useState } from "react";

// Student interface based on the User model
interface Student {
  id: string;
  name: string | null;
  email: string | null;
  cefrLevel: string | null;
  xp: number;
  role: string;
  createdAt: string;
}

// Form data interface
interface StudentFormData {
  name: string;
  email: string;
  cefrLevel: string;
  role: string;
}

export default function DashboardPage() {
  // Sample data - replace with actual API calls
  const [students, setStudents] = useState<Student[]>([
    {
      id: "1",
      name: "John Doe",
      email: "john.doe@example.com",
      cefrLevel: "B1",
      xp: 1250,
      role: "student",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      cefrLevel: "A2",
      xp: 800,
      role: "student",
      createdAt: "2024-01-20",
    },
    {
      id: "3",
      name: "Mike Johnson",
      email: "mike.johnson@example.com",
      cefrLevel: "C1",
      xp: 2100,
      role: "student",
      createdAt: "2024-02-01",
    },
  ]);

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
    };

    setStudents((prev) => [...prev, newStudent]);
    setIsAddDialogOpen(false);
    resetForm();
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
  };

  // Handle delete student
  const handleDeleteStudent = (id: string) => {
    setStudents((prev) => prev.filter((student) => student.id !== id));
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

  return <div>Students</div>;

  // return (
  //   <div>
  //     <Header
  //       heading="Students Dashboard"
  //       text="Students Dashboard Description"
  //     />
  //     <Separator className="my-4" />
  //     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  //       <Card>
  //         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
  //           <CardTitle className="text-sm font-medium">
  //             Total Students
  //           </CardTitle>
  //           <Users className="text-muted-foreground h-4 w-4" />
  //         </CardHeader>
  //         <CardContent>
  //           <div className="text-2xl font-bold">100</div>
  //           <p className="text-muted-foreground text-xs">All classrooms</p>
  //         </CardContent>
  //       </Card>

  //       <Card>
  //         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
  //           <CardTitle className="text-sm font-medium">Average XP</CardTitle>
  //           <TrendingUp className="text-muted-foreground h-4 w-4" />
  //         </CardHeader>
  //         <CardContent>
  //           <div className="text-2xl font-bold">100</div>
  //           <p className="text-muted-foreground text-xs">
  //             Experience points per student
  //           </p>
  //         </CardContent>
  //       </Card>

  //       <Card>
  //         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
  //           <CardTitle className="text-sm font-medium">
  //             Most Common Level
  //           </CardTitle>
  //           <BookOpen className="text-muted-foreground h-4 w-4" />
  //         </CardHeader>
  //         <CardContent>
  //           <div className="text-2xl font-bold">A0</div>
  //           <p className="text-muted-foreground text-xs">
  //             CEFR proficiency level
  //           </p>
  //         </CardContent>
  //       </Card>

  //       <Card>
  //         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
  //           <CardTitle className="text-sm font-medium">
  //             Active This Week
  //           </CardTitle>
  //           <Clock className="text-muted-foreground h-4 w-4" />
  //         </CardHeader>
  //         <CardContent>
  //           <div className="text-2xl font-bold">100%</div>
  //           <p className="text-muted-foreground text-xs">100 of 100 students</p>
  //         </CardContent>
  //       </Card>
  //     </div>
  //     <div className="mt-6 space-y-6">
  //       <Card>
  //         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
  //           <CardTitle>Students Management</CardTitle>
  //           <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
  //             <DialogTrigger asChild>
  //               <Button onClick={() => resetForm()}>
  //                 <Plus className="mr-2 h-4 w-4" />
  //                 Add Student
  //               </Button>
  //             </DialogTrigger>
  //             <DialogContent className="sm:max-w-[425px]">
  //               <DialogHeader>
  //                 <DialogTitle>Add New Student</DialogTitle>
  //                 <DialogDescription>
  //                   Create a new student account. Click save when you're done.
  //                 </DialogDescription>
  //               </DialogHeader>
  //               <div className="grid gap-4 py-4">
  //                 <div className="grid grid-cols-4 items-center gap-4">
  //                   <Label htmlFor="name" className="text-right">
  //                     Name
  //                   </Label>
  //                   <Input
  //                     id="name"
  //                     value={formData.name}
  //                     onChange={(e) =>
  //                       handleInputChange("name", e.target.value)
  //                     }
  //                     className="col-span-3"
  //                     placeholder="Enter student name"
  //                   />
  //                 </div>
  //                 <div className="grid grid-cols-4 items-center gap-4">
  //                   <Label htmlFor="email" className="text-right">
  //                     Email
  //                   </Label>
  //                   <Input
  //                     id="email"
  //                     type="email"
  //                     value={formData.email}
  //                     onChange={(e) =>
  //                       handleInputChange("email", e.target.value)
  //                     }
  //                     className="col-span-3"
  //                     placeholder="Enter email address"
  //                   />
  //                 </div>
  //                 <div className="grid grid-cols-4 items-center gap-4">
  //                   <Label htmlFor="cefrLevel" className="text-right">
  //                     CEFR Level
  //                   </Label>
  //                   <Select
  //                     value={formData.cefrLevel}
  //                     onValueChange={(value) =>
  //                       handleInputChange("cefrLevel", value)
  //                     }
  //                   >
  //                     <SelectTrigger className="col-span-3">
  //                       <SelectValue placeholder="Select CEFR level" />
  //                     </SelectTrigger>
  //                     <SelectContent>
  //                       <SelectItem value="A1-">A1-</SelectItem>
  //                       <SelectItem value="A1">A1</SelectItem>
  //                       <SelectItem value="A1+">A1+</SelectItem>
  //                       <SelectItem value="A2-">A2-</SelectItem>
  //                       <SelectItem value="A2">A2</SelectItem>
  //                       <SelectItem value="A2+">A2+</SelectItem>
  //                       <SelectItem value="B1-">B1-</SelectItem>
  //                       <SelectItem value="B1">B1</SelectItem>
  //                       <SelectItem value="B1+">B1+</SelectItem>
  //                       <SelectItem value="B2-">B2-</SelectItem>
  //                       <SelectItem value="B2">B2</SelectItem>
  //                       <SelectItem value="B2+">B2+</SelectItem>
  //                       <SelectItem value="C1-">C1-</SelectItem>
  //                       <SelectItem value="C1">C1</SelectItem>
  //                       <SelectItem value="C1+">C1+</SelectItem>
  //                       <SelectItem value="C2">C2</SelectItem>
  //                     </SelectContent>
  //                   </Select>
  //                 </div>
  //                 <div className="grid grid-cols-4 items-center gap-4">
  //                   <Label htmlFor="role" className="text-right">
  //                     Role
  //                   </Label>
  //                   <Select
  //                     value={formData.role}
  //                     onValueChange={(value) =>
  //                       handleInputChange("role", value)
  //                     }
  //                   >
  //                     <SelectTrigger className="col-span-3">
  //                       <SelectValue placeholder="Select role" />
  //                     </SelectTrigger>
  //                     <SelectContent>
  //                       <SelectItem value="student">Student</SelectItem>
  //                       <SelectItem value="teacher">Teacher</SelectItem>
  //                       <SelectItem value="admin">Admin</SelectItem>
  //                     </SelectContent>
  //                   </Select>
  //                 </div>
  //               </div>
  //               <DialogFooter>
  //                 <Button type="submit" onClick={handleAddStudent}>
  //                   Save Student
  //                 </Button>
  //               </DialogFooter>
  //             </DialogContent>
  //           </Dialog>
  //         </CardHeader>
  //         <CardContent>
  //           <Table>
  //             <TableHeader>
  //               <TableRow>
  //                 <TableHead>Name</TableHead>
  //                 <TableHead>Email</TableHead>
  //                 <TableHead>CEFR Level</TableHead>
  //                 <TableHead>XP</TableHead>
  //                 <TableHead>Role</TableHead>
  //                 <TableHead>Created</TableHead>
  //                 <TableHead className="text-right">Actions</TableHead>
  //               </TableRow>
  //             </TableHeader>
  //             <TableBody>
  //               {students.map((student) => (
  //                 <TableRow key={student.id}>
  //                   <TableCell className="font-medium">
  //                     {student.name || "N/A"}
  //                   </TableCell>
  //                   <TableCell>{student.email || "N/A"}</TableCell>
  //                   <TableCell>
  //                     <Badge variant="outline">{student.cefrLevel}</Badge>
  //                   </TableCell>
  //                   <TableCell>{student.xp.toLocaleString()}</TableCell>
  //                   <TableCell>
  //                     <Badge variant={getRoleBadgeVariant(student.role)}>
  //                       {student.role}
  //                     </Badge>
  //                   </TableCell>
  //                   <TableCell>{student.createdAt}</TableCell>
  //                   <TableCell className="text-right">
  //                     <div className="flex justify-end gap-2">
  //                       <Button
  //                         variant="outline"
  //                         size="sm"
  //                         onClick={() => handleEditStudent(student)}
  //                       >
  //                         <Edit className="h-4 w-4" />
  //                       </Button>
  //                       <AlertDialog>
  //                         <AlertDialogTrigger asChild>
  //                           <Button variant="outline" size="sm">
  //                             <Trash2 className="h-4 w-4" />
  //                           </Button>
  //                         </AlertDialogTrigger>
  //                         <AlertDialogContent>
  //                           <AlertDialogHeader>
  //                             <AlertDialogTitle>Are you sure?</AlertDialogTitle>
  //                             <AlertDialogDescription>
  //                               This action cannot be undone. This will
  //                               permanently delete{" "}
  //                               <strong>{student.name || student.email}</strong>
  //                               's account and remove their data from our
  //                               servers.
  //                             </AlertDialogDescription>
  //                           </AlertDialogHeader>
  //                           <AlertDialogFooter>
  //                             <AlertDialogCancel>Cancel</AlertDialogCancel>
  //                             <AlertDialogAction
  //                               onClick={() => handleDeleteStudent(student.id)}
  //                             >
  //                               Delete
  //                             </AlertDialogAction>
  //                           </AlertDialogFooter>
  //                         </AlertDialogContent>
  //                       </AlertDialog>
  //                     </div>
  //                   </TableCell>
  //                 </TableRow>
  //               ))}
  //             </TableBody>
  //           </Table>
  //         </CardContent>
  //       </Card>

  //       {/* Edit Student Dialog */}
  //       <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
  //         <DialogContent className="sm:max-w-[425px]">
  //           <DialogHeader>
  //             <DialogTitle>Edit Student</DialogTitle>
  //             <DialogDescription>
  //               Make changes to the student account. Click save when you're
  //               done.
  //             </DialogDescription>
  //           </DialogHeader>
  //           <div className="grid gap-4 py-4">
  //             <div className="grid grid-cols-4 items-center gap-4">
  //               <Label htmlFor="edit-name" className="text-right">
  //                 Name
  //               </Label>
  //               <Input
  //                 id="edit-name"
  //                 value={formData.name}
  //                 onChange={(e) => handleInputChange("name", e.target.value)}
  //                 className="col-span-3"
  //                 placeholder="Enter student name"
  //               />
  //             </div>
  //             <div className="grid grid-cols-4 items-center gap-4">
  //               <Label htmlFor="edit-email" className="text-right">
  //                 Email
  //               </Label>
  //               <Input
  //                 id="edit-email"
  //                 type="email"
  //                 value={formData.email}
  //                 onChange={(e) => handleInputChange("email", e.target.value)}
  //                 className="col-span-3"
  //                 placeholder="Enter email address"
  //               />
  //             </div>
  //             <div className="grid grid-cols-4 items-center gap-4">
  //               <Label htmlFor="edit-cefrLevel" className="text-right">
  //                 CEFR Level
  //               </Label>
  //               <Select
  //                 value={formData.cefrLevel}
  //                 onValueChange={(value) =>
  //                   handleInputChange("cefrLevel", value)
  //                 }
  //               >
  //                 <SelectTrigger className="col-span-3">
  //                   <SelectValue placeholder="Select CEFR level" />
  //                 </SelectTrigger>
  //                 <SelectContent>
  //                   <SelectItem value="A1-">A1-</SelectItem>
  //                   <SelectItem value="A1">A1</SelectItem>
  //                   <SelectItem value="A1+">A1+</SelectItem>
  //                   <SelectItem value="A2-">A2-</SelectItem>
  //                   <SelectItem value="A2">A2</SelectItem>
  //                   <SelectItem value="A2+">A2+</SelectItem>
  //                   <SelectItem value="B1-">B1-</SelectItem>
  //                   <SelectItem value="B1">B1</SelectItem>
  //                   <SelectItem value="B1+">B1+</SelectItem>
  //                   <SelectItem value="B2-">B2-</SelectItem>
  //                   <SelectItem value="B2">B2</SelectItem>
  //                   <SelectItem value="B2+">B2+</SelectItem>
  //                   <SelectItem value="C1-">C1-</SelectItem>
  //                   <SelectItem value="C1">C1</SelectItem>
  //                   <SelectItem value="C1+">C1+</SelectItem>
  //                   <SelectItem value="C2">C2</SelectItem>
  //                 </SelectContent>
  //               </Select>
  //             </div>
  //             <div className="grid grid-cols-4 items-center gap-4">
  //               <Label htmlFor="edit-role" className="text-right">
  //                 Role
  //               </Label>
  //               <Select
  //                 value={formData.role}
  //                 onValueChange={(value) => handleInputChange("role", value)}
  //               >
  //                 <SelectTrigger className="col-span-3">
  //                   <SelectValue placeholder="Select role" />
  //                 </SelectTrigger>
  //                 <SelectContent>
  //                   <SelectItem value="student">Student</SelectItem>
  //                   <SelectItem value="teacher">Teacher</SelectItem>
  //                   <SelectItem value="admin">Admin</SelectItem>
  //                 </SelectContent>
  //               </Select>
  //             </div>
  //           </div>
  //           <DialogFooter>
  //             <Button type="submit" onClick={handleUpdateStudent}>
  //               Save Changes
  //             </Button>
  //           </DialogFooter>
  //         </DialogContent>
  //       </Dialog>
  //     </div>
  //   </div>
  // );
}
