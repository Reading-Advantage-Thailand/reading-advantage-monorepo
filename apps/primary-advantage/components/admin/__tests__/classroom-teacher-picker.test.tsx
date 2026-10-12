// @vitest-environment jsdom
/**
 * Teacher picker of the class edit dialog (S1): the list of the class school, the owner row
 * checked and disabled, and the ids sent on save.
 */
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithMessages } from "@/components/__tests__/helpers/render-with-messages";
import { ClassroomTeacherPicker } from "../classroom-teacher-picker";

const SCHOOL = "5c5c5c5c-0000-4000-8000-000000000001";
const teachers = [
  { id: "t-alder", name: "Ms. Alder", email: "alder@demo.example" },
  { id: "t-birch", name: "Mr. Birch", email: "birch@demo.example" },
  { id: "t-cedar", name: "Ms. Cedar", email: "cedar@demo.example" },
];
const fetchMock = vi.fn();
const onChange = vi.fn();

/** Lets pending fetch promises and state updates settle. */
async function flush() {
  await act(async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve();
  });
}

/** Holds the selection so that a click changes the check boxes. */
function Harness({ initial }: { initial: string[] }) {
  const [ids, setIds] = useState(initial);
  return (
    <ClassroomTeacherPicker
      schoolId={SCHOOL}
      ownerId="t-alder"
      selectedIds={ids}
      onChange={(next) => {
        onChange(next);
        setIds(next);
      }}
    />
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  onChange.mockReset();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ teachers }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("classroom teacher picker", () => {
  it("fetches the teachers of the class school", async () => {
    renderWithMessages(<Harness initial={["t-alder"]} />);
    await flush();

    const url = new URL(String(fetchMock.mock.calls[0][0]), "http://localhost");
    expect(url.pathname).toBe("/api/teachers");
    expect(url.searchParams.get("role")).toBe("teacher");
    expect(url.searchParams.get("limit")).toBe("500");
    expect(url.searchParams.get("schoolId")).toBe(SCHOOL);
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  it("shows the owner checked, disabled, and labeled", async () => {
    renderWithMessages(<Harness initial={["t-alder", "t-birch"]} />);
    await flush();

    const owner = screen.getByLabelText(/Ms\. Alder/) as HTMLInputElement;
    expect(owner).toBeChecked();
    expect(owner).toBeDisabled();
    expect(screen.getByText("Class owner")).toBeInTheDocument();
    expect(screen.getByLabelText(/Mr\. Birch/)).toBeChecked();
    expect(screen.getByLabelText(/Ms\. Cedar/)).not.toBeChecked();
  });

  it("sends the checked ids, the owner always in the list", async () => {
    renderWithMessages(<Harness initial={["t-alder"]} />);
    await flush();

    fireEvent.click(screen.getByLabelText(/Ms\. Cedar/));
    expect(onChange).toHaveBeenLastCalledWith(["t-alder", "t-cedar"]);
    fireEvent.click(screen.getByLabelText(/Ms\. Cedar/));
    expect(onChange).toHaveBeenLastCalledWith(["t-alder"]);
  });

  it("shows an alert when the list does not load", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    renderWithMessages(<Harness initial={["t-alder"]} />);
    await flush();

    expect(screen.getByRole("alert")).toHaveTextContent("The teacher list did not load.");
  });
});
