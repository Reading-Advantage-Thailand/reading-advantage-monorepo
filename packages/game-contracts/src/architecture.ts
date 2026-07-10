/** A source file supplied to the APK architecture policy scanner. */
export interface ArchitectureSourceFile {
  path: string;
  source: string;
}

/** APK package layer whose import policy should be applied. */
export type ArchitectureLayer = "contracts" | "runtime" | "cartridge";

/** Options controlling one APK architecture scan. */
export interface ArchitectureScanOptions {
  layer: ArchitectureLayer;
  legacyAllowlist?: readonly string[];
}

/** One forbidden import discovered by the APK architecture scanner. */
export interface ArchitectureViolation {
  path: string;
  specifier: string;
  reason: string;
}

/** Result returned by the APK architecture scanner. */
export interface ArchitectureScanResult {
  scannedFiles: number;
  violations: ArchitectureViolation[];
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
}

function extractImportSpecifiers(source: string): string[] {
  const withoutComments = stripComments(source);
  const specifiers: string[] = [];
  const staticImport =
    /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImport = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const matcher of [staticImport, dynamicImport]) {
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(withoutComments)) !== null) {
      const specifier = match[1];
      if (specifier !== undefined) specifiers.push(specifier);
    }
  }

  return [...new Set(specifiers)];
}

function isPackageOrSubpath(specifier: string, packageName: string): boolean {
  return specifier === packageName || specifier.startsWith(`${packageName}/`);
}

function forbiddenReason(
  specifier: string,
  layer: ArchitectureLayer,
): string | undefined {
  if (
    isPackageOrSubpath(specifier, "konva") ||
    isPackageOrSubpath(specifier, "react-konva") ||
    isPackageOrSubpath(specifier, "three") ||
    isPackageOrSubpath(specifier, "@react-three/fiber") ||
    isPackageOrSubpath(specifier, "@react-three/drei") ||
    isPackageOrSubpath(specifier, "@react-three/postprocessing")
  ) {
    return "legacy renderer imports are forbidden in APK packages";
  }

  if (isPackageOrSubpath(specifier, "next")) {
    return "Next.js is a host concern";
  }

  if (
    isPackageOrSubpath(specifier, "@reading-advantage/auth") ||
    isPackageOrSubpath(specifier, "@reading-advantage/db")
  ) {
    return "authentication and database access are host/server concerns";
  }

  if (
    specifier.startsWith("@/") ||
    specifier.startsWith("~/") ||
    specifier.startsWith("apps/") ||
    /(?:^|\/)apps\//.test(specifier)
  ) {
    return "app-private imports are forbidden in shared APK code";
  }

  if (
    layer !== "runtime" &&
    (isPackageOrSubpath(specifier, "react") ||
      isPackageOrSubpath(specifier, "react-dom"))
  ) {
    return "React is not part of cartridge or browser-safe contract code";
  }

  if (layer === "contracts" && isPackageOrSubpath(specifier, "phaser")) {
    return "browser-safe contracts cannot import Phaser";
  }

  return undefined;
}

/**
 * Scans supplied TypeScript sources for imports that violate APK boundaries.
 * @param files Source files to scan; callers are responsible for filesystem discovery.
 * @param options Layer policy and exact legacy-file allowlist.
 * @returns The number of supplied files and every forbidden import found.
 */
export function scanAPKArchitecture(
  files: readonly ArchitectureSourceFile[],
  options: ArchitectureScanOptions,
): ArchitectureScanResult {
  const allowlist = new Set(options.legacyAllowlist ?? []);
  const violations: ArchitectureViolation[] = [];

  for (const file of files) {
    if (allowlist.has(file.path)) continue;

    for (const specifier of extractImportSpecifiers(file.source)) {
      const reason = forbiddenReason(specifier, options.layer);
      if (reason !== undefined) {
        violations.push({ path: file.path, specifier, reason });
      }
    }
  }

  return { scannedFiles: files.length, violations };
}
