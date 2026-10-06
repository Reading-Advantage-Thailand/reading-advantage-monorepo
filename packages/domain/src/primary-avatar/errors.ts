/** The error codes of the avatar shop use-cases (track primary_avatar_shop_20261005). */
export type AvatarShopErrorCode = "NOT_IN_CATALOG" | "NOT_FOR_SALE" | "BAD_DYE" | "LEVEL_LOCKED" | "INSUFFICIENT_GP" | "ALREADY_OWNED" | "NOT_OWNED" | "WRONG_SLOT" | "TWO_HANDED" | "NO_AVATAR" | "NOT_IN_CLASS" | "RETRY";

/** A shop refusal with the HTTP status a route answers. */
export class AvatarShopError extends Error {
  constructor(
    public readonly code: AvatarShopErrorCode,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AvatarShopError";
  }
}
