"use client";

import { useState, useRef, useEffect } from "react";
import { Icons } from "@/components/icons";
import { useScopedI18n } from "@/locales/client";

export default function CollapsibleNotice() {
  const [expanded, setExpanded] = useState(false);
  const [maxHeight, setMaxHeight] = useState("0px");
  const contentRef = useRef<HTMLDivElement>(null);
  const t = useScopedI18n("pages.student.lessonPage");

  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(expanded ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [expanded]);

  return (
    <div className="flex items-start gap-4 px-8">
      <Icons.AlertCircle className="mt-1 shrink-0" />
      <div className="text-sm leading-relaxed max-w-xl">
        <p>{t("collapsibleNotice45Min")}</p>
        <div
          ref={contentRef}
          style={{ maxHeight }}
          className="overflow-hidden transition-all duration-500 ease-in-out"
        >
          <p>{t("collapsibleNoticeDescription")}</p>
        </div>
        <button
          className="mt-2 text-xs text-blue-600 hover:underline"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? t("showLess") : t("readMore")}
        </button>
      </div>
    </div>
  );
}
