import { render, screen } from "@testing-library/react";
import LoginPage, { resolveStudentRedirect } from "./page";

jest.mock("@/features/auth/LoginForm", () => ({
  LoginForm: ({ redirectTo }: { redirectTo: string }) => (
    <form aria-label="Student sign in" data-redirect={redirectTo} />
  ),
}));

describe("login page", () => {
  it("identifies Advantage Games and withholds former arcade redirects", async () => {
    render(await LoginPage({
      searchParams: Promise.resolve({
        redirect: "/th/student/arcade/astral-mage",
      }),
    }));

    expect(
      screen.getByRole("heading", { name: "Advantage Games" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Student sign in" })).toHaveAttribute(
      "data-redirect",
      "/",
    );
  });

  it.each([
    "https://evil.example/steal",
    "//evil.example/steal",
    "/en/student/arcade/not-a-cartridge",
    "/admin",
  ])("rejects an unsafe redirect %s", (value) => {
    expect(resolveStudentRedirect(value)).toBe("/");
  });
});
