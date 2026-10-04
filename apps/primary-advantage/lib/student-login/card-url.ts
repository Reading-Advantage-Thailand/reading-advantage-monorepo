/**
 * Path of the QR card sign-in page. The card token goes in the URL fragment: browsers never send
 * the fragment to a server, so the token stays out of server logs and Referer headers.
 */
export const CARD_SIGN_IN_PATH = "/auth/card";

/**
 * Builds the sign-in URL that a QR login card encodes.
 * @param origin The site origin, for example `https://primary.reading-advantage.com`.
 * @param token The raw card token.
 * @returns The URL with the token in its fragment.
 */
export function cardSignInUrl(origin: string, token: string): string {
  return `${origin}${CARD_SIGN_IN_PATH}#${token}`;
}
