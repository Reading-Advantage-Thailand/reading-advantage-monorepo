/**
 * Creates the provider-neutral storage fixture interface.
 * @returns Stable provider-neutral fixture client.
 */
export function createStorageClient() {
  return { kind: "storage-port" } as const;
}
