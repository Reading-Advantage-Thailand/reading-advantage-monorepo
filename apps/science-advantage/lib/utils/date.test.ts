import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { formatRelativeTime } from "./date"

describe("formatRelativeTime", () => {
  const fixedDate = new Date("2025-01-15T12:00:00.000Z")

  beforeAll(() => {
    vi.useFakeTimers()
    vi.setSystemTime(fixedDate)
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  it("returns relative time in English", () => {
    const twoHoursAgo = new Date("2025-01-15T10:00:00.000Z")
    expect(formatRelativeTime(twoHoursAgo, "en")).toBe("2 hours ago")
  })

  it("returns relative time in Thai", () => {
    const yesterday = new Date("2025-01-14T12:00:00.000Z")
    expect(formatRelativeTime(yesterday, "th")).toBe("เมื่อวาน")
  })

  it("falls back to dash for invalid dates", () => {
    expect(formatRelativeTime("not-a-date")).toBe("—")
  })
})
