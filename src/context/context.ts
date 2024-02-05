import type { Disposable } from "../disposable/disposable.js";
import type { AbortSignal } from "./abort_controller.js";
import type { CancellationReason, ContextError } from "./errors.js";

type AnyFunc = (...args: any[]) => any;

export type ContextDataKey = {};

export interface CancelFunc {
  (reason: CancellationReason): void;
}

export interface ContextDataRef {
  key: ContextDataKey;
  value: unknown;
}

export interface CancellationHandler {
  (reason: ContextError): void;
}

/**
 * A controller akin to the `AbortController` that holds a child `Context` and
 * its cancellation function.
 */
export interface ContextController extends Context {
  /** The child `Context` suitable to passing down to lower layers of processing. */
  readonly ctx: Context;

  /** A cancellation function to cancel the attached child `Context`. */
  readonly cancel: CancelFunc;
}

export interface DisposalErrorHandler {
  (err: unknown): void;
}

export interface Context extends Disposable {
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

  /** Throw the cancellation reason as an exception if the Context is aborted. */
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
