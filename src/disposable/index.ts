/**
 * # @ggoodman/std/disposable
 *
 * Produce and consume `Disposable` and `AsyncDisposable` resources.
 *
 * ## Example
 *
 * ```ts
 * import { AsyncDisposableStack } from "@ggoodman/ctx/disposable";
 *
 * async function doSomeWork() {
 *   // Register an AsyncDisposable to be disposed when the function completes.
 *   await using disposer = new AsyncDisposableStack();
 *
 *   // This resource will be cleaned up by the disposable stack.
 *   const resource = createResource();
 *   disposer.use(disposer);
 * }
 * ```
 * @module
 */

export { disposeAsyncSymbol, disposeSymbol } from "./disposable.ts";
export type { AsyncDisposable, Disposable } from "./disposable.ts";

export { AsyncDisposableStack, DisposableStack } from "./disposable_stack.ts";

export { SuppressedError, isSuppressedError } from "./errors.ts";
