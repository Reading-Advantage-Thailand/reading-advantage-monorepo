/**
 * Wraps one cartridge completion callback with a fire-once latch.
 * @param complete Host callback that must receive at most one result.
 * @returns A function that reports whether this call delivered the result.
 */
export function createCompletionLatch<T>(
  complete: (result: T) => void,
): (result: T) => boolean {
  let delivered = false;
  return (result) => {
    if (delivered) return false;
    delivered = true;
    complete(result);
    return true;
  };
}
