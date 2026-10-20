// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { renderWithMessages, withMessages } from "@/components/__tests__/helpers/render-with-messages";
import { announceXp, LiveGem } from "../live-gem";

afterEach(cleanup);

describe("LiveGem", () => {
  it("adds the XP of a saved run at once, without a reload", () => {
    renderWithMessages(<LiveGem xp={30000} />, { locale: "en" });
    expect(screen.getByLabelText(/XP$/)).toHaveTextContent("30,000");
    act(() => announceXp(10));
    expect(screen.getByLabelText(/XP$/)).toHaveTextContent("30,010");
  });

  it("starts again from a new server value, which already counts the awarded XP", () => {
    const view = renderWithMessages(<LiveGem xp={100} />, { locale: "en" });
    act(() => announceXp(5));
    expect(screen.getByLabelText(/XP$/)).toHaveTextContent("105");
    view.rerender(withMessages(<LiveGem xp={105} />, "en"));
    expect(screen.getByLabelText(/XP$/)).toHaveTextContent("105");
  });
});
