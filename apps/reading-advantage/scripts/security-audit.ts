/**
 * Security Audit Script
 *
 * Scans controller files for potential security gaps:
 * - Missing authorization guards
 * - Direct getCurrentUser() usage without guards
 * - Unscoped database queries
 * - Missing tenant filters
 *
 * Usage: npx ts-node scripts/security-audit.ts
 */

import * as fs from "fs";
import * as path from "path";

interface AuditIssue {
  file: string;
  line: number;
  severity: "high" | "medium" | "low";
  type: string;
  message: string;
  code?: string;
}

interface AuditReport {
  timestamp: string;
  filesScanned: number;
  issuesFound: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  issues: AuditIssue[];
}

class SecurityAuditor {
  private issues: AuditIssue[] = [];
  private filesScanned = 0;

  /**
   * Scan a directory recursively for TypeScript controller files
   */
  private scanDirectory(dir: string): string[] {
    const files: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.scanDirectory(fullPath));
      } else if (entry.name.endsWith("-controller.ts")) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Analyze a single file for security issues
   */
  private analyzeFile(filePath: string): void {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const relativePath = path.relative(process.cwd(), filePath);

    this.filesScanned++;

    // Check for guard imports
    const hasGuardImports = content.includes(
      'from "@/server/middleware/guards"'
    );
    const hasAuthHelperImports = content.includes(
      'from "@/server/utils/authorization"'
    );

    // Check for old-style auth
    const usesGetCurrentUser = content.includes("getCurrentUser()");
    const usesRequireRole = content.includes("requireRole");
    const usesRequireAuth = content.includes("requireAuth");

    // Check each function
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Pattern 1: Direct getCurrentUser without guards (old pattern)
      if (
        line.includes("const user = await getCurrentUser()") &&
        !usesRequireRole &&
        !usesRequireAuth
      ) {
        this.issues.push({
          file: relativePath,
          line: lineNumber,
          severity: "high",
          type: "MISSING_GUARD",
          message:
            "Using getCurrentUser() without guard. Migrate to requireRole() or requireAuth().",
          code: line.trim(),
        });
      }

      // Pattern 2: Inline role check without using guards
      if (
        line.includes("user.role !== Role.") &&
        !line.includes("//") &&
        !usesRequireRole
      ) {
        this.issues.push({
          file: relativePath,
          line: lineNumber,
          severity: "medium",
          type: "INLINE_ROLE_CHECK",
          message:
            "Inline role check detected. Consider using requireRole() guard.",
          code: line.trim(),
        });
      }

      // Pattern 3: Unscoped findMany queries
      if (
        line.includes(".findMany(") &&
        !line.includes("where") &&
        !line.includes("//")
      ) {
        this.issues.push({
          file: relativePath,
          line: lineNumber,
          severity: "high",
          type: "UNSCOPED_QUERY",
          message:
            "Unscoped database query. Consider using buildSchoolFilter() or buildClassroomFilter().",
          code: line.trim(),
        });
      }

      // Pattern 4: Missing school filter in where clause
      if (
        line.includes("where: {") &&
        !content.includes("buildSchoolFilter") &&
        !content.includes("schoolId:") &&
        !content.includes("user.school_id") &&
        usesGetCurrentUser
      ) {
        // Only flag if this appears to be a multi-tenant query
        const nextLines = lines.slice(index, index + 10).join("\n");
        if (
          nextLines.includes("prisma.user") ||
          nextLines.includes("prisma.classroom")
        ) {
          this.issues.push({
            file: relativePath,
            line: lineNumber,
            severity: "medium",
            type: "MISSING_TENANT_FILTER",
            message:
              "Query may need tenant scoping. Consider using buildSchoolFilter().",
            code: line.trim(),
          });
        }
      }

      // Pattern 5: Direct user ID check without student guard
      if (
        line.includes("userId === user.id") ||
        line.includes("user.id === userId")
      ) {
        if (!content.includes("requireStudentSelf")) {
          this.issues.push({
            file: relativePath,
            line: lineNumber,
            severity: "low",
            type: "MISSING_STUDENT_GUARD",
            message:
              "Direct user ID check. Consider using requireStudentSelf() guard.",
            code: line.trim(),
          });
        }
      }

      // Pattern 6: Missing authorization for DELETE operations
      if (
        line.includes("export async function DELETE") &&
        !content.slice(0, content.indexOf(line)).includes("requireRole") &&
        !content.slice(0, content.indexOf(line)).includes("requireAuth")
      ) {
        this.issues.push({
          file: relativePath,
          line: lineNumber,
          severity: "high",
          type: "UNPROTECTED_DELETE",
          message:
            "DELETE endpoint without visible guard. Ensure authorization is present.",
          code: line.trim(),
        });
      }

      // Pattern 7: Missing authorization for POST operations
      if (
        line.includes("export async function POST") &&
        !content.slice(0, content.indexOf(line)).includes("requireRole") &&
        !content.slice(0, content.indexOf(line)).includes("requireAuth")
      ) {
        this.issues.push({
          file: relativePath,
          line: lineNumber,
          severity: "high",
          type: "UNPROTECTED_POST",
          message:
            "POST endpoint without visible guard. Ensure authorization is present.",
          code: line.trim(),
        });
      }

      // Pattern 8: Missing authorization for PATCH/PUT operations
      if (
        (line.includes("export async function PATCH") ||
          line.includes("export async function PUT")) &&
        !content.slice(0, content.indexOf(line)).includes("requireRole") &&
        !content.slice(0, content.indexOf(line)).includes("requireAuth")
      ) {
        this.issues.push({
          file: relativePath,
          line: lineNumber,
          severity: "high",
          type: "UNPROTECTED_UPDATE",
          message:
            "UPDATE endpoint without visible guard. Ensure authorization is present.",
          code: line.trim(),
        });
      }
    });

    // File-level checks
    if (!hasGuardImports && usesGetCurrentUser) {
      this.issues.push({
        file: relativePath,
        line: 1,
        severity: "medium",
        type: "MISSING_GUARD_IMPORT",
        message:
          "File uses authentication but doesn't import guards. Consider migrating to guard-based auth.",
      });
    }
  }

  /**
   * Generate audit report
   */
  public audit(controllersPath: string): AuditReport {
    const files = this.scanDirectory(controllersPath);

    files.forEach((file) => {
      this.analyzeFile(file);
    });

    const highSeverity = this.issues.filter(
      (i) => i.severity === "high"
    ).length;
    const mediumSeverity = this.issues.filter(
      (i) => i.severity === "medium"
    ).length;
    const lowSeverity = this.issues.filter((i) => i.severity === "low").length;

    return {
      timestamp: new Date().toISOString(),
      filesScanned: this.filesScanned,
      issuesFound: this.issues.length,
      highSeverity,
      mediumSeverity,
      lowSeverity,
      issues: this.issues.sort((a, b) => {
        // Sort by severity, then by file
        const severityOrder = { high: 0, medium: 1, low: 2 };
        return (
          severityOrder[a.severity] - severityOrder[b.severity] ||
          a.file.localeCompare(b.file)
        );
      }),
    };
  }

  /**
   * Print report to console
   */
  public printReport(report: AuditReport): void {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("               SECURITY AUDIT REPORT");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`📅 Timestamp: ${report.timestamp}`);
    console.log(`📁 Files Scanned: ${report.filesScanned}`);
    console.log(`🚨 Total Issues: ${report.issuesFound}`);
    console.log(`   🔴 High Severity: ${report.highSeverity}`);
    console.log(`   🟡 Medium Severity: ${report.mediumSeverity}`);
    console.log(`   🟢 Low Severity: ${report.lowSeverity}`);
    console.log(
      "═══════════════════════════════════════════════════════════\n"
    );

    if (report.issues.length === 0) {
      console.log("✅ No security issues found!\n");
      return;
    }

    // Group issues by file
    const issuesByFile = new Map<string, AuditIssue[]>();
    report.issues.forEach((issue) => {
      if (!issuesByFile.has(issue.file)) {
        issuesByFile.set(issue.file, []);
      }
      issuesByFile.get(issue.file)!.push(issue);
    });

    issuesByFile.forEach((issues, file) => {
      console.log(`\n📄 ${file}`);
      console.log("─".repeat(60));
      issues.forEach((issue) => {
        const severityIcon =
          issue.severity === "high"
            ? "🔴"
            : issue.severity === "medium"
              ? "🟡"
              : "🟢";
        console.log(
          `  ${severityIcon} Line ${issue.line}: [${issue.type}] ${issue.message}`
        );
        if (issue.code) {
          console.log(`     Code: ${issue.code}`);
        }
      });
    });

    console.log(
      "\n═══════════════════════════════════════════════════════════"
    );
    console.log("                   RECOMMENDATIONS");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("1. Migrate old getCurrentUser() patterns to guard-based auth");
    console.log("2. Use requireRole() for role-based access control");
    console.log("3. Apply buildSchoolFilter() to multi-tenant queries");
    console.log("4. Use buildClassroomFilter() for classroom-scoped queries");
    console.log("5. Protect all mutation endpoints (POST, PATCH, PUT, DELETE)");
    console.log("6. See docs/security/dashboard-rbac.md for best practices\n");
  }

  /**
   * Save report to JSON file
   */
  public saveReport(report: AuditReport, outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`💾 Report saved to ${outputPath}\n`);
  }
}

// Main execution
async function main() {
  const auditor = new SecurityAuditor();
  const controllersPath = path.join(process.cwd(), "server", "controllers");

  if (!fs.existsSync(controllersPath)) {
    console.error(`❌ Controllers directory not found: ${controllersPath}`);
    process.exit(1);
  }

  const report = auditor.audit(controllersPath);
  auditor.printReport(report);

  // Save report to file
  const reportsDir = path.join(process.cwd(), "docs", "security", "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const reportPath = path.join(
    reportsDir,
    `security-audit-${new Date().toISOString().split("T")[0]}.json`
  );
  auditor.saveReport(report, reportPath);

  // Exit with error code if high severity issues found
  if (report.highSeverity > 0) {
    console.log("❌ High severity security issues detected!");
    process.exit(1);
  } else if (report.mediumSeverity > 0) {
    console.log("⚠️  Medium severity security issues detected.");
    process.exit(0);
  } else {
    console.log("✅ Security audit passed!");
    process.exit(0);
  }
}

// Run the main function
main().catch((error: Error) => {
  console.error("Error running security audit:", error);
  process.exit(1);
});

export { SecurityAuditor };
export type { AuditReport, AuditIssue };
