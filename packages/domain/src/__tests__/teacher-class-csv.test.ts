import { describe, expect, it } from "vitest";
import { quoteCsvCell, toCsvText } from "../csv.js";
import { toTeacherClassCsv } from "../primary-home/teacher-class-csv.js";
import type { TeacherClassRow } from "../primary-home/teacher-contracts.js";

const row = (overrides: Partial<TeacherClassRow>): TeacherClassRow => ({
  id: "c1",
  name: "P3A",
  grade: 3,
  students: 20,
  active7d: 14,
  activeRate7d: 70,
  averageLevel: 2.5,
  xp7d: 120,
  xpPrevious7d: 100,
  trend: "up",
  status: "onTrack",
  ...overrides,
});

describe("toTeacherClassCsv", () => {
  it("writes the header of FR-10 and one line for each row, in the given order", () => {
    const text = toTeacherClassCsv([row({ id: "b", name: "P4B", grade: 4 }), row({})]);
    expect(text).toBe(
      [
        "class,grade,students,active_7d,active_rate_7d,average_level,xp_7d,xp_previous_7d,trend,status",
        "P4B,4,20,14,70,2.5,120,100,up,onTrack",
        "P3A,3,20,14,70,2.5,120,100,up,onTrack",
        "",
      ].join("\n"),
    );
  });

  it("quotes a comma, a quote, and a new line in a class name", () => {
    const text = toTeacherClassCsv([row({ name: 'Frogs, "red"\nteam' })]);
    expect(text.split("\n").slice(1).join("\n")).toBe('"Frogs, ""red""\nteam",3,20,14,70,2.5,120,100,up,onTrack\n');
  });

  it("writes an empty cell for a missing grade or average level, and only the header for no row", () => {
    expect(toTeacherClassCsv([row({ grade: null, averageLevel: null, students: 0, status: "noStudents" })]).split("\n")[1]).toBe(
      "P3A,,0,14,70,,120,100,up,noStudents",
    );
    expect(toTeacherClassCsv([])).toBe("class,grade,students,active_7d,active_rate_7d,average_level,xp_7d,xp_previous_7d,trend,status\n");
  });
});

describe("toCsvText", () => {
  it("writes null as an empty cell and a boolean as text", () => {
    expect(toCsvText(["a", "b", "c"], [[null, true, 3]])).toBe("a,b,c\n,true,3\n");
  });
});

describe("quoteCsvCell formula injection", () => {
  it("adds a leading single quote to text that starts with = + - @ tab or carriage return", () => {
    expect(quoteCsvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(quoteCsvCell("+1+1")).toBe("'+1+1");
    expect(quoteCsvCell("-cmd")).toBe("'-cmd");
    expect(quoteCsvCell("@user")).toBe("'@user");
    expect(quoteCsvCell("\tx")).toBe("'\tx");
    expect(quoteCsvCell("\rx")).toBe("\"'\rx\"");
  });

  it("keeps numbers, numeric text, and normal text as they are", () => {
    expect(quoteCsvCell(-3)).toBe("-3");
    expect(quoteCsvCell("-3.5")).toBe("-3.5");
    expect(quoteCsvCell("P3A")).toBe("P3A");
    expect(quoteCsvCell("a=b")).toBe("a=b");
  });

  it("still quotes a cell with a comma after the single quote", () => {
    expect(quoteCsvCell("=1,2")).toBe("\"'=1,2\"");
  });
});
