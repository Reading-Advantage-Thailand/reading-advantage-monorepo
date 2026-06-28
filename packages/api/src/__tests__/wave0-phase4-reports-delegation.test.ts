/**
 * Wave 0 Phase 4 — Red test: reports.teacherDashboard delegation
 *
 * Proves that the `teacherDashboard` procedure in the reports tRPC router
 * delegates to a domain function (like `reports.getTeacherDashboard`) rather
 * than implementing Drizzle queries inline in the transport layer.
 *
 * Evidence refs: Shared Foundation F-SF-003; Cross-App CA-004; Monorepo MR-C05.
 *
 * Anti-patterns guarded:
 * - A4 (vacuous-pass): test fails if zero procedures are scanned.
 * - A3 (labeled count): violations reported as labeled counts.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROUTER_PATH = path.resolve(__dirname, "../routers/reports.ts");

/**
 * Read the raw source of the reports router for static assertions.
 */
function readRouterSource(): string {
  return fs.readFileSync(ROUTER_PATH, "utf-8");
}

/**
 * Find all tRPC procedure names defined in the router source.
 * Matches patterns like: `procedureName: protectedProcedure` or `procedureName: publicProcedure`
 */
function extractProcedureNames(source: string): string[] {
  const procedureRegex = /(\w+)\s*:\s*(?:protected|public)Procedure/g;
  const names: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = procedureRegex.exec(source)) !== null) {
    names.push(match[1]!);
  }
  return names;
}

describe("Wave 0 Phase 4 — reports.teacherDashboard delegation", () => {
  describe("static source analysis", () => {
    it("scans at least one procedure (A4 guard)", () => {
      const source = readRouterSource();
      const procedures = extractProcedureNames(source);
      expect(procedures.length).toBeGreaterThanOrEqual(
        1
      );
    });

    it("teacherDashboard procedure exists in the router", () => {
      const source = readRouterSource();
      const procedures = extractProcedureNames(source);
      expect(procedures).toContain("teacherDashboard");
    });

    it("teacherDashboard does NOT import or use drizzle-orm directly", () => {
      const source = readRouterSource();

      // Find the teacherDashboard procedure block
      const procStart = source.indexOf("teacherDashboard");
      expect(procStart).toBeGreaterThan(-1);

      // Get the procedure body up to the next procedure or end of router
      const afterProc = source.slice(procStart);
      const nextProcIdx = afterProc.indexOf(
        "\n  ",
        afterProc.indexOf("teacherDashboard") + 20
      );
      const procBody =
        nextProcIdx > 0 ? afterProc.slice(0, nextProcIdx) : afterProc;

      // Should NOT import from drizzle-orm in the procedure body
      expect(procBody).not.toContain("from \"drizzle-orm\"");
      expect(procBody).not.toContain("from '@reading-advantage/db/schema'");
      expect(procBody).not.toContain("ctx.tenantDb.select");
      expect(procBody).not.toContain("ctx.tenantDb.insert");
      expect(procBody).not.toContain("ctx.tenantDb.update");
      expect(procBody).not.toContain("ctx.tenantDb.delete");
    });

    it("teacherDashboard delegates to a domain function (not inline Drizzle)", () => {
      const source = readRouterSource();

      // Find the teacherDashboard procedure body
      const procStart = source.indexOf("teacherDashboard");
      const afterProc = source.slice(procStart);

      // The procedure should call a domain function (e.g., reports.getTeacherDashboard)
      // and NOT contain Drizzle query chains like .select().from().where()
      const hasDomainDelegation =
        afterProc.includes("reports.getTeacherDashboard") ||
        afterProc.includes("getTeacherDashboard(");

      // Check if it has direct Drizzle query chains
      const hasInlineDrizzle =
        afterProc.includes(".select(") &&
        afterProc.includes(".from(") &&
        afterProc.includes(".where(");

      // The procedure should delegate to domain, not implement queries inline
      expect(
        hasDomainDelegation,
        "teacherDashboard should delegate to a domain function (e.g., reports.getTeacherDashboard) but does not"
      ).toBe(true);

      expect(
        hasInlineDrizzle,
        "teacherDashboard should not contain inline Drizzle query chains (.select().from().where())"
      ).toBe(false);
    });
  });

  describe("delegation contract (source import analysis)", () => {
    it("reports router imports getTeacherDashboard from domain module", () => {
      const source = readRouterSource();

      // The router should import getTeacherDashboard from @reading-advantage/domain
      // (like it does for studentProgress → reports.getStudentProgress)
      const hasDomainImport =
        source.includes("getTeacherDashboard") &&
        (source.includes("from \"@reading-advantage/domain\"") ||
          source.includes("from '@reading-advantage/domain'"));

      expect(
        hasDomainImport,
        "reports router should import getTeacherDashboard from @reading-advantage/domain " +
          "but does not. The domain module (packages/domain/src/reports/index.ts) " +
          "must export getTeacherDashboard and the router must use it."
      ).toBe(true);
    });

    it("teacherDashboard procedure body does not reference Drizzle table columns directly", () => {
      const source = readRouterSource();

      // Find the teacherDashboard procedure body
      const procStart = source.indexOf("teacherDashboard");
      const afterProc = source.slice(procStart);

      // Table column references like classrooms.teacherId, classrooms.id, classrooms.name
      // should not appear in the router — they belong in the domain function
      const drizzleTableRefs = [
        "classrooms.teacherId",
        "classrooms.id",
        "classrooms.name",
        "classrooms.schoolId",
      ];

      const foundRefs: string[] = [];
      for (const ref of drizzleTableRefs) {
        if (afterProc.includes(ref)) {
          foundRefs.push(ref);
        }
      }

      const refCount = foundRefs.length;
      expect(
        refCount,
        `Drizzle table column reference count in teacherDashboard: ${refCount}.\n` +
          `Found: ${foundRefs.join(", ")}\n` +
          `Table column references belong in domain functions, not in router procedures.`
      ).toBe(0);
    });
  });
});
