import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { LoginForm } from "./LoginForm";

jest.mock("next/navigation", () => ({ useRouter: jest.fn() }));

describe("LoginForm", () => {
  const replace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace, refresh: jest.fn() });
    global.fetch = jest.fn();
  });

  it("provides labelled username/password controls and password-manager hints", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText("Username")).toHaveAttribute(
      "autocomplete",
      "username",
    );
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("submits credentials and redirects to the student arcade", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<LoginForm redirectTo="/th/student/arcade/astral-mage" />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "  Student.One  " },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "Student.One", password: "secret" }),
      });
    });
    expect(replace).toHaveBeenCalledWith(
      "/th/student/arcade/astral-mage",
    );
  });

  it("announces shared authentication errors and restores the submit control", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Invalid username or password" }),
    });
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "student" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid username or password",
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(replace).not.toHaveBeenCalled();
  });
});
