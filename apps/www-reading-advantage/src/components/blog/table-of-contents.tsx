"use client";

import { useEffect, useState } from "react";
import { useScopedI18n } from "@/locales/client";
import { Heading } from "@/lib/blog";

interface TableOfContentsProps {
  headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const t = useScopedI18n("pages.blog");
  const [activeId, setActiveId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "0px 0px -80% 0px" },
    );

    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      headings.forEach((heading) => {
        const element = document.getElementById(heading.id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <>
      <nav className="hidden md:block sticky top-24 w-64 float-right ml-8 mb-8 p-4 border rounded-lg bg-card">
        <h2 className="font-semibold text-lg mb-4">{t("tableOfContents")}</h2>
        <ul className="space-y-2">
          {headings.map((heading) => (
            <li
              key={heading.id}
              className={`${heading.level === 3 ? "ml-3" : ""}`}
            >
              <a
                href={`#${heading.id}`}
                className={`text-sm transition-colors hover:text-foreground ${
                  activeId === heading.id
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.getElementById(heading.id);
                  if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                    setActiveId(heading.id);
                  }
                }}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="md:hidden mb-8">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full p-4 border rounded-lg bg-card"
        >
          <span className="font-semibold">{t("tableOfContents")}</span>
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {isOpen && (
          <ul className="mt-2 p-4 border rounded-lg bg-card space-y-2">
            {headings.map((heading) => (
              <li
                key={heading.id}
                className={`${heading.level === 3 ? "ml-3" : ""}`}
              >
                <a
                  href={`#${heading.id}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    const element = document.getElementById(heading.id);
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth" });
                      setIsOpen(false);
                    }
                  }}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
