// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Options } from "tsup";
import * as root from "../index";
import * as client from "../client";
import tsupConfig from "../../tsup.config";

/** Root exports that existed before the Phase 1 additions (other apps import them). */
const LEGACY_ROOT = [
  "Button", "buttonVariants",
  "Card", "CardHeader", "CardFooter", "CardTitle", "CardDescription", "CardContent",
  "Dialog", "DialogPortal", "DialogOverlay", "DialogTrigger", "DialogClose", "DialogContent",
  "DialogHeader", "DialogFooter", "DialogTitle", "DialogDescription",
  "Input", "Tabs", "TabsList", "TabsTrigger", "TabsContent", "Label", "Badge", "badgeVariants",
  "Separator", "Skeleton", "Avatar", "AvatarImage", "AvatarFallback", "Alert", "AlertTitle", "AlertDescription",
  "AlertDialog", "AlertDialogPortal", "AlertDialogOverlay", "AlertDialogTrigger", "AlertDialogContent",
  "AlertDialogHeader", "AlertDialogFooter", "AlertDialogTitle", "AlertDialogDescription",
  "AlertDialogAction", "AlertDialogCancel", "Progress", "Checkbox",
  "Tooltip", "TooltipTrigger", "TooltipContent", "TooltipProvider",
];

/**
 * Finds the tsup build entry that produces one output name.
 * @param name The output name, for example "client".
 * @returns The tsup options of that entry.
 */
function entry(name: string): Options {
  const configs = (Array.isArray(tsupConfig) ? tsupConfig : [tsupConfig]) as Options[];
  const found = configs.find((config) => Object.keys(config.entry as Record<string, string>).includes(name));
  expect(found, `tsup entry ${name}`).toBeDefined();
  return found!;
}

describe("package entries (server safety)", () => {
  it("keeps every root export from before Phase 1 and the server-safe Phase 1 additions", () => {
    for (const name of [...LEGACY_ROOT, "StatusChip", "statusChipVariants", "ShimmerSkeleton", "PageTransition", "cardHoverClassName"]) {
      expect(root, name).toHaveProperty(name);
    }
  });

  it("serves hook components only from the /client entry", () => {
    expect(root).not.toHaveProperty("AnimatedCounter");
    expect(client).toHaveProperty("AnimatedCounter");
  });

  it("gives the client bundle a use client banner and the root bundle none", () => {
    expect(String((entry("client").banner as { js?: string })?.js)).toMatch(/^["']use client["'];?$/);
    expect((entry("index").banner as { js?: string } | undefined)?.js).toBeUndefined();
  });
});
