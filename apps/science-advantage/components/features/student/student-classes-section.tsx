"use client"

import * as React from "react"
import { AlertCircle, RefreshCcw } from "lucide-react"
import { ZodError } from "zod"

import { Button } from "@/components/ui/button"
import { StudentClassCard } from "@/components/features/student/student-class-card"
import { StudentClassCardSkeleton } from "@/components/features/student/student-class-card-skeleton"
import {
  type StudentEnrolledClass,
  studentEnrolledClassesResponseSchema,
} from "@/lib/validations/student-classes"

type FetchState = "idle" | "loading" | "success" | "error"

export function StudentClassesSection() {
  const [classes, setClasses] = React.useState<StudentEnrolledClass[]>([])
  const [status, setStatus] = React.useState<FetchState>("idle")
  const [error, setError] = React.useState<string | null>(null)
  const [reloadToken, setReloadToken] = React.useState(0)

  React.useEffect(() => {
    let isActive = true
    const controller = new AbortController()

    async function loadClasses() {
      setStatus("loading")
      setError(null)

      try {
        const response = await fetch("/api/student/classes", {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        })

        let payload: unknown = null

        try {
          payload = await response.json()
        } catch (jsonError) {
          if (response.ok) {
            throw new Error("Unable to parse classes response")
          }
          throw jsonError
        }

        if (!response.ok) {
          const message =
            typeof (payload as { error?: string } | null)?.error === "string"
              ? (payload as { error: string }).error
              : response.status === 401
                ? "Session expired. Please sign in again."
                : response.status === 403
                  ? "You do not have access to student classes."
                  : "Unable to load enrolled classes."

          throw new Error(message)
        }

        const parsed = studentEnrolledClassesResponseSchema.parse(payload)

        if (isActive) {
          setClasses(parsed.classes)
          setStatus("success")
        }
      } catch (err) {
        if (!isActive) {
          return
        }

        if (err instanceof DOMException && err.name === "AbortError") {
          return
        }

        console.error("Failed to load student classes", err)

        if (err instanceof ZodError) {
          setError("Received an unexpected response from the server.")
        } else if (err instanceof Error) {
          setError(err.message || "Unable to load enrolled classes.")
        } else {
          setError("Unable to load enrolled classes.")
        }

        setStatus("error")
      }
    }

    void loadClasses()

    return () => {
      isActive = false
      controller.abort()
    }
  }, [reloadToken])

  const handleRetry = React.useCallback(() => {
    setReloadToken(token => token + 1)
  }, [])

  if (status === "loading" && classes.length === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <StudentClassCardSkeleton />
        <StudentClassCardSkeleton />
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>{error ?? "Unable to load enrolled classes."}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="inline-flex items-center gap-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  const hasClasses = classes.length > 0

  return (
    <div className="space-y-6">
      {hasClasses ? (
        <div className="grid gap-4 md:grid-cols-2">
          {classes.map(enrolledClass => (
            <StudentClassCard
              key={enrolledClass.id}
              classInfo={enrolledClass}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-600">
          <p className="font-medium text-gray-800">
            You&apos;re not enrolled in any classes yet.
          </p>
          <p className="mt-2 text-gray-600">
            Ask your teacher for a class code and join using the form below.
          </p>
        </div>
      )}

      {status === "loading" && hasClasses && (
        <div className="grid gap-4 md:grid-cols-2">
          <StudentClassCardSkeleton />
          <StudentClassCardSkeleton />
        </div>
      )}
    </div>
  )
}
