import { z } from "zod";

/** Rectangle in host-container coordinates. */
export interface LayoutRect {
  /** Horizontal offset from the container origin. */
  readonly x: number;
  /** Vertical offset from the container origin. */
  readonly y: number;
  /** Rectangle width. */
  readonly width: number;
  /** Rectangle height. */
  readonly height: number;
}

/** Insets removed from the host container before composition. */
export interface SafeAreaInsets {
  /** Top obstruction. */
  readonly top: number;
  /** Right obstruction. */
  readonly right: number;
  /** Bottom obstruction. */
  readonly bottom: number;
  /** Left obstruction. */
  readonly left: number;
}

/** Supported spatial composition profile. */
export type LayoutProfile = "compact" | "wide";

/** Input capability mode resolved independently from spatial composition. */
export type ResponsiveInputMode = "touch" | "pointer-keyboard" | "hybrid";

/** Standard APK region identifiers. */
export type StandardRegionId =
  | "gameplay"
  | "primary-prompt"
  | "primary-status"
  | "secondary-status"
  | "controls"
  | "feedback"
  | "navigation"
  | "modal";

/** Complete standard-region plan for a supported composition. */
export type StandardRegionPlan = Readonly<Record<StandardRegionId, LayoutRect>>;

/** World-adaptation strategy selected by a cartridge profile. */
export type WorldAdaptationStrategy = "reveal" | "follow" | "reflow" | "stage" | "panel" | "fixed-mechanic";

const finiteNonNegative = z.number().finite().nonnegative();
const positive = z.number().finite().positive();

/** Runtime-validated responsive layout policy. */
export const responsiveLayoutConfigSchema = z.object({
  compact: z.object({
    minWidth: positive,
    minHeight: positive,
    minGameplayWidth: positive,
    minGameplayHeight: positive,
    promptHeight: positive,
    statusHeight: positive,
    navigationHeight: positive,
    controlsHeight: positive,
    gap: finiteNonNegative,
    strategy: z.enum(["reveal", "follow", "reflow", "stage", "panel", "fixed-mechanic"]),
  }).strict(),
  wide: z.object({
    minWidth: positive,
    minHeight: positive,
    minGameplayWidth: positive,
    minGameplayHeight: positive,
    sidePanelWidth: positive,
    navigationHeight: positive,
    gap: finiteNonNegative,
    strategy: z.enum(["reveal", "follow", "reflow", "stage", "panel", "fixed-mechanic"]),
  }).strict(),
  hysteresisPx: finiteNonNegative,
  minimumTouchTargetPx: positive,
}).strict();

/** Validated responsive layout policy. */
export type ResponsiveLayoutConfig = z.infer<typeof responsiveLayoutConfigSchema>;

/** Shared APK defaults implementing the normative compact/wide product policy. */
export const DEFAULT_RESPONSIVE_LAYOUT_CONFIG: ResponsiveLayoutConfig = Object.freeze(
  responsiveLayoutConfigSchema.parse({
    compact: {
      minWidth: 320,
      minHeight: 560,
      minGameplayWidth: 304,
      minGameplayHeight: 260,
      promptHeight: 88,
      statusHeight: 52,
      navigationHeight: 48,
      controlsHeight: 112,
      gap: 8,
      strategy: "reflow",
    },
    wide: {
      minWidth: 800,
      minHeight: 560,
      minGameplayWidth: 480,
      minGameplayHeight: 420,
      sidePanelWidth: 280,
      navigationHeight: 48,
      gap: 12,
      strategy: "panel",
    },
    hysteresisPx: 24,
    minimumTouchTargetPx: 48,
  }),
);

const compositionRequestSchema = z.object({
  viewport: z.object({ width: positive, height: positive }).strict(),
  safeArea: z.object({
    top: finiteNonNegative,
    right: finiteNonNegative,
    bottom: finiteNonNegative,
    left: finiteNonNegative,
  }).strict(),
  inputCapabilities: z.object({
    touch: z.boolean(),
    pointer: z.boolean(),
    keyboard: z.boolean(),
  }).strict(),
  accessibility: z.object({
    textScale: z.number().finite().min(1).max(2),
    touchScale: z.number().finite().min(1).max(2),
  }).strict(),
  fullscreen: z.boolean().optional().default(false),
  previousProfile: z.enum(["compact", "wide"]).optional(),
  preferredProfile: z.enum(["compact", "wide"]).optional(),
  config: responsiveLayoutConfigSchema,
}).strict();

/** Input accepted by the responsive composition resolver. */
export type ResponsiveCompositionRequest = z.input<typeof compositionRequestSchema>;

/** One structured responsive diagnostic. */
export interface ResponsiveDiagnostic {
  /** Stable diagnostic code. */
  readonly code: string;
  /** Diagnostic severity. */
  readonly severity: "info" | "warning" | "error";
  /** Human-readable actionable description. */
  readonly message: string;
  /** Optional diagnostic context. */
  readonly details?: Readonly<Record<string, unknown>>;
}

/** Successful responsive composition. */
export interface SupportedResponsiveComposition {
  /** Discriminator for a usable composition. */
  readonly supported: true;
  /** Selected spatial profile. */
  readonly profile: LayoutProfile;
  /** Independently selected interaction mode. */
  readonly inputMode: ResponsiveInputMode;
  /** Usable host rectangle after safe-area insets. */
  readonly safeRect: LayoutRect;
  /** Standard reserved, transient, modal, and gameplay regions. */
  readonly regions: StandardRegionPlan;
  /** Product-approved world adaptation strategy. */
  readonly strategy: WorldAdaptationStrategy;
  /** Minimum accessible touch target for this composition. */
  readonly minimumTouchTargetPx: number;
  /** Structured resolution diagnostics. */
  readonly diagnostics: readonly ResponsiveDiagnostic[];
}

/** Fail-closed responsive outcome when a usable composition cannot be built. */
export interface UnsupportedResponsiveComposition {
  /** Discriminator for an unsupported composition. */
  readonly supported: false;
  /** Stable unsupported-state code. */
  readonly code: "UNSUPPORTED_VIEWPORT_SIZE" | "UNSUPPORTED_INPUT_MODE";
  /** Actionable user-facing guidance. */
  readonly guidance: string;
  /** Structured resolution diagnostics. */
  readonly diagnostics: readonly ResponsiveDiagnostic[];
}

/** Result of responsive profile and region resolution. */
export type ResponsiveComposition = SupportedResponsiveComposition | UnsupportedResponsiveComposition;

function zeroRect(x: number, y: number): LayoutRect {
  return { x, y, width: 0, height: 0 };
}

function insetRect(width: number, height: number, insets: SafeAreaInsets): LayoutRect | undefined {
  const safeWidth = width - insets.left - insets.right;
  const safeHeight = height - insets.top - insets.bottom;
  if (safeWidth <= 0 || safeHeight <= 0) return undefined;
  return { x: insets.left, y: insets.top, width: safeWidth, height: safeHeight };
}

function resolveInputMode(capabilities: { touch: boolean; pointer: boolean; keyboard: boolean }): ResponsiveInputMode | undefined {
  if (capabilities.touch && (capabilities.pointer || capabilities.keyboard)) return "hybrid";
  if (capabilities.touch) return "touch";
  if (capabilities.pointer || capabilities.keyboard) return "pointer-keyboard";
  return undefined;
}

function compactFits(
  safe: LayoutRect,
  config: ResponsiveLayoutConfig,
  textScale: number,
  touchScale: number,
  inputMode: ResponsiveInputMode,
): boolean {
  const controlsHeight = inputMode === "pointer-keyboard" ? 0 : config.compact.controlsHeight * touchScale;
  const reservedHeight = config.compact.navigationHeight
    + config.compact.promptHeight * textScale
    + config.compact.statusHeight * textScale
    + controlsHeight
    + config.compact.gap * (controlsHeight > 0 ? 4 : 3);
  return safe.width >= Math.max(config.compact.minWidth, config.compact.minGameplayWidth)
    && safe.height >= config.compact.minHeight
    && safe.height - reservedHeight >= config.compact.minGameplayHeight;
}

function wideFits(safe: LayoutRect, config: ResponsiveLayoutConfig, textScale: number): boolean {
  const requiredWidth = config.wide.minGameplayWidth + config.wide.sidePanelWidth * textScale + config.wide.gap;
  return safe.width >= requiredWidth
    && safe.height >= config.wide.minHeight
    && safe.height - config.wide.navigationHeight - config.wide.gap >= config.wide.minGameplayHeight;
}

function planCompact(
  safe: LayoutRect,
  config: ResponsiveLayoutConfig,
  textScale: number,
  touchScale: number,
  inputMode: ResponsiveInputMode,
): StandardRegionPlan {
  const gap = config.compact.gap;
  const navigation: LayoutRect = { x: safe.x, y: safe.y, width: safe.width, height: config.compact.navigationHeight };
  const prompt: LayoutRect = {
    x: safe.x,
    y: navigation.y + navigation.height + gap,
    width: safe.width,
    height: config.compact.promptHeight * textScale,
  };
  const status: LayoutRect = {
    x: safe.x,
    y: prompt.y + prompt.height + gap,
    width: safe.width,
    height: config.compact.statusHeight * textScale,
  };
  const controlsHeight = inputMode === "pointer-keyboard" ? 0 : config.compact.controlsHeight * touchScale;
  const controls: LayoutRect = controlsHeight > 0
    ? { x: safe.x, y: safe.y + safe.height - controlsHeight, width: safe.width, height: controlsHeight }
    : zeroRect(safe.x, safe.y + safe.height);
  const gameplayBottom = controlsHeight > 0 ? controls.y - gap : safe.y + safe.height;
  const gameplay: LayoutRect = {
    x: safe.x,
    y: status.y + status.height + gap,
    width: safe.width,
    height: gameplayBottom - (status.y + status.height + gap),
  };
  return Object.freeze({
    gameplay,
    "primary-prompt": prompt,
    "primary-status": status,
    "secondary-status": zeroRect(status.x + status.width, status.y),
    controls,
    feedback: {
      x: gameplay.x + gameplay.width * 0.15,
      y: gameplay.y + gameplay.height * 0.05,
      width: gameplay.width * 0.7,
      height: Math.min(64 * textScale, gameplay.height * 0.25),
    },
    navigation,
    modal: safe,
  });
}

function planWide(
  safe: LayoutRect,
  config: ResponsiveLayoutConfig,
  textScale: number,
  inputMode: ResponsiveInputMode,
  touchScale: number,
): StandardRegionPlan {
  const gap = config.wide.gap;
  const navigation: LayoutRect = { x: safe.x, y: safe.y, width: safe.width, height: config.wide.navigationHeight };
  const contentY = navigation.y + navigation.height + gap;
  const contentHeight = safe.y + safe.height - contentY;
  const sideWidth = config.wide.sidePanelWidth * textScale;
  const gameplay: LayoutRect = {
    x: safe.x,
    y: contentY,
    width: safe.width - sideWidth - gap,
    height: contentHeight,
  };
  const sideX = gameplay.x + gameplay.width + gap;
  const promptHeight = Math.min(144 * textScale, contentHeight * 0.32);
  const statusHeight = Math.min(72 * textScale, contentHeight * 0.18);
  const secondaryHeight = Math.min(64 * textScale, contentHeight * 0.15);
  const controlsY = contentY + promptHeight + gap + statusHeight + gap + secondaryHeight + gap;
  const controlsHeight = inputMode === "pointer-keyboard" ? 0 : Math.max(
    config.minimumTouchTargetPx * touchScale,
    contentY + contentHeight - controlsY,
  );
  return Object.freeze({
    gameplay,
    "primary-prompt": { x: sideX, y: contentY, width: sideWidth, height: promptHeight },
    "primary-status": { x: sideX, y: contentY + promptHeight + gap, width: sideWidth, height: statusHeight },
    "secondary-status": {
      x: sideX,
      y: contentY + promptHeight + gap + statusHeight + gap,
      width: sideWidth,
      height: secondaryHeight,
    },
    controls: controlsHeight > 0
      ? { x: sideX, y: controlsY, width: sideWidth, height: Math.min(controlsHeight, contentY + contentHeight - controlsY) }
      : zeroRect(sideX, controlsY),
    feedback: {
      x: gameplay.x + gameplay.width * 0.25,
      y: gameplay.y + gameplay.height * 0.05,
      width: gameplay.width * 0.5,
      height: Math.min(72 * textScale, gameplay.height * 0.2),
    },
    navigation,
    modal: safe,
  });
}

/**
 * Resolves an intentional compact or wide composition from usable geometry.
 * @param request Untrusted viewport, safe-area, capability, accessibility, and policy values.
 * @returns A supported region plan or an accessible fail-closed unsupported state.
 * @throws When configuration or request values fail strict runtime validation.
 */
export function resolveResponsiveComposition(request: ResponsiveCompositionRequest): ResponsiveComposition {
  const parsed = compositionRequestSchema.parse(request);
  const safe = insetRect(parsed.viewport.width, parsed.viewport.height, parsed.safeArea);
  const inputMode = resolveInputMode(parsed.inputCapabilities);
  if (!inputMode) {
    return Object.freeze({
      supported: false,
      code: "UNSUPPORTED_INPUT_MODE",
      guidance: "Connect a keyboard, pointer, or touch-capable input device to play.",
      diagnostics: Object.freeze([{ code: "NO_INPUT_CAPABILITY", severity: "error" as const, message: "No supported input capability is available." }]),
    });
  }
  if (!safe) {
    return Object.freeze({
      supported: false,
      code: "UNSUPPORTED_VIEWPORT_SIZE",
      guidance: "Increase the game area or reduce browser and device obstructions.",
      diagnostics: Object.freeze([{ code: "SAFE_AREA_EMPTY", severity: "error" as const, message: "Safe-area insets consume the complete viewport." }]),
    });
  }

  const compact = compactFits(safe, parsed.config, parsed.accessibility.textScale, parsed.accessibility.touchScale, inputMode);
  const wideMinimum = parsed.previousProfile === "wide"
    ? parsed.config.wide.minWidth - parsed.config.hysteresisPx
    : parsed.config.wide.minWidth;
  const wide = wideFits(safe, parsed.config, parsed.accessibility.textScale) && safe.width >= wideMinimum;
  let profile: LayoutProfile | undefined;
  if (parsed.preferredProfile === "wide" && wide) profile = "wide";
  else if (parsed.preferredProfile === "compact" && compact) profile = "compact";
  else if (wide) profile = "wide";
  else if (compact) profile = "compact";

  if (!profile) {
    return Object.freeze({
      supported: false,
      code: "UNSUPPORTED_VIEWPORT_SIZE",
      guidance: "Increase the game area, rotate the device, or reduce enlarged text and touch scaling.",
      diagnostics: Object.freeze([{
        code: "PROFILE_MINIMUMS_UNSATISFIED",
        severity: "error" as const,
        message: "Neither compact nor wide composition can satisfy required gameplay and reserved regions.",
        details: { viewport: parsed.viewport, safeRect: safe, textScale: parsed.accessibility.textScale, touchScale: parsed.accessibility.touchScale },
      }]),
    });
  }

  const regions = profile === "compact"
    ? planCompact(safe, parsed.config, parsed.accessibility.textScale, parsed.accessibility.touchScale, inputMode)
    : planWide(safe, parsed.config, parsed.accessibility.textScale, inputMode, parsed.accessibility.touchScale);
  return Object.freeze({
    supported: true,
    profile,
    inputMode,
    safeRect: safe,
    regions,
    strategy: parsed.config[profile].strategy,
    minimumTouchTargetPx: parsed.config.minimumTouchTargetPx * parsed.accessibility.touchScale,
    diagnostics: Object.freeze([{
      code: "COMPOSITION_RESOLVED",
      severity: "info" as const,
      message: `Resolved ${profile} composition with ${inputMode} input.`,
      details: { fullscreen: parsed.fullscreen, viewport: parsed.viewport, safeRect: safe },
    }]),
  });
}

/** Camera values used for world/container coordinate conversion. */
export interface CameraTransform {
  /** World-space left camera coordinate. */
  readonly x: number;
  /** World-space top camera coordinate. */
  readonly y: number;
  /** Uniform camera zoom. */
  readonly zoom: number;
}

/** Two-dimensional point. */
export interface LayoutPoint {
  /** Horizontal coordinate. */
  readonly x: number;
  /** Vertical coordinate. */
  readonly y: number;
}

function assertTransform(point: LayoutPoint, viewport: LayoutRect, camera: CameraTransform): void {
  if (![point.x, point.y, viewport.x, viewport.y, viewport.width, viewport.height, camera.x, camera.y, camera.zoom].every(Number.isFinite)
    || viewport.width <= 0 || viewport.height <= 0 || camera.zoom <= 0) {
    throw new Error("Coordinate transform requires finite values, positive viewport geometry, and positive zoom");
  }
}

/**
 * Converts a host-container point through the gameplay viewport into world space.
 * @param point Container-space point.
 * @param gameplay Gameplay viewport from the current composition.
 * @param camera Current world camera transform.
 * @returns Equivalent world-space point.
 */
export function containerPointToWorld(point: LayoutPoint, gameplay: LayoutRect, camera: CameraTransform): LayoutPoint {
  assertTransform(point, gameplay, camera);
  return {
    x: camera.x + (point.x - gameplay.x) / camera.zoom,
    y: camera.y + (point.y - gameplay.y) / camera.zoom,
  };
}

/**
 * Converts a world point through the current camera into host-container space.
 * @param point World-space point.
 * @param gameplay Gameplay viewport from the current composition.
 * @param camera Current world camera transform.
 * @returns Equivalent container-space point.
 */
export function worldPointToContainer(point: LayoutPoint, gameplay: LayoutRect, camera: CameraTransform): LayoutPoint {
  assertTransform(point, gameplay, camera);
  return {
    x: gameplay.x + (point.x - camera.x) * camera.zoom,
    y: gameplay.y + (point.y - camera.y) * camera.zoom,
  };
}

/** Text style values required for locale-aware fit diagnostics. */
export interface TextFitStyle {
  /** Actual production font family. */
  readonly fontFamily: string;
  /** Requested font size. */
  readonly fontSize: number;
  /** Smallest accepted font size for this text class. */
  readonly minFontSize: number;
  /** Line-height multiplier. */
  readonly lineHeight: number;
  /** Maximum complete lines. */
  readonly maxLines: number;
}

/** Measured text dimensions returned by an injected production-font adapter. */
export interface TextMeasurement {
  /** Measured horizontal extent. */
  readonly width: number;
  /** Measured vertical extent. */
  readonly height: number;
}

/** Adapter used to measure text with the host's actual font implementation. */
export type TextMeasurementAdapter = (text: string, style: TextFitStyle, locale: string) => TextMeasurement;

/** Result of text measurement without silent truncation or below-minimum shrinking. */
export interface TextFitResult {
  /** Whether complete content fits within the declared box and line policy. */
  readonly fits: boolean;
  /** Original complete content; never ellipsized. */
  readonly renderedText: string;
  /** Number of complete lines required. */
  readonly requiredLines: number;
  /** Recomposition policy when content does not fit. */
  readonly action: "render" | "recompose";
  /** Structured text diagnostics. */
  readonly diagnostics: readonly ResponsiveDiagnostic[];
}

/** Values supplied for locale-aware text fit evaluation. */
export interface TextFitRequest {
  /** Complete educational or interface content. */
  readonly text: string;
  /** BCP-47 locale used for segmentation and measurement. */
  readonly locale: string;
  /** Allocated text region. */
  readonly box: LayoutRect;
  /** Declared text-class style constraints. */
  readonly style: TextFitStyle;
  /** Production-font measurement adapter. */
  readonly measure: TextMeasurementAdapter;
}

/**
 * Evaluates complete locale text against a reserved region without truncation.
 * @param request Complete text, locale, box, class style, and actual-font measurement adapter.
 * @returns Fit result that requests recomposition instead of silent clipping.
 * @throws When text, locale, style, box, or adapter output is invalid.
 */
export function evaluateTextFit(request: TextFitRequest): TextFitResult {
  if (!request.text || !request.locale || !request.style.fontFamily) throw new Error("Text fit requires complete text, locale, and font family");
  if (request.style.fontSize < request.style.minFontSize
    || request.style.minFontSize <= 0
    || request.style.lineHeight <= 0
    || !Number.isInteger(request.style.maxLines)
    || request.style.maxLines <= 0
    || request.box.width <= 0
    || request.box.height <= 0) {
    throw new Error("Text fit received invalid box or text-class constraints");
  }
  const measurement = request.measure(request.text, request.style, request.locale);
  if (!Number.isFinite(measurement.width) || !Number.isFinite(measurement.height) || measurement.width < 0 || measurement.height < 0) {
    throw new Error("Text measurement adapter returned invalid geometry");
  }
  const requiredLines = Math.max(1, Math.ceil(measurement.width / request.box.width));
  const requiredHeight = Math.max(measurement.height, requiredLines * request.style.fontSize * request.style.lineHeight);
  const fits = requiredLines <= request.style.maxLines && requiredHeight <= request.box.height;
  const diagnostics: ResponsiveDiagnostic[] = [];
  if (!fits) diagnostics.push({
    code: "TEXT_OVERFLOW",
    severity: "error",
    message: "Complete text does not fit its declared region; composition must reflow.",
    details: { locale: request.locale, requiredLines, maxLines: request.style.maxLines, requiredHeight, availableHeight: request.box.height },
  });
  if (request.locale.toLocaleLowerCase().startsWith("th")) diagnostics.push({
    code: "THAI_TEXT_MEASURED",
    severity: "info",
    message: "Thai content was measured through the production-font adapter.",
  });
  return Object.freeze({
    fits,
    renderedText: request.text,
    requiredLines,
    action: fits ? "render" : "recompose",
    diagnostics: Object.freeze(diagnostics),
  });
}

function overlaps(left: LayoutRect, right: LayoutRect): boolean {
  if (left.width <= 0 || left.height <= 0 || right.width <= 0 || right.height <= 0) return false;
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

/**
 * Inspects a supported composition for invalid, clipped, or gameplay-overlapping persistent regions.
 * @param composition Supported composition to inspect.
 * @returns Deterministically ordered geometry diagnostics.
 */
export function inspectCompositionGeometry(composition: SupportedResponsiveComposition): readonly ResponsiveDiagnostic[] {
  const issues: ResponsiveDiagnostic[] = [];
  const { safeRect, regions } = composition;
  for (const [id, rect] of Object.entries(regions) as Array<[StandardRegionId, LayoutRect]>) {
    if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width < 0 || rect.height < 0) {
      issues.push({ code: "INVALID_REGION_GEOMETRY", severity: "error", message: `${id} has invalid geometry.` });
      continue;
    }
    if (id !== "modal" && rect.width > 0 && rect.height > 0
      && (rect.x < safeRect.x || rect.y < safeRect.y || rect.x + rect.width > safeRect.x + safeRect.width || rect.y + rect.height > safeRect.y + safeRect.height)) {
      issues.push({ code: "REGION_OUTSIDE_SAFE_AREA", severity: "error", message: `${id} extends outside the safe area.` });
    }
  }
  for (const id of ["primary-prompt", "primary-status", "secondary-status", "controls", "navigation"] as const) {
    if (overlaps(regions.gameplay, regions[id])) {
      issues.push({ code: "PERSISTENT_UI_OVERLAPS_GAMEPLAY", severity: "error", message: `${id} overlaps protected gameplay.` });
    }
  }
  if (composition.inputMode !== "pointer-keyboard" && regions.controls.height < composition.minimumTouchTargetPx) {
    issues.push({ code: "TOUCH_REGION_UNDERSIZED", severity: "error", message: "Touch controls cannot meet the minimum target size." });
  }
  return Object.freeze(issues);
}

/** Debug-overlay rectangle for one standard region. */
export interface ResponsiveDebugOverlay {
  /** Standard region identifier. */
  readonly id: StandardRegionId;
  /** Region geometry. */
  readonly rect: LayoutRect;
  /** Whether the region contains a geometry error. */
  readonly invalid: boolean;
}

/**
 * Builds QC overlay data without coupling the package to a canvas or DOM renderer.
 * @param composition Supported composition to visualize.
 * @returns Region overlays with invalid-region flags.
 */
export function createResponsiveDebugOverlays(composition: SupportedResponsiveComposition): readonly ResponsiveDebugOverlay[] {
  const errors = inspectCompositionGeometry(composition);
  return Object.freeze((Object.entries(composition.regions) as Array<[StandardRegionId, LayoutRect]>).map(([id, rect]) => ({
    id,
    rect,
    invalid: errors.some((error) => error.message.startsWith(id) || error.message.includes(`${id} `)),
  })));
}

/** Cause of a responsive state-preserving transition. */
export type ResponsiveTransitionReason = "resize" | "orientation" | "fullscreen" | "accessibility";

/** Callbacks used to atomically preserve state through responsive reflow. */
export interface ResponsiveTransitionAdapter<State> {
  /** Captures all game-owned simulation and educational state. */
  readonly captureState: () => State;
  /** Restores the captured state after reflow. */
  readonly restoreState: (state: State) => void;
  /** Pauses simulation before non-trivial reflow. */
  readonly pause: () => void;
  /** Resumes simulation after state restoration. */
  readonly resume: () => void;
  /** Cancels an active pointer gesture before targets move. */
  readonly cancelGesture: () => void;
  /** Applies camera, world, HUD, text, and control recomposition atomically. */
  readonly recompose: (composition: SupportedResponsiveComposition) => void;
  /** Receives structured transition diagnostics. */
  readonly diagnostic: (diagnostic: ResponsiveDiagnostic) => void;
}

/** Coordinator that preserves generic game-owned state through composition changes. */
export interface ResponsiveTransitionCoordinator {
  /**
   * Applies a state-preserving transition when geometry or profile changes.
   * @param previous Previous supported composition.
   * @param next Next supported composition.
   * @param reason Host event that triggered recomposition.
   */
  transition(previous: SupportedResponsiveComposition, next: SupportedResponsiveComposition, reason: ResponsiveTransitionReason): void;
}

/**
 * Creates an atomic responsive transition coordinator over game-owned state adapters.
 * @param adapter Capture, pause, gesture, reflow, restore, resume, and diagnostic callbacks.
 * @returns Coordinator that never recreates a canvas, scene, or completion callback.
 */
export function createResponsiveTransitionCoordinator<State>(
  adapter: ResponsiveTransitionAdapter<State>,
): ResponsiveTransitionCoordinator {
  return Object.freeze({
    transition(
      previous: SupportedResponsiveComposition,
      next: SupportedResponsiveComposition,
      reason: ResponsiveTransitionReason,
    ): void {
      const unchanged = previous.profile === next.profile
        && JSON.stringify(previous.safeRect) === JSON.stringify(next.safeRect)
        && previous.inputMode === next.inputMode;
      if (unchanged) return;
      const state = adapter.captureState();
      adapter.pause();
      try {
        adapter.cancelGesture();
        adapter.recompose(next);
        adapter.restoreState(state);
        adapter.diagnostic({
          code: "RESPONSIVE_TRANSITION",
          severity: "info",
          message: `Recomposed ${previous.profile} to ${next.profile} after ${reason}.`,
          details: { reason, previous: previous.safeRect, next: next.safeRect, oldProfile: previous.profile, newProfile: next.profile },
        });
      } finally {
        adapter.resume();
      }
    },
  });
}
