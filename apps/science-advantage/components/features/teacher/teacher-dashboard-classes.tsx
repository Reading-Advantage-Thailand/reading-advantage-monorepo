"use client"

import * as React from "react"
import Link from "next/link"
import type { StandardsAlignment } from "@/lib/enums"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ClassCard } from "@/components/features/classes/class-card"
import { ClassCardSkeleton } from "@/components/features/classes/class-card-skeleton"

const PAGE_LIMIT = 20
const MIN_SKELETON_CARDS = 3

interface ClassSummary {
  id: string
  name: string
  gradeLevel: number
  standardsAlignment: StandardsAlignment
  studentCount: number
  createdAt: string
}

interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ListClassesSuccess {
  success: true
  data: ClassSummary[]
  pagination: PaginationMeta
}

interface ListClassesError {
  success: false
  error: string
}

type ListClassesResponse = ListClassesSuccess | ListClassesError

const TEXT = {
  heading: {
    title: { en: "My Classes", th: "ชั้นเรียนของฉัน" },
    description: {
      en: "Classes you're teaching",
      th: "ชั้นเรียนที่คุณกำลังสอน",
    },
  },
  viewAll: { en: "View all", th: "ดูทั้งหมด" },
  empty: {
    title: {
      en: "You haven't created any classes yet",
      th: "คุณยังไม่ได้สร้างชั้นเรียน",
    },
    description: {
      en: "Create your first class to start assigning curriculum to students.",
      th: "สร้างชั้นเรียนแรกของคุณเพื่อเริ่มมอบหมายหลักสูตรให้นักเรียน",
    },
    cta: {
      en: "Create Your First Class",
      th: "สร้างชั้นเรียนแรกของคุณ",
    },
  },
  error: {
    title: {
      en: "Unable to load classes",
      th: "ไม่สามารถโหลดชั้นเรียนได้",
    },
    description: {
      en: "Please check your connection and try again.",
      th: "โปรดตรวจสอบการเชื่อมต่อของคุณแล้วลองอีกครั้ง",
    },
  },
  retry: { en: "Retry", th: "ลองอีกครั้ง" },
  loadMore: { en: "Load more", th: "โหลดเพิ่มเติม" },
}

function DualText({
  text,
  className,
  secondaryClassName,
}: {
  text: { en: string; th: string }
  className?: string
  secondaryClassName?: string
}) {
  return (
    <span className="flex flex-col leading-tight">
      <span className={className}>{text.en}</span>
      <span className={secondaryClassName ?? "text-xs text-gray-500"}>{text.th}</span>
    </span>
  )
}

export function TeacherDashboardClasses() {
  const [classes, setClasses] = React.useState<ClassSummary[]>([])
  const [pagination, setPagination] = React.useState<PaginationMeta | null>(null)
  const [isInitialLoading, setIsInitialLoading] = React.useState(true)
  const [isLoadingMore, setIsLoadingMore] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const hasMore = React.useMemo(() => {
    if (!pagination) {
      return false
    }

    return pagination.page < pagination.totalPages
  }, [pagination])

  const fetchClasses = React.useCallback(
    async (page: number, append: boolean) => {
      if (append) {
        setIsLoadingMore(true)
      } else {
        setIsInitialLoading(true)
      }

      setError(null)

      try {
        const response = await fetch(`/api/classes?page=${page}&limit=${PAGE_LIMIT}`, {
          method: "GET",
          credentials: "include",
        })

        const payload = (await response.json()) as ListClassesResponse

        if (!response.ok || !payload.success) {
          const message =
            !response.ok && response.status === 401
              ? "Session expired. Please sign in again."
              : payload.success
                ? "Unknown error"
                : payload.error
          throw new Error(message)
        }

        setClasses(prev =>
          append ? [...prev, ...payload.data] : payload.data
        )
        setPagination(payload.pagination)
      } catch (err) {
        console.error("Failed to load classes", err)
        const message =
          err instanceof Error ? err.message : "Unable to load classes"
        setError(message)
      } finally {
        setIsInitialLoading(false)
        setIsLoadingMore(false)
      }
    },
    [],
  )

  React.useEffect(() => {
    void fetchClasses(1, false)
  }, [fetchClasses])

  const handleRetry = React.useCallback(() => {
    void fetchClasses(1, false)
  }, [fetchClasses])

  const handleLoadMore = React.useCallback(() => {
    if (!pagination) {
      return
    }

    const nextPage = pagination.page + 1
    void fetchClasses(nextPage, true)
  }, [fetchClasses, pagination])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            <DualText text={TEXT.heading.title} secondaryClassName="text-base font-semibold text-gray-600" />
          </CardTitle>
          <CardDescription>
            <DualText text={TEXT.heading.description} />
          </CardDescription>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          aria-label={`${TEXT.viewAll.en} / ${TEXT.viewAll.th}`}
        >
          <Link href="/teacher/classes">
            <DualText text={TEXT.viewAll} />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p className="font-semibold">{TEXT.error.title.en}</p>
            <p className="text-xs text-red-600">{TEXT.error.title.th}</p>
            <p className="mt-2 text-gray-700">{TEXT.error.description.en}</p>
            <p className="text-xs text-gray-500">{TEXT.error.description.th}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={handleRetry}
            >
              <DualText text={TEXT.retry} />
            </Button>
          </div>
        ) : null}

        {isInitialLoading ? (
          <div
            aria-live="polite"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {Array.from({ length: MIN_SKELETON_CARDS }).map((_, index) => (
              <ClassCardSkeleton key={`class-skeleton-${index}`} />
            ))}
          </div>
        ) : null}

        {!isInitialLoading && !error && classes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900">
              <DualText text={TEXT.empty.title} secondaryClassName="text-sm font-medium text-gray-600" />
            </h3>
            <p className="mt-3 text-sm text-gray-600">
              <DualText text={TEXT.empty.description} />
            </p>
            <Button asChild variant="default" className="mt-6">
              <Link
                href="/teacher/classes#create-class"
                aria-label={`${TEXT.empty.cta.en} / ${TEXT.empty.cta.th}`}
              >
                <DualText text={TEXT.empty.cta} />
              </Link>
            </Button>
          </div>
        ) : null}

        {!isInitialLoading && !error && classes.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {classes.map(cls => (
              <ClassCard key={cls.id} classInfo={cls} />
            ))}
          </div>
        ) : null}

        {!isInitialLoading && !error && hasMore ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <DualText text={{ en: "Loading…", th: "กำลังโหลด..." }} />
              ) : (
                <DualText text={TEXT.loadMore} />
              )}
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
