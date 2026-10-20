// @vitest-environment jsdom
/** The due date calendar of the assign dialog speaks the page language (captures 2026-10-20). */
import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import AssignForm from "../assign-form";
import { renderWithMessages } from "../../__tests__/helpers/render-with-messages";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-20T03:00:00Z"));
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ classrooms: [] }), { status: 200 })));
});

describe("AssignForm due date", () => {
  it("shows Thai month and weekday names and a Thai date on /th", () => {
    renderWithMessages(<AssignForm onSave={() => {}} articleId="a1" formId="f1" />, { locale: "th" });
    expect(screen.getByText(/ตุลาคม 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/October/)).not.toBeInTheDocument();
    expect(screen.getByText("20 ตุลาคม 2569")).toBeInTheDocument();
  });

  it("keeps English on /en", () => {
    renderWithMessages(<AssignForm onSave={() => {}} articleId="a1" formId="f1" />);
    expect(screen.getByText(/October 2026/)).toBeInTheDocument();
    expect(screen.getByText("October 20, 2026")).toBeInTheDocument();
  });
});
