export const disposeSymbol: typeof Symbol.dispose = ((Symbol as any)[
  "dispose"
] ??= Symbol.for("Symbol.dispose"));
export const disposeAsyncSymbol: typeof Symbol.asyncDispose = ((Symbol as any)[
  "asyncDispose"
] ??= Symbol.for("Symbol.asyncDispose"));

/**
 * A `Disposable` resource can be cleaned up synchronously.
 *
 * It is a future proposal for JavaScript described in the [Explicit Resource Management proposal](https://github.com/tc39/proposal-explicit-resource-management).
 *
 * @see {@link https://github.com/tc39/proposal-explicit-resource-management?tab=readme-ov-file#the-disposable-interface}
 */
export interface Disposable {
  [disposeSymbol](): void;
}

/**
 * An `AsyncDisposable` resource can be cleaned up asynchronously.
 *
 * It is a future proposal for JavaScript described in the [Explicit Resource Management proposal](https://github.com/tc39/proposal-explicit-resource-management).
 *
 * @see {@link https://github.com/tc39/proposal-explicit-resource-management?tab=readme-ov-file#the-asyncdisposable-interface}
 */
export interface AsyncDisposable {
  [disposeAsyncSymbol](): Promise<void>;
}
