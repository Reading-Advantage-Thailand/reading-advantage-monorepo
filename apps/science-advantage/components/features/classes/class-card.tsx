"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { StandardsAlignment } from "@prisma/client"

import {
  formatGradeLevel,
  formatStudentCount,
  getStandardsAlignmentLabel,
} from "@/lib/utils/class-format"
import { formatRelativeTime } from "@/lib/utils/date"

interface ClassCardProps {
  classInfo: {
    id: string
    name: string
    gradeLevel: number
    standardsAlignment: StandardsAlignment
    studentCount: number
    createdAt: string
  }
}

export function ClassCard({ classInfo }: ClassCardProps) {
  const gradeEn = formatGradeLevel(classInfo.gradeLevel, "en")
  const gradeTh = formatGradeLevel(classInfo.gradeLevel, "th")
  const standardsEn = getStandardsAlignmentLabel(classInfo.standardsAlignment, "en")
  const standardsTh = getStandardsAlignmentLabel(classInfo.standardsAlignment, "th")
  const studentsEn = formatStudentCount(classInfo.studentCount, "en")
  const studentsTh = formatStudentCount(classInfo.studentCount, "th")
  const createdEn = formatRelativeTime(classInfo.createdAt, "en")
  const createdTh = formatRelativeTime(classInfo.createdAt, "th")

  const ariaLabel = [
    `Class card: ${classInfo.name}. ${gradeEn}. ${studentsEn}.`,
    `การ์ดชั้นเรียน: ${classInfo.name}. ${gradeTh}. ${studentsTh}.`,
  ].join(" / ")

  return (
    <Link
      href={`/teacher/classes/${classInfo.id}`}
      aria-label={ariaLabel}
      className="group flex h-full flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
    >
      <div className="flex flex-col gap-3">
        <div className="text-xs font-semibold uppercase text-rose-500">
          <span>{`Created ${createdEn}`}</span>
          <span className="block text-[11px] text-rose-400">{`สร้างเมื่อ ${createdTh}`}</span>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-gray-900">{classInfo.name}</h3>
          <p className="mt-1 text-sm text-gray-700">
            {gradeEn}
            <span className="block text-xs text-gray-500">{gradeTh}</span>
          </p>
          <p className="text-sm text-gray-600">
            {standardsEn}
            <span className="block text-xs text-gray-500">{standardsTh}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-medium text-gray-800">
            {studentsEn}
          </span>
          <span className="block text-xs text-gray-500">{studentsTh}</span>
        </div>

        <span className="inline-flex items-center gap-2 text-sm font-semibold text-rose-600">
          <span className="flex flex-col leading-tight">
            <span>View class details</span>
            <span className="text-xs font-normal text-rose-500">ดูรายละเอียดชั้นเรียน</span>
          </span>
          <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  )
}
