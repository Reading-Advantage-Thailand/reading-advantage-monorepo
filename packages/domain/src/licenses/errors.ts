export class LicenseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LicenseError";
  }
}

export class LicenseNotFoundError extends LicenseError {
  constructor(id: string) {
    super(`License not found: ${id}`);
    this.name = "LicenseNotFoundError";
  }
}
