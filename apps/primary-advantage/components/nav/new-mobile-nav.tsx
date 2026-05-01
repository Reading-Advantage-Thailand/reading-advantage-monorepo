"use client";

import * as React from "react";

import { useRouter } from "@/i18n/navigation";
import Link, { LinkProps } from "next/link";
// import { source } from "@/lib/source"
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Icons } from "@/components/icons";
import { useTranslations } from "next-intl";

export function MobileNav({
  //   tree,
  items,
  className,
}: {
  //   tree: typeof source.pageTree
  items: { href: string; label: string }[];
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const t = useTranslations("MainNav");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "extend-touch-target h-8 touch-manipulation items-center justify-start gap-2.5 !p-0 hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent dark:hover:bg-transparent",
            className,
          )}
        >
          <div className="relative flex h-8 w-4 items-center justify-center">
            <div className="relative size-4">
              <span
                className={cn(
                  "absolute left-0 block h-0.5 w-4 bg-cyan-500 transition-all duration-100",
                  open ? "top-[0.4rem] -rotate-45" : "top-1",
                )}
              />
              <span
                className={cn(
                  "absolute left-0 block h-0.5 w-4 bg-cyan-500 transition-all duration-100",
                  open ? "top-[0.4rem] rotate-45" : "top-2.5",
                )}
              />
            </div>
            <span className="sr-only">Toggle Menu</span>
          </div>
          <span className="font-heading flex h-8 items-center gap-2 text-lg leading-none text-cyan-500">
            <Icons.logo />
            {t("menu")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="bg-background/90 no-scrollbar h-(--radix-popper-available-height) w-(--radix-popper-available-width) overflow-y-auto rounded-none border-none p-0 shadow-none backdrop-blur duration-100"
        align="start"
        side="bottom"
        alignOffset={-16}
        sideOffset={14}
      >
        <div className="flex flex-col gap-12 overflow-auto px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="text-muted-foreground text-sm font-medium">
              {t("menu")}
            </div>
            <div className="flex flex-col gap-3">
              {items.map((item, index) => (
                <MobileLink
                  key={index}
                  href={item.href}
                  onOpenChange={setOpen}
                  className="capitalize"
                >
                  {t(item.label)}
                </MobileLink>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-8">
            {/* {tree?.children?.map((group, index) => {
              if (group.type === "folder") {
                return (
                  <div key={index} className="flex flex-col gap-4">
                    <div className="text-muted-foreground text-sm font-medium">
                      {group.name}
                    </div>
                    <div className="flex flex-col gap-3">
                      {group.children.map((item) => {
                        if (item.type === "page") {
                          return (
                            <MobileLink
                              key={`${item.url}-${index}`}
                              href={item.url}
                              onOpenChange={setOpen}
                            >
                              {item.name}
                            </MobileLink>
                          )
                        }
                      })}
                    </div>
                  </div>
                )
              }
            })} */}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
  ...props
}: LinkProps & {
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={() => {
        router.push(href.toString());
        onOpenChange?.(false);
      }}
      className={cn("text-2xl font-medium", className)}
      {...props}
    >
      {children}
    </Link>
  );
}
