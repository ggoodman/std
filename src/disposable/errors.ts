const SuppressedErrorImpl: SuppressedErrorConstructor =
  (globalThis as any)["SuppressedError"] ??
  class SuppressedErrorImpl extends Error implements SuppressedError {
    public readonly name = "SuppressedError";

    /**
     * Wraps an error that suppresses another error, and the error that was suppressed.
     */
    constructor(
      public readonly error: unknown,
      public readonly suppressed: unknown,
      message?: string
    ) {
      super(
        message ?? `Suppressed error: ${error} (suppressed: ${suppressed})`
      );
    }
  };

export { SuppressedErrorImpl as SuppressedError };

export function isSuppressedError(obj?: unknown): obj is SuppressedError {
  return obj != null && obj instanceof SuppressedError;
}
