import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/book-link/book-link-case", () => ({ BookLinkCase: () => null }));
const info = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability/logger", () => ({ logger: { info, error: vi.fn() } }));

import UnknownBookAddressPage from "../page";
import { BookLinkCase } from "@/components/book-link/book-link-case";

describe("/b/<book>/<n>/<other> (unknown address)", () => {
  it("renders the unknown-address case page and logs it", async () => {
    const element = (await UnknownBookAddressPage({ params: Promise.resolve({ locale: "th", book: "o3-2", n: "5", rest: ["other"] }) })) as { type: unknown; props: Record<string, unknown> };
    expect(element.type).toBe(BookLinkCase);
    expect(element.props).toMatchObject({ name: "unknown-address", homeHref: "/" });
    expect(info).toHaveBeenCalledWith("book_link.unknown_address", { book: "o3-2", n: "5" });
  });
});
