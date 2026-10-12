import { describe, expect, it } from "vitest";

import { bookCallbackPath } from "../../safe-callback-path";
import { bookSignInHref } from "../signin-href";

describe("bookSignInHref", () => {
  it("builds the callback in the form of the proxy, for reading and writing", () => {
    expect(bookSignInHref({ locale: "th", book: "o3-2", number: 5 })).toEqual({ pathname: "/auth/signin", query: { callbackUrl: "/th/b/o3-2/5" } });
    const writing = bookSignInHref({ locale: "en", book: "o3-2", number: 12, writing: true });
    expect(writing.query.callbackUrl).toBe("/en/b/o3-2/12/writing");
    expect(bookCallbackPath(writing.query.callbackUrl)).toBe("/b/o3-2/12/writing");
  });
});
