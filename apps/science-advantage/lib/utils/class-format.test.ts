import { describe, expect, it } from "vitest"

import {
  formatGradeLevel,
  formatStudentCount,
  getStandardsAlignmentLabel,
} from "./class-format"

describe("class-format utilities", () => {
  it("returns standards alignment labels in both languages", () => {
    expect(getStandardsAlignmentLabel("THAI", "en")).toBe("Thai National Standards")
    expect(getStandardsAlignmentLabel("THAI", "th")).toBe("มาตรฐานการศึกษาของไทย")
  })

  it("formats student counts with localization", () => {
    expect(formatStudentCount(1, "en")).toBe("1 student")
    expect(formatStudentCount(2, "en")).toBe("2 students")
    expect(formatStudentCount(0, "en")).toBe("No students yet")
    expect(formatStudentCount(3, "th")).toBe("3 นักเรียน")
    expect(formatStudentCount(0, "th")).toBe("ยังไม่มีนักเรียน")
  })

  it("formats grade levels", () => {
    expect(formatGradeLevel(4, "en")).toBe("Grade 4")
    expect(formatGradeLevel(4, "th")).toBe("ชั้นประถมศึกษาปีที่ 4")
  })
})
