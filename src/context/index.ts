/**
 * # @ggoodman/std/context
 *
 * Propagate cancellation and timeouts through application layers.
 *
 * ## Example
 *
 * ```ts
 * import { createRootContextController } from "@ggoodman/std/context";
 *
 * const rootCtl = createRootContextController();
 *
 * // Cancel the root Context when the process receives the SIGINT signal.
 * process.on("SIGINT", () => rootCtl.cancel());
 *
 * // Pass the immutable child Context onto another operation. The operation
 * // can create child Contexts with their own deadlines or data to pass
 * // further down the call graph.
 * await performLongRunningOperation(rootCtl.ctx);
 * ```
 * @module
 */

export {
  isCancellationError,
  isDeadlineExceededError,
  type CancellationError,
  type CancellationReason,
  type ContextError,
  type DeadlineExceededError,
} from "./errors.ts";

export type {
  AbortSignalLike,
  CancelFunc,
  CancellationHandler,
  Context,
  ContextController,
  ContextDataKey,
} from "./context.ts";

export { createRootContext } from "./context_impl.ts";
