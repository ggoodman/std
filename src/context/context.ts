import type { Disposable } from "../disposable/disposable.ts";
import type { AbortSignal } from "./abort_controller.ts";
import type { CancellationReason, ContextError } from "./errors.ts";

type AnyFunc = (...args: any[]) => any;

/**
 * A key used to store data in a `Context`.
 */
export type ContextDataKey = {};

/**
 * A function that cancels a Context with a reason.
 */
export interface CancelFunc {
  /**
   * Cancel the Context with a reason.
   */
  (reason: CancellationReason): void;
}

/**
 * A reference to stored context data.
 */
export interface ContextDataRef {
  key: ContextDataKey;
  value: unknown;
}

/**
 * A function that handles the cancellation of a Context.
 */
export interface CancellationHandler {
  (reason: ContextError): void;
}

/**
 * A controller akin to the `AbortController` that holds a child `Context` and
 * its cancellation function.
 *
 * This is useful for creating a child `Context` that can be cancelled. The
 * child `.ctx` should be passed to lower layers of processing, while the
 * `.cancel` function can be used to cancel the child `Context`.
 *
 * You can think of the `ContextController` as a mutable reference to the
 * `Context` and its cancellation function. A `Context`, on the other hand, is
 * an immutable reference to a chain of cancellation signals and deadlines.
 */
export interface ContextController extends Context {
  /** The child `Context` suitable to passing down to lower layers of
   * processing. */
  readonly ctx: Context;

  /** A cancellation function to cancel the attached child `Context`. */
  readonly cancel: CancelFunc;
}

/**
 * A `Context` is a handle to a chain of cancellation signals and deadlines.
 *
 * It is used to propagate cancellation and deadlines through application
 * layers. Whenever you create a `Context`, you can create child `Context`s that
 * inherit the cancellation signals and deadlines from their parent. This allows
 * you to create a tree of `Context`s that can be cancelled as a whole.
 *
 * A `Context` is also a `Disposable` resource, so it can be used in a `using`
 * statement or explicitly disposed through the `[Symbol.dispose]()` method.
 */
export interface Context extends Disposable {
  /**
   * The `AbortSignal` that will be aborted when the Context is cancelled.
   *
   * This can be useful for inter-operating with other libraries that use
   * `AbortSignal` for cancellation.
   */
  readonly signal: AbortSignal;

  /**
   * Get a Promise that will reject with the cancellation error when the Context
   * is cancelled.
   */
  asPromise(): Promise<never>;

  /**
   * Get a Promise that will resolve with the cancellation error when the
   * Context is cancelled.
   */
  asResolvedPromise(): Promise<ContextError>;

  /** Return the cancellation reason, if the Context is cancelled. */
  getCancellationError(): ContextError | undefined;

  /**
   * Get the unix epoch of this Context's deadline (if any).
   *
   * If the current Context has no deadline, the return value will be
   * `undefined`.
   */
  getDeadline(): number | undefined;

  /**
   * Get a record pointing to stored context data, if one is found in the
   * Context chain.
   *
   * @param key The key under which the data was previously stored
   * @internal
   */
  getData(key: ContextDataKey): ContextDataRef | undefined;

  /** Return a boolean indicating whether the Context is cancelled or not. */
  isCancelled(): boolean;

  /**
   * Register a callback function to be called when the Context is cancelled in
   * LIFO order.
   *
   * @param handlerFn A handler function that will be called when the Context is
   *   cancelled with the cancellation reason.
   */
  onDidCancel(handlerFn: CancellationHandler): Disposable;

  /** Throw the cancellation reason as an exception if the Context is aborted.
   * */
  throwIfCancelled(): void;

  /**
   * @param key
   * @param value
   * @internal
   */
  withData(key: ContextDataKey, value: unknown): ContextController;

  /**
   * Create a child `ContextController` that can be used to cancel it's context.
   *
   * The child `Context` can be cancelled using the `ContextController`'s
   * `.cancel()` method.
   *
   * @example
   *   import { finished } from "node:stream";
   *   import { createServer } from "node:http";
   *
   *   const server = createServer((req, res) => {
   *     // `programCtx` is tied to the whole program's lifecycle.
   *     const ctl = programCtx.withCancel();
   *
   *     // Cancel the context when the response is finished.
   *     finished(res, (err) => {
   *       ctl.cancel(err ?? "finished request");
   *     });
   *
   *     handleRequest(ctl.ctx, req, res).catch((err) => {
   *       respondWithError(res, err);
   *     });
   *   });
   */
  withCancel(): ContextController;

  /**
   * Create a child `ContextController` having a deadline represented by an
   * absolute timestamp.
   *
   * The child `Context` will be cancelled with a `DeadlineExceeded` error when
   * it times out. The child Context can be cancelled using the
   * `ContextController`'s `.cancel()` method.
   *
   * @param deadlineEpochMs The timestamp at which to cancel the child context
   *   (in milleseconds since the unix epoc).
   */
  withDeadline(deadlineEpochMs: number): ContextController;

  /**
   * Create a child `ContextController` that will be cancelled in a certain
   * number of millseconds.
   *
   * The child `Context` will be cancelled with a `DeadlineExceeded` error when
   * it times out. The child Context can also be cancelled using the
   * `ContextController`'s `.cancel()` method.
   *
   * @param timeoutMs The number of milliseconds after which the child `Context`
   *   will be automatically cancelled..
   */
  withTimeout(timeoutMs: number, message?: string): ContextController;

  /**
   * Create a `ContextController` from an `AbortSignal`.
   *
   * The child `Context` will be cancelled with a `CancellationError` when the
   * `AbortSignal` aborts. The child Context can also be cancelled using the
   * `ContextController`'s `.cancel()` method.
   *
   * @param signal An `AbortSignal` from which to create a `ContextController`.
   */
  withAbortSignal(signal: AbortSignalLike): ContextController;
}

/**
 * The minimum surface area of the global AbortSignal needed by this library.
 */
export interface AbortSignalLike {
  readonly reason: unknown;

  addEventListener(eventName: "abort", listener: AnyFunc): void;
  removeEventListener(eventName: "abort", listener: AnyFunc): void;
}
