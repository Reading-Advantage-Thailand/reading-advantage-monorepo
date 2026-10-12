import { describe, expect, it } from "vitest";
import {
  getLessonProgressForTask,
  getLessonTaskFromProgress,
} from "../lesson-progress";

describe("getLessonTaskFromProgress", () => {
  it("opens task 1 for 0, negative, and NaN", () => {
    expect(getLessonTaskFromProgress(0)).toBe(1);
    expect(getLessonTaskFromProgress(-5)).toBe(1);
    expect(getLessonTaskFromProgress(NaN)).toBe(1);
  });
  it("never opens task 1 for a started lesson", () => {
    expect(getLessonTaskFromProgress(7)).toBe(2);
    expect(getLessonTaskFromProgress(14)).toBe(2);
  });
  it("opens task 13 for 93 and the summary for 100 or more", () => {
    expect(getLessonTaskFromProgress(93)).toBe(13);
    expect(getLessonTaskFromProgress(100)).toBe(14);
    expect(getLessonTaskFromProgress(150)).toBe(14);
  });
});

describe("getLessonProgressForTask", () => {
  it("maps tasks to percents", () => {
    expect(getLessonProgressForTask(1)).toBe(0);
    expect(getLessonProgressForTask(2)).toBe(14);
    expect(getLessonProgressForTask(13)).toBe(93);
    expect(getLessonProgressForTask(14)).toBe(100);
  });
  it("round-trips each task from 2 to 14, and task 1", () => {
    for (let task = 1; task <= 14; task++) {
      expect(getLessonTaskFromProgress(getLessonProgressForTask(task))).toBe(task);
    }
  });
});
