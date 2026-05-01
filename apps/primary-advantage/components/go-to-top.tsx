"use client";

import { ArrowUp } from "lucide-react";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

export function GoToTop() {
  return (
    <div className="fixed right-4 bottom-4 z-50">
      <Link
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className={cn(
          buttonVariants({ variant: "default" }),
          "rounded-full shadow-lg transition-shadow hover:shadow-xl",
        )}
      >
        <ArrowUp className="h-4 w-4" />
      </Link>
    </div>
  );
}
