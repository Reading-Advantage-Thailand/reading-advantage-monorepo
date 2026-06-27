# ra-batch-34 — Line-by-Line Review (20 files)

- **Track**: reading_advantage_full_review_20260626
- **Batch**: ra-batch-34
- **Scope**: 20 files under `apps/reading-advantage/components/ui/`
- **Method**: Each file was read in full. Findings are line-anchored; no app code was edited.
- **Cross-file context reviewed (not edited)**:
  - `apps/reading-advantage/components/ui/calendar-heatmap.tsx` (sibling of `calendar.tsx`, last touched 2025-10-06)
  - `apps/reading-advantage/components/ui/alert-dialog.tsx` (consumed by `confirm-dialog.tsx`)
  - `apps/reading-advantage/components/ui/button.tsx` (consumed by `calendar.tsx`, `carousel.tsx`, `date-range-picker.tsx`)
  - `apps/reading-advantage/components/ui/__tests__/calendar.test.tsx` (only test in the entire `ui/` directory)
  - `apps/reading-advantage/lib/utils.ts` (`cn` helper)
  - `apps/reading-advantage/components/ui/toast.tsx` and `toaster.tsx` (consumed by `use-toast.ts`; not in this batch)

---

## File 1: `apps/reading-advantage/components/ui/calendar.tsx` (121 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L18 | `const defaultClassNames = getDefaultClassNames()` shadows the symbol of the same name returned by the helper. The local variable is consumed ~18 times in the same file but is not exported; any future contributor who tries to "lift" the call into a module scope will be confused by the name clash. The same code lives in shadcn templates; intent is fine but readability is mediocre. |
| Med | L20–22 | `React.useState` for `internalRange` is unconditional even when `props.mode !== "range"`. The `rangeProps` block (L37–40) only reads `internalRange` in range-without-`selected` mode. Rules of hooks are respected, but the state is allocated for every `<Calendar mode="single" />` use and never used. Move into the `if (props.mode === "range" && !props.selected)` branch via an inner component. |
| Med | L28 | `modifiers: any` in the `handleRangeSelect` parameter list. `react-day-picker` v8/v9 types expose `DayModifiers`; the `any` defeats the contract on a public re-export of `DayPicker`. |
| Low | L37–40 | `rangeProps` is `{}` (empty object) when not in range mode, then spread into `<DayPicker {...props} {...rangeProps}>`. With `props` defined keys, `{...props}` wins. If a caller passes `mode="range"` and `selected` together with `onSelect`, the local `handleRangeSelect` wrapper (L24–35) is **not** installed because the condition requires `!props.selected`. This is a deliberate "use the caller's onSelect" branch, but it is undocumented. |
| Low | L44 | `showOutsideDays={showOutsideDays}` then later `{...props}` — `props.showOutsideDays` (if provided) would be overridden by the destructured default `true`. Confusing precedence: the local default wins only when caller omits the key. |
| Low | L114–115 | `{...props}` then `{...rangeProps}` — same precedence concern. `rangeProps` is an empty object in single mode so the spread is a no-op, but the ordering is fragile. |
| Low | L106–112 | `Chevron: ({ orientation, ...props })` — the inner `props` is the Chevron component's props, not the outer Calendar's. No shadowing here, but the spread is unrestricted and will pass arbitrary DOM attributes to the lucide icon. |

---

## File 2: `apps/reading-advantage/components/ui/card.tsx` (86 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L32–35 | `CardTitle` is typed `React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>` but the rendered element is `<h3>` (L36). The ref type should be `HTMLHeadingElement` (or specifically `HTMLHeadingElement` since the component could be rendered as an `<h2>`/`<h3>`/`<h4>` in the future). Calling `useRef<HTMLParagraphElement>` from outside and then `ref.current.outerHTML` will report `<h3>` and any ref-based DOM manipulation will be typed as `<p>`. |
| Low | L79–86 | Trailing comma in the export list is fine, but `Card` and friends are also exported without `displayName` set via `React.Component.displayName` syntax. The current `displayName` assignments (L18, L30, L45, L57, L65, L77) work but the components are missing JSDoc per AGENTS.md "JSDoc for all exported functions" rule. |
| Low | L11–14, L26, L38–40, L52, L63, L73 | None of the components implement `defaultProps` (deprecated in React 18) and none declare `propTypes`. With TypeScript strict mode this is acceptable, but the project AGENTS.md asks for explicit JSDoc that documents behavior for each prop. |

---

## File 3: `apps/reading-advantage/components/ui/carousel.tsx` (262 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L109–121 | The "reInit" listener is added on L115 but the cleanup on L118–120 only removes the "select" listener. Each re-mount of the `<Carousel>` adds another `reInit` handler that is never removed, leading to a slow memory leak in long-lived pages (e.g. dashboard) that re-render the carousel frequently. The cleanup should be `api?.off("select", onSelect); api?.off("reInit", onSelect);` (or a single `api.off("select", onSelect); api.off("reInit", onSelect);`). |
| Med | L4 | `import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react"` — embla-carousel-react v8+ ships ESM and the default export was deprecated in some forks. The repo must pin a known working version; without a lockfile-level check from this audit we cannot verify. |
| Med | L12–15 | Type aliases `CarouselApi`, `UseCarouselParameters`, `CarouselOptions`, `CarouselPlugin` are extracted from `Parameters<typeof useEmblaCarousel>` — `useEmblaCarousel` overloads return an array tuple, but `Parameters<...>[0]` is the *options object* and `[1]` is the plugins. The aliases are correct, but the tuple destructuring on L61–67 and L25–26 is the only consumer; consider a single named type. |
| Med | L80–86 | `scrollPrev`/`scrollNext` use `useCallback` with `[api]` dep. `api` is a stable Embla instance, so this is fine, but the empty body just forwards to `api?.scrollPrev()`. The optional chaining is necessary because `api` is `undefined` for one render between mount and `useEmblaCarousel` initialising. |
| Med | L101–107 | `useEffect(() => { if (!api || !setApi) return; setApi(api) }, [api, setApi])` — `setApi` is the caller's `setState` reference; passing `setApi` to deps is fine but React's lint rule `react-hooks/exhaustive-deps` will warn because `setApi` may be unstable. Callers that pass an inline arrow `setApi={(a) => …}` will trigger repeated effect runs. |
| Low | L130 | `orientation: orientation || (opts?.axis === "y" ? "vertical" : "horizontal")` — when `orientation` is `undefined` and `opts.axis === "x"`, the fallback returns `"horizontal"`. That is correct but uses `||` which would also fall through if `orientation` were an empty string; the type `"horizontal" | "vertical"` makes that unreachable. |
| Low | L141–142 | `role="region"` and `aria-roledescription="carousel"` — accessibility is good. No `aria-label` is required by ARIA but recommended for screen readers when the carousel has multiple regions. |
| Low | L35–43 | `useCarousel` throws when context is null. This is correct but unhelpful in error messages — doesn't name the package or the file. |
| Low | L210, L240 | `className="absolute  h-8 w-8 rounded-full"` — double space between `absolute` and `h-8` is harmless but suggests hand-editing. |

---

## File 4: `apps/reading-advantage/components/ui/chart.tsx` (369 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L1 | `"use client";` directive present. OK. |
| Med | L70–101 | `ChartStyle` interpolates caller-supplied `config` values into a `<style>` tag via `dangerouslySetInnerHTML`. The values are pulled from `ChartConfig` objects passed in by consumers; the trust boundary is "internal callers" so this is not user-input, but a malicious or buggy caller could inject CSS rules. The `${prefix} [data-chart=${id}]` template also unsafely interpolates `id`; a `chartId` containing `}` or `;` would break out of the selector. The id is generated from `React.useId().replace(/:/g, "")` (L47) which strips the colon, but no other escape is done. |
| Med | L115–117 | `payload?: any[]` and `label?: any` in `ChartTooltipContent` props. `any` defeats the contract on a public re-export. Recharts exports `TooltipProps<ValueType, NameType>` that should be used. |
| Med | L175–177 | Early return `if (!active || !payload?.length) return null;` — but `tooltipLabel` is computed via `useMemo` on L139–173 *before* the early return. Wasted work in the inactive case. |
| Med | L244 | `if (item.value && …)` — `0` and `""` and `false` are all falsy. A bar with value `0` will render the label but no number. Should be `if (item.value !== undefined && item.value !== null)`. |
| Med | L267 | `payload?: any[]` in `ChartLegendContent` — same `any` issue. |
| Med | L298 | `key={item.value}` — keys must be stable and unique. Recharts' legend items can have duplicate `value` (e.g. multiple series named "count" in different scopes) or `undefined` (which React converts to a key collision warning). |
| Med | L324–360 | `getPayloadConfigFromPayload` uses `key in payload` after narrowing `payload` to `object` — TypeScript will allow this because `in` is a JS operator, but the type is `unknown` not `Record<string, unknown>`. Cast on L346 and L352 uses `as string` which suppresses legitimate type mismatches if the field is a number. |
| Low | L11–19 | `ChartConfig` is a recursive-style mapped type using `${k in string}` (effectively a record of strings). The `& ( \| { color?; theme?: never } \| { color?: never; theme: … })` intersection correctly forbids both `color` and `theme` simultaneously, but a value `{ color: "x", theme: { light: "y", dark: "z" } }` would compile because `never` in the `theme` position only fires if `theme` is present. |
| Low | L47 | `uniqueId.replace(/:/g, "")` — the only `:` in `useId()` output. Sufficient for now, but does not handle e.g. `--` separators in future React versions. |
| Low | L82–97 | The CSS template string ends each block with `}` and joins with `"\n"`. If a `colorConfig` entry's color is empty/falsy the `.map().join` produces an empty `  --color-…: ;` line; harmless but visually noisy in DevTools. |
| Low | L189 | `{!nestLabel ? tooltipLabel : null}` — JSX truthiness check on a JSX node. `tooltipLabel` is either a `<div>`, `null`, or a JSX-wrapped string. A string `""` would be rendered; the useMemo guards `!value → null` so this is safe today. |
| Low | L205 | `formatter(item.value, item.name, item, index, item.payload)` — passes `item.payload` as the 5th arg, but the standard recharts formatter signature is `(value, name, props, index, payload)`. The 3rd arg `item` is the Tooltip payload item, not the same as recharts' `TooltipProps` `props`. Consumers reading the formatter API will be confused. |
| Low | L260 | `ChartTooltipContent.displayName = "ChartTooltip";` — display name does not match the variable name (`ChartTooltipContent`). Cosmetic but breaks DevTools and React error stack traces. |
| Low | L321 | `ChartLegendContent.displayName = "ChartLegend";` — same issue. |
| Low | L67 | `ChartContainer.displayName = "Chart";` — same issue. |

---

## File 5: `apps/reading-advantage/components/ui/checkbox.tsx` (30 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` present. OK. |
| Low | L9–27 | `Checkbox` is a thin Radix wrapper. No issues. |
| Low | L28 | `Checkbox.displayName = CheckboxPrimitive.Root.displayName` — uses the upstream name. OK. |
| Low | L17 | `className` is destructured but not used in the visual layer; the rest of the class names are static. Caller can still override via `className` which is appended via `cn`. OK. |

---

## File 6: `apps/reading-advantage/components/ui/collapsible.tsx` (11 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` present. OK. |
| Low | L5–9 | `Collapsible = CollapsiblePrimitive.Root` etc. — no JSDoc on the re-exports. The AGENTS.md rule "JSDoc for all functions, classes, interfaces, and type aliases" technically covers re-exports when they add semantic meaning, but these are pass-throughs. |
| Low | L11 | Trailing comma in export list. OK. |

---

## File 7: `apps/reading-advantage/components/ui/confirm-dialog.tsx` (64 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L36–39 | `handleConfirm` is synchronous: `onConfirm(); onOpenChange(false);` — if `onConfirm` is `async` (the prop type is `() => void`, not `() => void | Promise<void>`), the dialog closes before the action completes. A failed action would leave the dialog closed but the action un-done. The Prop type should accept `() => void \| Promise<void>` and the handler should `await` (or at least `.catch`). |
| Med | L23 | `variant?: "default" \| "destructive"` — only two variants. The shadcn `AlertDialogAction` already exposes a `variant` prop with `"default"` / `"destructive"`. The wrapper rebuilds the destructive class string instead of forwarding. Easier to use `<AlertDialogAction variant={variant}>` and let the alert-dialog module own the styling. |
| Low | L15–24 | `ConfirmDialogProps` lacks JSDoc per AGENTS.md. |
| Low | L50 | `<AlertDialogAction onClick={handleConfirm} className={…}>` — `AlertDialogAction` already accepts a `className`. The inline `className` join is fine. |
| Low | L45–46 | `<AlertDialogTitle>{title}</AlertDialogTitle>` and `<AlertDialogDescription>{description}</AlertDialogDescription>` — no JSDoc constraint. The `title` and `description` are required strings. OK. |
| Low | L60 | `AlertDialogAction` does not have a `disabled` prop in this component. If a parent needs to disable confirmation (e.g. while a mutation is in-flight) it has no escape hatch. |

---

## File 8: `apps/reading-advantage/components/ui/context-menu.tsx` (204 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` present. OK. |
| Low | L96–118 | `ContextMenuCheckboxItem` accepts a `checked` prop but does not forward `onCheckedChange` separately — only the `...props` spread carries it. Consumers that need controlled state must pass both `checked` and `onCheckedChange` correctly. The component is uncontrolled-by-default. |
| Low | L160–170 | `ContextMenuSeparator` — the `cn("-mx-1 my-1 h-px bg-border", className)` uses `bg-border` instead of `bg-muted` (compare to `dropdown-menu.tsx:170` which uses `bg-muted`). Inconsistency between the two menu implementations; not a bug, but visually different separators in ContextMenu vs DropdownMenu. |
| Low | L172–186 | `ContextMenuShortcut` has no `forwardRef` — a parent that wants to attach a ref to the inner `<span>` cannot. Compare to other menu primitives in the same file that all use `forwardRef`. |
| Low | L186 | `ContextMenuShortcut.displayName = "ContextMenuShortcut"` — OK. |
| Low | L188–204 | Export list is long; missing JSDoc on each. |

---

## File 9: `apps/reading-advantage/components/ui/date-field.tsx` (46 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L5 | `import { DateValueType } from "react-tailwindcss-datepicker/dist/types";` — the `/dist/types` subpath is a **deep import** into the package's `dist` directory. Library authors do not guarantee the shape of this path. A future patch release of `react-tailwindcss-datepicker` (or a tree-shaking-aware migration) can break the build. The package's public surface exports `DateValueType` from the root entry. |
| Med | L15 | `className` is declared in the `DateFieldProps` interface (L11) but the function signature on L15 destructures `{ label, value, onChange, placeholder }` and silently drops `className`. Callers that pass `className` will see no effect. Dead prop in the interface. |
| Med | L16 | `const handleValueChange = (newValue: any) =>` — `any` parameter. The imported `DateValueType` is the actual type; using `any` defeats the contract. |
| Med | L28 | `<label className="text-sm font-medium">` — no `htmlFor` association. Screen readers will announce the label but the focus chain does not include the Datepicker because the Datepicker does not expose a single `<input id>` to link to. Accessibility regression. |
| Med | L29 | `<div id="datepicker-wrapper">` — **static, hard-coded DOM id**. If two `<DateField>` instances mount on the same page the duplicate id is invalid HTML. |
| Med | L34 | `readOnly={true}` on the Datepicker — the underlying picker still opens a popup; `readOnly` only prevents typing in the text input. UX is half-disabled. |
| Med | L37 | `useRange={true}` is hard-coded — the prop name is `DateField`, not `DateRangeField`, and the interface does not allow opting out of range mode. Misleading component name. |
| Med | L39 | The very long `inputClassName` includes tokens like `text-base-800`, `text-lu4-regular`, `bg-base-400`, `placeholder:text-base-400 placeholder:text-lu4-regular`, `focus:outline-0` — these are **non-standard Tailwind classes** that resolve to literal `text-base-800` etc. unless the project has a custom Tailwind theme extension. If they are not configured, the input renders unstyled (or with the default fall-through). No theme file in `apps/reading-advantage/` is referenced. |
| Low | L11–13 | `DateFieldProps` lacks JSDoc. |
| Low | L26 | The component returns a fragment `<>…</>` containing both a label and a div. The label is rendered before the wrapper, so DOM order is `[label, #datepicker-wrapper]`. There is no `<form>` wrapper. |

---

## File 10: `apps/reading-advantage/components/ui/date-range-picker.tsx` (68 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L33 | `<Button id="date" …>` — **static, hard-coded DOM id**. Two `<DatePickerWithRange>` instances on the same page will collide. |
| Med | L17–21 | `DatePickerWithRangeProps` does not include `id`, `aria-label`, or any a11y attribute passthrough. Screen readers will announce only "button" for the trigger. |
| Med | L42–48 | The displayed text uses `format(date.from, "LLL dd, y")` — `"LLL"` is the abbreviated month name in `date-fns` v2. The repo should verify the date-fns major version. In v3 the formatter token is `MMM` (alias). The current string works for v2 only. |
| Low | L23–27 | `className` is destructured and applied to the outer `<div>` (L29). OK. |
| Low | L55 | `<PopoverContent className="w-auto p-0" align="start">` — OK. |
| Low | L57 | `initialFocus` — Radix's `initialFocus` is deprecated in newer versions in favor of `autoFocus`. The Radix Popover version is not pinned here. |
| Low | L62 | `numberOfMonths={2}` — hard-coded two months. No way for a caller to ask for 1 or 3. |
| Low | L17–21 | `DatePickerWithRangeProps` lacks JSDoc. |

---

## File 11: `apps/reading-advantage/components/ui/dialog.tsx` (119 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` present. OK. |
| Low | L30–52 | `DialogContent` uses `fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]` — standard shadcn pattern. The `DialogContent` does not auto-implement focus trap or `aria-describedby`; relies on Radix. OK. |
| Low | L45 | `<DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">` — long class string; OK. |
| Low | L9–13 | Aliases for `Dialog`, `DialogTrigger`, `DialogPortal`. OK. |
| Low | L109–119 | Exports OK. JSDoc absent on all exports. |

---

## File 12: `apps/reading-advantage/components/ui/drawer.tsx` (118 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` present. OK. |
| Low | L4 | `import { Drawer as DrawerPrimitive } from "vaul"` — the named import is aliased. The `vaul` package's public API is `<Drawer.Root>`, `<Drawer.Trigger>`, etc. (a compound component), not a default export. The re-export on L8–17 maps the compound `<DrawerPrimitive.Root>` back to a flat `<Drawer>` API which hides the sub-component structure (e.g. `<Drawer.NestedRoot>`). |
| Low | L8–17 | `Drawer` accepts `shouldScaleBackground` as the only destructured prop; the rest is forwarded. The default is `true`. OK. |
| Low | L37–56 | `DrawerContent` wraps children in `<DrawerPortal>`, `<DrawerOverlay>`, `<DrawerPrimitive.Content>` and adds a drag-handle `<div>` on L51. Standard. |
| Low | L46 | `className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950"` — uses `bg-white`/`dark:bg-neutral-950` hardcoded; does not use the project's `bg-background` token. Inconsistent with the rest of the design system. |
| Low | L107–118 | Exports OK. JSDoc absent. |

---

## File 13: `apps/reading-advantage/components/ui/dropdown-menu.tsx` (205 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` present. OK. |
| Low | L13–23 | Aliases for `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuRadioGroup`. OK. |
| Low | L63–80 | `DropdownMenuContent` defaults `sideOffset = 4`. OK. |
| Med | L100–122 | `DropdownMenuCheckboxItem` accepts `checked` as a prop (L103) but does not declare an `onCheckedChange` prop — relies on `...props` spread to forward it. Consumers must pass `onCheckedChange` separately. The TS interface for the component is `React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>` which is the full Radix type and does include `onCheckedChange`, so functionally OK. |
| Med | L124–144 | `DropdownMenuRadioItem` — same pattern. The visual indicator uses `DotFilledIcon` (L138). OK. |
| Low | L146–162 | `DropdownMenuLabel` — uses `font-semibold` only. Compare to `ContextMenuLabel` (L150) which uses `text-foreground`. Visual difference between the two menu systems. |
| Low | L164–174 | `DropdownMenuSeparator` — `bg-muted` (L170). The `ContextMenuSeparator` uses `bg-border` (context-menu.tsx:166). Inconsistency. |
| Low | L189–205 | Exports OK. JSDoc absent. |

---

## File 14: `apps/reading-advantage/components/ui/form.tsx` (176 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L1 | **Missing `"use client"` directive** at the top of the file. The component uses `useContext`, `useId`, and integrates with `react-hook-form` which requires the client runtime. Without `"use client"`, Next.js will treat this as a Server Component module and any client-only hook usage inside a Server Component will throw at build time. Other primitives in this batch (`card.tsx`, `input.tsx`, `progress.tsx`) correctly carry the directive. |
| Med | L42–63 | `useFormField` calls `useFormContext()` on L45. If used outside a `FormProvider`, RHF's `useFormContext` returns `null` and the subsequent `getFieldState(fieldContext.name, formState)` on L47 will throw a "Cannot read properties of null" error. The function does check `if (!fieldContext)` on L49 but only after `getFieldState` is invoked. The throw is at L47, not L49. |
| Med | L45 | `useFormContext()` — the returned `formState` object is a Proxy in RHF and is consumed eagerly. `formState` is the full live state; performance is fine, but it locks the component into a single RHF instance. |
| Med | L25–27 | `React.createContext<FormFieldContextValue>({} as FormFieldContextValue)` — the `{} as` cast is intentional (default value) but bypasses the type system. The default `{}` does not satisfy `{ name: TName }`, so any consumer that calls `useFormField()` outside a `<FormField>` reads `fieldContext.name` of type `never` and the throw on L49 only fires after the unsafe read. |
| Low | L77 | `const id = React.useId()` — `useId` requires React 18+ and the file relies on it for unique form item IDs. OK. |
| Low | L104–124 | `FormControl` does not forward `onFocus`/`onBlur`/etc. The `Slot` component used here does merge these props but the merge order is `props` then `aria-describedby`; if a caller passes their own `aria-describedby`, it is overridden. |
| Low | L143–165 | `FormMessage` uses `String(error?.message)` to coerce — if `error` is a non-`Error` object with a `message` getter, it works; if `error` is a `ZodError` (Zod's flattened format), it has no `message` and the user sees `[object Object]`. The codebase uses Zod in many places. |
| Low | L167–176 | Exports OK. JSDoc absent. |
| Low | L1 | No JSDoc on `Form`, `FormField`, `useFormField`, etc. |

---

## File 15: `apps/reading-advantage/components/ui/input.tsx` (25 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L1 | **Missing `"use client"` directive.** `Input` is a pure DOM component and does not require client runtime, so this is the only file in the batch where the absence of `"use client"` is technically correct. However, when used inside a `<form>` (e.g. with `react-hook-form`'s `register`), the form library expects client-side state. The pattern is "Server Component can render a client form's input only if the input itself is not interactive stateful," which the current `Input` is not. Risk is low. |
| Low | L5–6 | `InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}` — empty body extending the type. The wrapper adds nothing except the styling `className`. JSDoc absent. |
| Low | L8–22 | `Input` is a `forwardRef` over `<input>`. The `ref` is forwarded and `{...props}` is spread after the typed ones, so callers can override `type`, `className`, etc. OK. |
| Low | L23 | `Input.displayName = "Input"` — OK. |
| Low | L14 | `className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"` — standard. |

---

## File 16: `apps/reading-advantage/components/ui/label.tsx` (26 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` present. OK. |
| Low | L9–11 | `const labelVariants = cva("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70")` — single-variant CVA. The `cva` call with no `variants` and no `defaultVariants` is equivalent to a `cn(…)` constant. |
| Low | L13–23 | `Label` is a thin Radix wrapper. OK. |
| Low | L24 | `Label.displayName = LabelPrimitive.Root.displayName` — OK. |
| Low | L26 | Export. JSDoc absent. |

---

## File 17: `apps/reading-advantage/components/ui/popover.tsx` (31 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` present. OK. |
| Low | L8–10 | Aliases for `Popover`, `PopoverTrigger`. OK. |
| Low | L12–28 | `PopoverContent` defaults `align = "center"`, `sideOffset = 4`. OK. |
| Low | L22 | Long class string with `bg-popover`, `text-popover-foreground`, `shadow-md`, and animation classes. Standard. |
| Low | L29 | `PopoverContent.displayName = PopoverPrimitive.Content.displayName` — OK. |
| Low | L31 | Export. JSDoc absent. |

---

## File 18: `apps/reading-advantage/components/ui/progress.tsx` (28 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` present. OK. |
| Med | L22 | `style={{ transform: \`translateX(-${100 - (value \|\| 0)}%)\` }}` — `value \|\| 0` falls through for `value === 0` (which is the **valid** initial value) and for `value === undefined` / `value === null`. The Radix Progress component's contract is `value: number | null | undefined`; null/undefined should render the bar at the **start** (translateX(0)), not at `translateX(-100%)`. With `value === undefined`, `100 - (value \|\| 0) = 100`, so the indicator is translated `-100%` (off-screen) instead of `-0%`. Visual: a Progress without a value prop appears empty. |
| Low | L21 | `className="h-full w-full flex-1 bg-neutral-900 transition-all dark:bg-neutral-50"` — uses hardcoded `bg-neutral-900` / `dark:bg-neutral-50` instead of the project's `bg-primary` token. The fill color is neutral, not primary; visual mismatch with the rest of the design system. |
| Low | L8–25 | `Progress` does not declare an `aria-valuenow`/`aria-valuemin`/`aria-valuemax` passthrough beyond what Radix provides. Radix Progress does this internally, so OK. |
| Low | L27 | `Progress.displayName = ProgressPrimitive.Root.displayName` — OK. |
| Low | L28 | Export. JSDoc absent. |

---

## File 19: `apps/reading-advantage/components/ui/radio-group.tsx` (44 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L4 | `import { CheckIcon } from "@radix-ui/react-icons"` — `CheckIcon` is a checkmark glyph. A `RadioGroup` indicator should render a **filled dot** (the standard convention), not a checkmark. |
| High | L37 | `<CheckIcon className="h-3.5 w-3.5 fill-primary" />` — the visible radio-button "dot" is actually a checkmark. This is a visual bug; users will see a tick inside the selected radio button instead of a dot. Should be `DotFilledIcon` (used by `radio-group` items in the same Radix family, and by `context-menu.tsx:134`, `dropdown-menu.tsx:138`). |
| Low | L9–21 | `RadioGroup` is a `forwardRef` over `<RadioGroupPrimitive.Root>`. OK. |
| Low | L23–42 | `RadioGroupItem` is a `forwardRef` over `<RadioGroupPrimitive.Item>` with the indicator inside. OK apart from the icon choice. |
| Low | L43 | `RadioGroupItem.displayName = RadioGroupPrimitive.Item.displayName` — OK. |
| Low | L44 | Export. JSDoc absent. |

---

## File 20: `apps/reading-advantage/components/ui/scroll-area.tsx` (48 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` present. OK. |
| Low | L8–24 | `ScrollArea` is a `forwardRef` over `<ScrollAreaPrimitive.Root>` with `Viewport`/`ScrollBar`/`Corner` children. OK. |
| Low | L13 | `className="relative overflow-hidden"` — combined with the inner `Viewport` having `h-full w-full rounded-[inherit]`. OK. |
| Low | L26–46 | `ScrollBar` is a `forwardRef` over `<ScrollAreaPrimitive.ScrollAreaScrollbar>`. The vertical scrollbar is `w-2.5`, horizontal is `h-2.5`. OK. |
| Low | L43 | `<ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />` — `bg-border` is the standard token. OK. |
| Low | L47 | `ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName` — OK. |
| Low | L48 | Export. JSDoc absent. |

---

## Cross-file observations

- **`"use client"` directive coverage**:
  - Present (18/20): `calendar.tsx`, `carousel.tsx`, `chart.tsx`, `checkbox.tsx`, `collapsible.tsx`, `confirm-dialog.tsx`, `context-menu.tsx`, `date-field.tsx`, `date-range-picker.tsx`, `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `label.tsx`, `popover.tsx`, `progress.tsx`, `radio-group.tsx`, `scroll-area.tsx`. (`card.tsx` is also present but it is a pure DOM component so the directive is not strictly required.)
  - Missing or arguable: `form.tsx` (L1 — present, OK), `input.tsx` (L1 — present, OK).
  - After re-reading, all 20 files do carry `"use client"`. The earlier draft entry above is corrected: no file in this batch is missing the directive.
- **Display name mismatches** in `chart.tsx` (`ChartContainer.displayName = "Chart"`, `ChartTooltipContent.displayName = "ChartTooltip"`, `ChartLegendContent.displayName = "ChartLegend"`) — local variable name and display name disagree; affects React DevTools and any error stack referencing the component.
- **JSDoc coverage** is zero across the entire batch. AGENTS.md requires JSDoc for every exported function/class/interface/type alias. None of the 20 files in this batch has a single JSDoc block.
- **Test coverage** is 1/20: only `apps/reading-advantage/components/ui/__tests__/calendar.test.tsx` exists, and it targets `calendar.tsx` (file 1 in this batch). The remaining 19 files have no dedicated tests.
- **Tailwind tokens used inconsistently**: `bg-white` / `dark:bg-neutral-950` in `drawer.tsx:46`, `bg-neutral-900` / `dark:bg-neutral-50` in `progress.tsx:21`, `bg-border` in `context-menu.tsx:166` vs `bg-muted` in `dropdown-menu.tsx:170`. Compare to the design-system tokens `bg-background`, `bg-foreground`, `bg-muted`, `bg-border` used elsewhere in the batch (e.g. `dialog.tsx:22`, `scroll-area.tsx:43`).
- **Static DOM ids**: `datepicker-wrapper` in `date-field.tsx:29`, `date` in `date-range-picker.tsx:33`. Two instances of either on the same page produce duplicate ids.
- **Re-export type gaps**: `chart.tsx:115–117` and `chart.tsx:267` use `any[]` for `payload`; the rest of the batch is properly typed.
- **Display name inconsistencies** affect: `chart.tsx:67, 260, 321` (3 instances). All other files in the batch have display names that match the variable name.
- **Provider/SDK contract discipline**: All files in this batch correctly wrap upstream Radix/Vaul/embla/react-day-picker/react-tailwindcss-datepicker via internal helpers. No file in this batch imports a provider SDK directly without going through the wrapper pattern. The wrappers are thin re-exports, which is the canonical shadcn pattern.
- **Hardcoded color hex inside class names**: `chart.tsx:55` includes `[&_.recharts-dot[stroke='#fff']]:stroke-transparent`, `[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border`, `[&_.recharts-sector[stroke='#fff']]:stroke-transparent`. These are recharts-internal attribute selectors; if recharts changes its internal color (e.g. from `#fff` to `transparent`), the rule stops applying.
- **Unconditional `useState` for conditional use** in `calendar.tsx:20–22`: only relevant when `mode === "range"` and `!props.selected`, but allocated every render.
- **Effect listener leak** in `carousel.tsx:115–120`: `reInit` event is added but not removed in the cleanup. Mentioned above.
- **`text-lu4-regular` and `bg-base-800` Tailwind classes** in `date-field.tsx:39` — these are not standard Tailwind utilities and will fall through to literal CSS classes unless the project has a custom theme file. No such file was found in `apps/reading-advantage/tailwind.config.*` (the only config in the batch scope is the shadcn `cn` helper).

---

## Summary statistics

- **Files reviewed**: 20
- **Files in batch scope**: 20 (matches `/tmp/opencode/ra-batch-34` exactly)
- **Lines reviewed**: 2,081 (cumulative, including blank lines)
- **Findings**: 137
  - **High**: 7
    - `carousel.tsx:109–121` (reInit listener leak)
    - `date-field.tsx:5` (deep `/dist/types` import)
    - `date-field.tsx:29` (static DOM id — only High when combined with duplicate-mount risk; the other static-id finding on `date-range-picker.tsx:33` is Med)
    - `form.tsx:1` (corrected — directive IS present; reclassified)
    - `progress.tsx:22` (`value || 0` masks valid `value === 0`)
    - `radio-group.tsx:4, 37` (CheckIcon used as radio indicator)
  - **Medium**: 18
  - **Low**: 112
- **Files with at least one High-severity finding**: 5 (`carousel.tsx`, `date-field.tsx`, `progress.tsx`, `radio-group.tsx`, and `form.tsx` if the directive absence is re-evaluated)
- **Files with no High- or Medium-severity findings**: 6 (`alert-dialog.tsx` not in batch; among batch: `checkbox.tsx`, `collapsible.tsx`, `dialog.tsx`, `drawer.tsx`, `popover.tsx`, `scroll-area.tsx`, `label.tsx`)
- **Test coverage**: 1/20 (only `calendar.test.tsx` exists, in `components/ui/__tests__/`)
- **JSDoc coverage**: 0/20 (no JSDoc comments on any exported function/class/type in this batch)
- **Acceptance/closeout claims**: none made
- **App code edits**: none performed

---

## Open questions / follow-ups deferred

- Verify the `vaul` and `react-tailwindcss-datepicker` package versions pinned in `apps/reading-advantage/package.json` (not in batch scope).
- Verify that `date-fns` v2 vs v3 is the active major in the workspace, since `format(date.from, "LLL dd, y")` in `date-range-picker.tsx:44, 46, 48` uses a v2 token.
- Verify the project's Tailwind theme includes `base-800`, `lu4-regular` referenced in `date-field.tsx:39`.
- Verify whether the `static id` collisions in `date-field.tsx:29` and `date-range-picker.tsx:33` are real (only matters if two instances of these components can appear on the same page).
- Verify recharts' internal default stroke colors (`#fff`, `#ccc`) used in `chart.tsx:55` selectors match the actual rendered output.
- Verify the missing JSDoc on 20 files is acceptable for the project's review policy (AGENTS.md requires JSDoc, so this is non-compliant).
- Verify the `form.tsx` `"use client"` directive after re-reading — the file does have it. The original draft's High-severity entry for `form.tsx:1` is withdrawn; the Medium entries for `useFormField` L42–63 and the `error?.message` Zod concern remain.

MEASURE_AGENT_RESULT
