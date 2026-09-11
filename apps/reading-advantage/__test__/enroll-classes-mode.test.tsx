/**
 * FR-4 behavioral test: the merged enroll component calls the correct
 * endpoint for each mode ("enroll" | "unenroll") and toggles the row
 * selection instead of passing the handler as a no-op.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MyEnrollClasses from "@/components/teacher/enroll-classes";

let mockSelectValue: (value: string) => void = () => {};

jest.mock("@/locales/client", () => ({
  useScopedI18n: () => (key: string) => key,
}));

jest.mock("next/navigation", () => ({
  useParams: () => ({ studentId: "student-1" }),
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));

jest.mock("@/components/ui/radio-group", () => ({
  RadioGroup: (props: {
    children: React.ReactNode;
    onValueChange: (value: string) => void;
  }) => {
    mockSelectValue = props.onValueChange;
    return <>{props.children}</>;
  },
  RadioGroupItem: ({ value }: { value: string }) => (
    <button data-testid={`radio-${value}`} onClick={() => mockSelectValue(value)} />
  ),
}));

jest.mock("@/components/ui/use-toast", () => ({
  toast: jest.fn(),
}));

const CLASSROOMS = [
  {
    id: "class-1",
    classroomName: "Class One",
    classCode: "C1",
    grade: "1",
    coTeacher: { coTeacherId: "t1", name: "Teacher" },
    archived: false,
    teacherId: "teacher-1",
  },
];

function mockFetchSequence(mode: "enroll" | "unenroll") {
  const fetchMock = jest.fn().mockImplementation((url: string) => {
    if (url.includes(`/api/v1/classroom/students/${mode}?studentId=student-1`)) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            classroom: CLASSROOMS,
            student: { id: "student-1", display_name: "Student One" },
          }),
      });
    }
    if (url.includes(`/api/v1/classroom/class-1/${mode}`)) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    }
    return Promise.reject(new Error(`Unexpected fetch: ${url}`));
  });
  (globalThis.fetch as jest.Mock) = fetchMock;
  return fetchMock;
}

async function renderAndSelect(mode: "enroll" | "unenroll") {
  const fetchMock = mockFetchSequence(mode);
  const user = userEvent.setup();
  render(<MyEnrollClasses mode={mode} />);

  const radio = await screen.findByTestId("radio-class-1");
  await user.click(radio);
  return { fetchMock, user };
}

describe("MyEnrollClasses mode endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("enroll mode PATCHes the enroll endpoint", async () => {
    const { fetchMock, user } = await renderAndSelect("enroll");

    const submit = screen.getByRole("button", { name: "add" });
    await user.click(submit);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/classroom/class-1/enroll",
        expect.objectContaining({ method: "PATCH" })
      )
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/unenroll"),
      expect.anything()
    );
  });

  it("unenroll mode PATCHes the unenroll endpoint", async () => {
    const { fetchMock, user } = await renderAndSelect("unenroll");

    const submit = screen.getByRole("button", { name: "remove" });
    await user.click(submit);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/classroom/class-1/unenroll",
        expect.objectContaining({ method: "PATCH" })
      )
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/enroll"),
      expect.anything()
    );
  });
});
