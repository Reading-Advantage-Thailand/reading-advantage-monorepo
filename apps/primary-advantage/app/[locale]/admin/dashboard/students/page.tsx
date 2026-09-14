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
import type { StudentFormData } from "@/types";

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

}
