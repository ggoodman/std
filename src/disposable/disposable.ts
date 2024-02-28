/**
 * A symbol that represents the dispose method for an `Disposable` resource.
 *
 * It is exported as a named variable that can be used to implement the `Disposable` interface without relying on `Symbol.dispose` being set in the environment.
 */
export const disposeSymbol: typeof Symbol.dispose = ((Symbol as any)[
  "dispose"
] ??= Symbol.for("Symbol.dispose"));

/**
 * A symbol that represents the dispose method for an `AsyncDisposable` resource.
 *
 * It is exported as a named variable that can be used to implement the `AsyncDisposable` interface without relying on `Symbol.asyncDispose` being set in the environment.
 */
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
