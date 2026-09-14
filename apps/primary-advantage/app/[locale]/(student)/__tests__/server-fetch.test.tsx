// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";

import enMessages from "../../../../messages/en.json";

// The pages under test fetch on the server and hand props to these client
// components. The client components must render that data without refetching
// on mount, so every test spies on global fetch and asserts zero calls.
const fetchSpy = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
}));

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({ user: null, refresh: vi.fn() }),
  useSession: () => ({ user: null }),
}));

import SchoolProfileSettings from "@/components/school/school-profile-settings";
import EnrollmentClient from "@/components/teacher/enrollment-client";
import { adaptClassroomPayload } from "@/components/teacher/enrollment-classroom";
import type { SchoolProfile } from "@/server/models/schoolModel";
import type { ClassroomPayload } from "@/components/teacher/enrollment-classroom";

/**
 * Wraps a client element in the real next-intl provider with en.json.
 * @param ui The element to wrap.
 * @returns The provider-wrapped element.
 */
function withIntl(ui: ReactElement): ReactElement {
  return (
    <NextIntlClientProvider
      locale="en"
      messages={
        enMessages as unknown as React.ComponentProps<
          typeof NextIntlClientProvider
        >["messages"]
      }
    >
      {ui}
    </NextIntlClientProvider>
  );
}

/**
 * Renders a component and asserts that mounting issued no fetch calls.
 * @param ui The element to render.
 * @returns The rendered result.
 */
function renderWithoutFetch(ui: ReactNode): void {
  fetchSpy.mockClear();
  vi.stubGlobal("fetch", fetchSpy);
  render(withIntl(<>{ui}</>));
  expect(fetchSpy).not.toHaveBeenCalled();
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("school profile settings with server-fetched props", () => {
  const school: SchoolProfile = {
    id: "school-1",
    name: "Riverbend Primary",
    contactName: "Ada Lovelace",
    contactEmail: "ada@riverbend.example",
    createdAt: new Date("2025-01-05T00:00:00.000Z"),
    updatedAt: new Date("2025-06-01T00:00:00.000Z"),
    ownerId: "owner-1",
    _count: { users: 12, admins: 2 },
    admins: [],
    owner: {
      id: "owner-1",
      name: "Grace Hopper",
      email: "grace@riverbend.example",
    },
  };

  it("renders the server-fetched school without a mount fetch", () => {
    renderWithoutFetch(<SchoolProfileSettings initialSchool={school} />);

    expect(screen.getByText("Riverbend Primary")).toBeInTheDocument();
    expect(screen.getByText("ada@riverbend.example")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText(/12 users/)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders the create prompt when the server found no school", () => {
    renderWithoutFetch(<SchoolProfileSettings initialSchool={null} />);

    const copy = enMessages.Settings.schoolProfile.createSchoolcard;
    expect(screen.getByText(copy.title)).toBeInTheDocument();
    expect(screen.getByText(copy.description)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("classroom enrollment with server-fetched props", () => {
  const payload: ClassroomPayload = {
    classroom: {
      id: "class-1",
      classroomName: "Comet Class",
      classCode: "AB12CD",
      grade: 3,
      teacherId: "teacher-1",
    },
    studentInClass: [
      {
        id: "student-1",
        display_name: "Sam Student",
        email: "sam@example.com",
        level: 1,
        xp: 10,
        cefrLevel: "A0-",
      },
    ],
  };

  it("renders the server-fetched classroom and roster without a mount fetch", () => {
    renderWithoutFetch(
      <EnrollmentClient
        classroomId="class-1"
        initialClassroom={adaptClassroomPayload(payload)}
      />,
    );

    // EnrollmentClient and EnrollmentManagement both show the title; the
    // page-level h1 proves the client received its server-fetched props.
    expect(
      screen.getByRole("heading", {
        name: enMessages.Teacher.Enrollment.header.title,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Comet Class")).toBeInTheDocument();
    expect(screen.getByText("Sam Student")).toBeInTheDocument();
    expect(screen.getByText("sam@example.com")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
