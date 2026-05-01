"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { type StudentEnrolledClass } from "@/lib/validations/student-classes"
import { formatGradeLevel } from "@/lib/utils/class-format"
import { formatRelativeTime } from "@/lib/utils/date"

interface StudentClassCardProps {
  classInfo: StudentEnrolledClass
}

export function StudentClassCard({ classInfo }: StudentClassCardProps) {
  const gradeLabel = formatGradeLevel(classInfo.gradeLevel, "en")
  const enrolledRelativeEn = formatRelativeTime(classInfo.enrolledAt, "en")
  const enrolledRelativeTh = formatRelativeTime(classInfo.enrolledAt, "th")

  return (
    <Link
      href={`/student/classes/${classInfo.id}`}
      aria-label={`View ${classInfo.name} class`}
      className="group block h-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {classInfo.name}
            </h3>
            <p className="mt-1 text-sm text-gray-700">{gradeLabel}</p>
            <p className="text-sm text-gray-600">
              Teacher:{" "}
              <span className="font-medium text-gray-800">
                {classInfo.teacherName}
              </span>
            </p>
          </div>
          <ArrowRight className="mt-1 h-5 w-5 text-rose-500 transition-transform duration-150 group-hover:translate-x-1" />
        </div>

        <div className="text-xs text-gray-500">
          <span className="font-medium text-gray-600">Joined </span>
          <span>
            {enrolledRelativeEn}
            <span className="ml-1 text-[11px] text-gray-400">
              ({enrolledRelativeTh})
            </span>
          </span>
        </div>
      </div>
    </Link>
  )
}
