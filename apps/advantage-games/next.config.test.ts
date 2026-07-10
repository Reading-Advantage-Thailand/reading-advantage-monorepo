import nextConfig from "./next.config";

describe("Advantage Games dynamic host configuration", () => {
  it("builds a request-time standalone app instead of a static export", () => {
    expect(nextConfig.output).toBe("standalone");
    expect(nextConfig.output).not.toBe("export");
    expect(nextConfig.trailingSlash).not.toBe(true);
  });

  it("transpiles the shared server auth boundaries", () => {
    expect(nextConfig.transpilePackages).toEqual(
      expect.arrayContaining([
        "@reading-advantage/api",
        "@reading-advantage/auth",
        "@reading-advantage/db",
      ]),
    );
    expect(nextConfig.serverExternalPackages).toContain("@node-rs/argon2");
  });
});
