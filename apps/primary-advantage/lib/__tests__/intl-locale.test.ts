import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { dateFnsLocale, intlFormatter, intlLocale } from "../intl-locale";

describe("intlLocale", () => {
  it("maps the app codes cn and tw to BCP 47 tags and keeps the others", () => {
    expect(intlLocale("cn")).toBe("zh-CN");
    expect(intlLocale("tw")).toBe("zh-TW");
    expect(["en", "th", "vi"].map(intlLocale)).toEqual(["en", "th", "vi"]);
  });

  it("gives a Chinese date with the mapped tag (the raw code falls back to English)", () => {
    const day = new Date("2026-10-06T00:00:00Z");
    const fmt = (locale: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(day);
    expect(fmt(intlLocale("cn"))).toBe("10月6日");
    expect(fmt("cn")).toBe("Oct 6");
  });

  it("gives server pages a Chinese date for cn and tw, not the Thai of the request fallback (run 2 S8)", () => {
    const day = new Date("2026-10-13T00:00:00Z");
    const fmt = (locale: string) => intlFormatter(locale).dateTime(day, { day: "numeric", month: "short", timeZone: "UTC" });
    expect(fmt("cn")).toBe("10月13日");
    expect(fmt("tw")).toBe("10月13日");
    expect(fmt("en")).toBe("Oct 13");
  });
});

describe("dateFnsLocale", () => {
  it("gives Thai month names and Thai calendar labels on the Thai reports page (2026-10-21)", () => {
    const th = dateFnsLocale("th") as ReturnType<typeof dateFnsLocale> & { labels?: Record<string, unknown> };
    expect(format(new Date(2026, 9, 21), "LLLL y", { locale: th })).toBe("ตุลาคม 2026");
    expect(th.labels?.labelPrevious).toBeDefined();
    expect(format(new Date(2026, 9, 21), "LLL dd, y", { locale: dateFnsLocale("xx") })).toBe("Oct 21, 2026");
  });
});
