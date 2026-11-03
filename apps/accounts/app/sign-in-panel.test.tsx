// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SignInPanel } from "./sign-in-panel";

const assign = vi.fn();
const fetchMock = vi.fn();

function submitCredentials() {
  fireEvent.change(screen.getByLabelText("Username"), { target: { value: "rep" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret" } });
  fireEvent.click(screen.getByRole("button", { name: /ENTER ACCOUNTS/ }));
}

describe("SignInPanel", () => {
  beforeEach(() => {
    assign.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("location", { ...window.location, assign });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("posts the credentials as the accounts client and follows the return path", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200 }));
    render(<SignInPanel returnTo="/api/oidc/authorize?state=xyz" />);

    submitCredentials();

    await waitFor(() => expect(assign).toHaveBeenCalledWith("/api/oidc/authorize?state=xyz"));
    expect(fetchMock).toHaveBeenCalledWith("/api/session/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "rep", password: "secret", clientId: "accounts" }),
    });
  });

  it("shows a verification error and stays on the page for a rejected sign-in", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 401 }));
    render(<SignInPanel returnTo="/" />);

    submitCredentials();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The sign-in details could not be verified. Please try again.",
    );
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /ENTER ACCOUNTS/ })).toBeEnabled();
  });

  it("shows a completion error when the request fails", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("network down"));
    render(<SignInPanel returnTo="/" />);

    submitCredentials();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The sign-in could not be completed. Please try again.",
    );
    expect(assign).not.toHaveBeenCalled();
  });

  it("disables the button while verification is in flight", async () => {
    let resolve: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((done) => { resolve = done; }));
    render(<SignInPanel returnTo="/" />);

    submitCredentials();

    expect(await screen.findByRole("button", { name: /VERIFYING/ })).toBeDisabled();
    resolve(new Response("{}", { status: 401 }));
    await waitFor(() => expect(screen.getByRole("button", { name: /ENTER ACCOUNTS/ })).toBeEnabled());
  });
});
