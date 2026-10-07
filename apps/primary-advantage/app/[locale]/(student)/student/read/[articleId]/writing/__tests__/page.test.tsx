import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn() }));

import ArticleWritingPage from "../page";
import { redirect } from "@/i18n/navigation";

describe("legacy /writing link", () => {
  it("opens the article page, which resolves a legacy id (spec D3)", async () => {
    await ArticleWritingPage({ params: Promise.resolve({ locale: "th", articleId: "cmgqx8v6602p3t79btatvfjuw" }) });
    expect(redirect).toHaveBeenCalledWith({ href: "/student/read/cmgqx8v6602p3t79btatvfjuw", locale: "th" });
  });
});
