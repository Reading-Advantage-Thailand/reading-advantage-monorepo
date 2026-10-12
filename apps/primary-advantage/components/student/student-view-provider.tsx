"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { StudentViewMode } from "@/lib/student-view";

const StudentViewContext = createContext<{ mode: StudentViewMode }>({ mode: "student" });

/**
 * Gives the student view mode (set by the server layout) to the client components below.
 * @param props.mode The mode derived from the session role.
 * @param props.children The student pages.
 * @returns The provider.
 */
export function StudentViewProvider({ mode, children }: { mode: StudentViewMode; children: ReactNode }) {
  return <StudentViewContext.Provider value={{ mode }}>{children}</StudentViewContext.Provider>;
}

/**
 * Reads the student view mode. A component that writes must skip its write path in preview.
 * @returns The mode; "student" when no provider wraps the component.
 */
export function useStudentView(): { mode: StudentViewMode } {
  return useContext(StudentViewContext);
}
