export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export class UserNotFoundError extends UserError {
  constructor(id: string) {
    super(`User not found: ${id}`);
    this.name = "UserNotFoundError";
  }
}
