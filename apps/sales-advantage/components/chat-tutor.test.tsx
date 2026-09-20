import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import enMessages from "../messages/en.json";
import thMessages from "../messages/th.json";
import { ChatTutor } from "./chat-tutor";

type ChatCopy = typeof enMessages.chat;

const localeCopies: Array<{ locale: string; copy: ChatCopy }> = [
  { locale: "English", copy: enMessages.chat },
  { locale: "Thai", copy: thMessages.chat },
];

let activeChatCopy: ChatCopy = enMessages.chat;
let activeLocale = "en";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: keyof ChatCopy) => activeChatCopy[key],
  useLocale: () => activeLocale,
}));

describe("ChatTutor accessibility", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it.each(localeCopies)(
    "uses the $locale send label and state",
    ({ copy }) => {
      activeChatCopy = copy;
      render(<ChatTutor />);

      const button = screen.getByRole("button", { name: copy.send });
      const input = screen.getByPlaceholderText(copy.placeholder);

      expect((button as HTMLButtonElement).disabled).toBe(true);

      fireEvent.change(input, { target: { value: "How should I open?" } });

      expect((button as HTMLButtonElement).disabled).toBe(false);
    },
  );

  it("submits the enabled button to the chat API", async () => {
    activeChatCopy = thMessages.chat;
    activeLocale = "th";
    let resolveFetch!: (response: Response) => void;
    const pendingFetch = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValue(pendingFetch);

    render(<ChatTutor />);
    const input = screen.getByPlaceholderText(activeChatCopy.placeholder);
    const button = screen.getByRole("button", { name: activeChatCopy.send });

    fireEvent.change(input, { target: { value: "How should I open?" } });
    expect((button as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(button);

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/chat",
          expect.objectContaining({ method: "POST" }),
        );
      },
      { timeout: 1000 },
    );
    const requestInit = fetchMock.mock.calls[0][1] as { body: string };
    expect(JSON.parse(requestInit.body)).toMatchObject({ locale: "th" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect((input as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch({ ok: false, body: null } as Response);

    await waitFor(
      () => expect((input as HTMLInputElement).disabled).toBe(false),
      { timeout: 1000 },
    );
  });

  it("aborts the chat request when the component unmounts", async () => {
    activeChatCopy = enMessages.chat;
    let abortSignal: AbortSignal | null | undefined;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation((_input, init) => {
        abortSignal = init?.signal;
        return new Promise<Response>(() => {});
      });

    const { unmount } = render(<ChatTutor />);
    const input = screen.getByPlaceholderText(activeChatCopy.placeholder);

    fireEvent.change(input, { target: { value: "How should I open?" } });
    fireEvent.click(screen.getByRole("button", { name: activeChatCopy.send }));

    await waitFor(
      () => {
        expect(fetchMock).toHaveBeenCalledWith(
          "/api/chat",
          expect.objectContaining({ method: "POST" }),
        );
      },
      { timeout: 1000 },
    );

    expect(abortSignal).toBeDefined();
    expect(abortSignal?.aborted).toBe(false);

    unmount();

    expect(abortSignal?.aborted).toBe(true);
  });
});
