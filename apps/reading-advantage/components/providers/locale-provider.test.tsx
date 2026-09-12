import { getMessages } from "next-intl/server";
import { LocaleProvider } from "./locale-provider";

jest.mock("next-intl", () => ({ NextIntlClientProvider: () => null }));
jest.mock("next-intl/server", () => ({ getMessages: jest.fn() }));

it.each([
  ["en", "Play"],
  ["th", "เล่น"],
])("supplies requested %s messages to client controls", async (locale, play) => {
  const messages = { game: { play } };
  jest.mocked(getMessages).mockResolvedValue(messages);
  const provider = await LocaleProvider({ locale, children: "Game" });
  expect(getMessages).toHaveBeenLastCalledWith({ locale });
  expect(provider.props.messages).toEqual(messages);
  expect(provider.props.locale).toBe(locale);
  expect(provider.props.timeZone).toBe("Asia/Bangkok");
  expect(provider.props.children).toBe("Game");
});
