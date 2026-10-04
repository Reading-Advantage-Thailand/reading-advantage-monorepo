// @vitest-environment jsdom
/**
 * Class setting for the picture password (primary_student_login_20261003, Phase 3 task 4, FR-7):
 * on or off per class, default on, through the Phase 2 setting route.
 */
import "@testing-library/jest-dom/vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PicturePasswordSetting } from "../teacher/class-login/picture-password-setting";
import { renderWithMessages } from "./helpers/render-with-messages";

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const fetchMock = vi.fn();
const respond = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("PicturePasswordSetting", () => {
  it("shows the setting on and explains it", () => {
    renderWithMessages(<PicturePasswordSetting classroomId={CLASS_ID} enabled onChange={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "Picture password" })).toBeChecked();
    expect(screen.getByText(/tap their 3 pictures/)).toBeInTheDocument();
  });

  it("turns the picture password off through the setting route", async () => {
    fetchMock.mockReturnValue(respond(200, { enabled: false }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderWithMessages(<PicturePasswordSetting classroomId={CLASS_ID} enabled onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Picture password" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/student/picture-password/setting",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ classroomId: CLASS_ID, enabled: false }) }),
    );
  });

  it("explains the off state and turns it back on", async () => {
    fetchMock.mockReturnValue(respond(200, { enabled: true }));
    const onChange = vi.fn().mockResolvedValue(undefined);
    renderWithMessages(<PicturePasswordSetting classroomId={CLASS_ID} enabled={false} onChange={onChange} />);
    const box = screen.getByRole("checkbox", { name: "Picture password" });
    expect(box).not.toBeChecked();
    expect(screen.getByText(/class code and their name only/)).toBeInTheDocument();
    fireEvent.click(box);
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/student/picture-password/setting",
      expect.objectContaining({ body: JSON.stringify({ classroomId: CLASS_ID, enabled: true }) }),
    );
  });

  it("keeps the old value and announces a failed save", async () => {
    fetchMock.mockReturnValue(respond(403, { code: "forbidden" }));
    const onChange = vi.fn();
    renderWithMessages(<PicturePasswordSetting classroomId={CLASS_ID} enabled onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Picture password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You cannot manage this class.");
    expect(screen.getByRole("checkbox", { name: "Picture password" })).toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows Thai copy", () => {
    renderWithMessages(<PicturePasswordSetting classroomId={CLASS_ID} enabled onChange={vi.fn()} />, { locale: "th" });
    expect(screen.getByRole("checkbox", { name: "รหัสรูปภาพ" })).toBeInTheDocument();
  });
});
