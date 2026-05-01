"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import StudentEnrollmentButton from "./student-enrollment-button";
import StudentUnenrollmentButton from "./student-unenrollment-button";
import {
  Users,
  GraduationCap,
  BookOpen,
  Star,
  UserPlus,
  UserMinus,
} from "lucide-react";

/**
 * Demo component showing how to use the enrollment functionality
 * This demonstrates both the enrollment and un-enrollment components
 * with responsive design using Shadcn UI and Tailwind CSS
 */
export default function EnrollmentDemo() {
  // Mock data for demonstration
  const mockClassroom = {
    id: "demo-classroom-1",
    name: "Advanced English Literature",
    teacherId: "teacher-1",
    grade: "Grade 10",
    studentCount: 25,
  };

  const mockEnrolledStudent = {
    id: "student-1",
    name: "John Doe",
    email: "john.doe@example.com",
    cefrLevel: "B2",
    level: 15,
    xp: 2850,
  };

  const handleStudentEnrolled = (student: any) => {
    console.log("Student enrolled:", student);
    // In a real app, you would refresh the student list here
  };

  const handleStudentUnenrolled = (studentId: string) => {
    console.log("Student unenrolled:", studentId);
    // In a real app, you would refresh the student list here
  };

  return (
    <div className="container mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Student Enrollment System
        </h1>
        <p className="mx-auto max-w-2xl text-gray-600">
          A responsive enrollment management system built with Shadcn UI and
          Tailwind CSS. Teachers can easily enroll and unenroll students with
          intuitive dialogs and confirmations.
        </p>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="text-center">
            <UserPlus className="mx-auto mb-2 h-8 w-8 text-blue-600" />
            <CardTitle className="text-lg">Easy Enrollment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-gray-600">
              Search and enroll students with a clean, responsive dialog
              interface
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <UserMinus className="mx-auto mb-2 h-8 w-8 text-red-600" />
            <CardTitle className="text-lg">Safe Unenrollment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-gray-600">
              Confirmation dialogs prevent accidental student removal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-green-600" />
            <CardTitle className="text-lg">Responsive Design</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-gray-600">
              Works perfectly on desktop, tablet, and mobile devices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classroom Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Classroom Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {mockClassroom.name}
                </h3>
                <p className="text-sm text-gray-600">{mockClassroom.grade}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {mockClassroom.studentCount} Students
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  Active Class
                </Badge>
              </div>

              <div className="pt-4">
                <h4 className="mb-2 font-medium text-gray-900">Actions</h4>
                <div className="flex flex-wrap gap-2">
                  <StudentEnrollmentButton
                    classroomId={mockClassroom.id}
                    classroomName={mockClassroom.name}
                    onStudentEnrolled={handleStudentEnrolled}
                    buttonText="Enroll New Student"
                    buttonSize="sm"
                  />
                  <Button variant="outline" size="sm">
                    <BookOpen className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </div>
              </div>
            </div>

            {/* Sample Student Card */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">
                Sample Enrolled Student
              </h4>
              <Card className="border-2 border-dashed border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900">
                        {mockEnrolledStudent.name}
                      </h5>
                      <p className="text-sm text-gray-500">
                        {mockEnrolledStudent.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800"
                        >
                          {mockEnrolledStudent.cefrLevel}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <GraduationCap className="mr-1 h-3 w-3" />
                          Lvl {mockEnrolledStudent.level}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Star className="mr-1 h-3 w-3" />
                          {mockEnrolledStudent.xp} XP
                        </Badge>
                      </div>
                    </div>
                    <StudentUnenrollmentButton
                      student={mockEnrolledStudent}
                      classroomId={mockClassroom.id}
                      classroomName={mockClassroom.name}
                      onStudentUnenrolled={handleStudentUnenrolled}
                      buttonSize="sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                <UserPlus className="h-4 w-4 text-blue-600" />
                Enrolling Students
              </h4>
              <ol className="list-inside list-decimal space-y-2 text-sm text-gray-600">
                <li>Click the "Enroll Student" button</li>
                <li>Search for students by name or email</li>
                <li>View student information (CEFR level, XP, etc.)</li>
                <li>Click "Enroll" next to the desired student</li>
                <li>Student is immediately added to the classroom</li>
              </ol>
            </div>

            <div>
              <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                <UserMinus className="h-4 w-4 text-red-600" />
                Unenrolling Students
              </h4>
              <ol className="list-inside list-decimal space-y-2 text-sm text-gray-600">
                <li>Find the student in the class roster</li>
                <li>Click the unenroll button (minus icon)</li>
                <li>Read the confirmation dialog carefully</li>
                <li>Confirm the action to remove the student</li>
                <li>Student loses access to class content</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Features */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <h5 className="mb-2 font-medium text-gray-900">
                Responsive Design
              </h5>
              <p className="text-sm text-gray-600">
                Built with Tailwind CSS for mobile-first responsive layouts
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h5 className="mb-2 font-medium text-gray-900">
                Shadcn UI Components
              </h5>
              <p className="text-sm text-gray-600">
                Uses Dialog, AlertDialog, Button, Input, and other Shadcn
                components
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h5 className="mb-2 font-medium text-gray-900">
                API Integration
              </h5>
              <p className="text-sm text-gray-600">
                RESTful API endpoints for enrollment operations with error
                handling
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h5 className="mb-2 font-medium text-gray-900">
                Real-time Updates
              </h5>
              <p className="text-sm text-gray-600">
                Immediate UI updates with callback functions for data refresh
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h5 className="mb-2 font-medium text-gray-900">Loading States</h5>
              <p className="text-sm text-gray-600">
                Skeleton loaders and spinner animations during API calls
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <h5 className="mb-2 font-medium text-gray-900">
                Toast Notifications
              </h5>
              <p className="text-sm text-gray-600">
                Success and error messages using Sonner toast library
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
