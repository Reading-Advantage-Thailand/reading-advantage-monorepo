/**
 * Fail-closed guard for blocked responsive composition and presentation scopes.
 *
 * The T10 acceptance boundary originally blocked all 354 responsive composition
 * contracts (5664 matrix cells) and zero approved asset mappings. Under the
 * owner-authorized T11 extension, runtime, responsive, and presentation forward
 * contracts are implemented and unblocked; this module is now a deprecated
 * bounded-only historical guard, not active policy. It is retained only for
 * backward compatibility with code that explicitly asserts the historical block.
 *
 * @deprecated Use the public runtime/responsive/presentation modules directly.
 */

import { rejectBlockedScope } from "./accepted-inputs.js";
import type { BlockedScope } from "../diagnostics/structured-error.js";

/**
 * Structured diagnostic documenting the exact blocked responsive boundary.
 * @deprecated Retained as bounded-only historical evidence.
 */
export interface ResponsiveBlockedDiagnostic {
  /** The blocked T11 scope category. */
  readonly scope: BlockedScope;
  /** Number of responsive contracts blocked by T10. */
  readonly blockedContracts: 354;
  /** Number of responsive matrix cells blocked by T10. */
  readonly blockedCells: 5664;
  /** Number of responsive contracts accepted by T10. */
  readonly acceptedContracts: 0;
}

/** Frozen diagnostic documenting the blocked responsive composition boundary.
 * @deprecated Retained as bounded-only historical evidence.
 */
export const RESPONSIVE_BLOCKED_DIAGNOSTIC: ResponsiveBlockedDiagnostic = Object.freeze({
  scope: "responsive",
  blockedContracts: 354,
  blockedCells: 5664,
  acceptedContracts: 0,
});

/**
 * Frozen diagnostic documenting the blocked presentation scope.
 * @deprecated Retained as bounded-only historical evidence.
 */
export const PRESENTATION_BLOCKED_DIAGNOSTIC = Object.freeze({
  scope: "presentation",
  blockedResponsiveCells: 5664,
  blockedAssetMappings: 85,
} as const);

/**
 * Asserts that responsive composition remains blocked.
 * @throws Always throws an `APKBlockedScopeError` for the responsive scope.
 * @deprecated Use `resolveResponsiveComposition` from the responsive module instead.
 */
export function assertResponsiveCompositionBlocked(): never {
  rejectBlockedScope("responsive");
}

/**
 * Asserts that standard presentation components remain blocked.
 * @throws Always throws an `APKBlockedScopeError` for the presentation scope.
 * @deprecated Use presentation components from the presentation module instead.
 */
export function assertPresentationBlocked(): never {
  rejectBlockedScope("presentation");
}

/** Viewport dimensions supplied to a responsive profile or region request. */
export interface ViewportDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Creates a responsive composition guard whose every method fails closed.
 * @returns A guard that documents the blocked responsive boundary on every call.
 * @deprecated Use `resolveResponsiveComposition` from the responsive module instead.
 */
export function createResponsiveCompositionGuard() {
  return Object.freeze({
    /**
     * Always fails closed; profile resolution requires accepted responsive contracts.
     * @param viewport Viewport dimensions supplied by the host.
     */
    resolveProfile(viewport: ViewportDimensions): never {
      void viewport;
      assertResponsiveCompositionBlocked();
    },
    /**
     * Always fails closed; region planning requires accepted responsive contracts.
     * @param viewport Viewport dimensions supplied by the host.
     */
    planRegions(viewport: ViewportDimensions): never {
      void viewport;
      assertResponsiveCompositionBlocked();
    },
    /** Always fails closed; safe-area resolution requires accepted responsive contracts. */
    resolveSafeAreas(): never {
      assertResponsiveCompositionBlocked();
    },
    /** Always fails closed; text measurement requires accepted responsive contracts. */
    measureText(): never {
      assertResponsiveCompositionBlocked();
    },
  });
}
