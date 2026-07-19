// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "@/settings/page";

vi.mock("@reading-advantage/auth-client", () => ({
  useAuth: () => ({
    user: { role: "ADMIN" },
    isAuthenticated: true,
    isForbidden: false,
    isLoading: false,
  }),
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("Marketing settings secret preservation", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return jsonResponse({ success: true });
      }
      return jsonResponse({
        "llm.provider": "google",
        "llm.model": "gemini-pro",
        "llm.apiKey": "••••",
        "tools.mmxPath": "/usr/local/bin/mmx",
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("alert", vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("omits the masked apiKey when saving an unrelated setting", async () => {
    render(<SettingsPage />);

    const modelInput = await screen.findByDisplayValue("gemini-pro");
    fireEvent.change(modelInput, { target: { value: "gemini-2.5-flash" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const [, request] = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(request.body as string) as Record<string, string>;
    expect(body["llm.model"]).toBe("gemini-2.5-flash");
    expect(body).not.toHaveProperty("llm.apiKey");
  });

  it("includes a validated explicit apiKey replacement", async () => {
    render(<SettingsPage />);

    const apiKeyInput = await screen.findByDisplayValue("••••");
    fireEvent.change(apiKeyInput, { target: { value: "sk-replacement-123" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const [, request] = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(request.body as string) as Record<string, string>;
    expect(body["llm.apiKey"]).toBe("sk-replacement-123");
  });

  it("blocks Test Connection while the apiKey is masked and posts only an explicit replacement", async () => {
    render(<SettingsPage />);

    const apiKeyInput = await screen.findByDisplayValue("••••");
    const testButton = screen.getByRole("button", {
      name: "Test Connection",
    });

    expect(testButton).toBeDisabled();
    expect(
      screen.getByText("Enter a new API key to test the connection."),
    ).toBeInTheDocument();
    fireEvent.click(testButton);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fireEvent.change(apiKeyInput, {
      target: { value: "sk-test-connection-replacement" },
    });
    expect(testButton).not.toBeDisabled();
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const [url, request] = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(request.body as string) as Record<string, string>;
    expect(url).toBe("/api/settings/test-connection");
    expect(body["apiKey"]).toBe("sk-test-connection-replacement");
  });

  it("selects the validated OpenRouter routing model and posts the complete connection payload", async () => {
    render(<SettingsPage />);

    await screen.findByDisplayValue("••••");
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "openrouter" },
    });
    expect(
      screen.getByDisplayValue("nvidia/nemotron-3-ultra-550b-a55b:free"),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("••••"), {
      target: { value: "openrouter-test-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Test Connection" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    const [url, request] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("/api/settings/test-connection");
    expect(JSON.parse(request.body as string)).toEqual({
      provider: "openrouter",
      modelName: "nvidia/nemotron-3-ultra-550b-a55b:free",
      apiKey: "openrouter-test-secret",
    });
  });
});
