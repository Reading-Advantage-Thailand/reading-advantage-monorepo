import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ loadStorytimeWeek: vi.fn() }));

vi.mock("@/lib/storytime/week", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/storytime/week")>()),
  loadStorytimeWeek: mocks.loadStorytimeWeek,
}));
vi.mock("@/components/storytime/storytime-week", () => ({ StorytimeWeekView: () => null }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

import StorytimeWeekPage, { generateMetadata } from "../page";
import { StorytimeWeekView } from "@/components/storytime/storytime-week";

const params = (level = "2", week = "1") => Promise.resolve({ locale: "th", level, week });
const open = (part?: string) => StorytimeWeekPage({ params: params(), searchParams: Promise.resolve({ part }) });

beforeEach(() => vi.clearAllMocks());

describe("/st/<level>/<week> (qr-page-spec section 2)", () => {
  it("renders the week view with the part of the address", async () => {
    mocks.loadStorytimeWeek.mockResolvedValue({ title: "Hello!" });
    const element = (await open("song")) as { type: unknown; props: Record<string, unknown> };
    expect(mocks.loadStorytimeWeek).toHaveBeenCalledWith("2", "1");
    expect(element.type).toBe(StorytimeWeekView);
    expect(element.props).toEqual({ week: { title: "Hello!" }, part: "song" });
    expect(((await open("x")) as { props: Record<string, unknown> }).props.part).toBeNull();
  });

  it("gives 404 for a week that is missing or not published", async () => {
    mocks.loadStorytimeWeek.mockResolvedValue(null);
    await expect(open()).rejects.toThrow("NOT_FOUND");
  });

  it("names the week in the title and keeps the page out of search engines", async () => {
    mocks.loadStorytimeWeek.mockResolvedValue({ title: "Hello!" });
    expect(await generateMetadata({ params: params() })).toEqual({ title: { absolute: "Hello! | Storytime Advantage" }, robots: { index: false, follow: false }, manifest: null });
    mocks.loadStorytimeWeek.mockResolvedValue(null);
    expect(await generateMetadata({ params: params("2", "99") })).toEqual({ robots: { index: false, follow: false }, manifest: null });
  });
});
