import { disposeSymbol, type Disposable } from "../disposable/disposable.ts";
import { DisposableStack } from "../disposable/disposable_stack.ts";
import { AbortController, AbortSignal } from "./abort_controller.ts";
import { CallbackStack } from "./callback_stack.ts";
import type {
  AbortSignalLike,
  CancelFunc,
  CancellationHandler,
  Context,
  ContextController,
  ContextDataKey,
  ContextDataRef,
} from "./context.ts";
import {
  CancellationErrorImpl,
  DeadlineExceededErrorImpl,
  type CancellationError,
  type CancellationReason,
  type ContextError,
  type DeadlineExceededError,
} from "./errors.ts";

class ContextDataRefImpl implements ContextDataRef {
  constructor(
    public readonly key: ContextDataKey,
    public readonly value: unknown
  ) {}
}

/**
 * Private implementation of the ContextController interface.
 *
 * This object is the owner of a Context and is the only way the context can be
 * directly cancelled.
 */
class ContextControllerImpl implements ContextController {
  static #cancel(this: ContextImpl, reason: CancellationReason): void {
    if (this.isCancelled()) {
      return;
    }
    const err = new CancellationErrorImpl(reason);

    (Error as any).captureStackTrace?.(err, ContextControllerImpl.#cancel);

    ContextImpl.cancel(this, err);
  }

  readonly #boundCancel: CancelFunc;
  readonly #ctx: ContextImpl;

  constructor(ctx: ContextImpl) {
    this.#ctx = ctx;
    this.#boundCancel = ContextControllerImpl.#cancel.bind(this.#ctx);
  }

  get cancel(): CancelFunc {
    return this.#boundCancel;
  }

  get ctx(): Context {
    return this.#ctx;
  }

  get signal(): AbortSignal {
    return this.#ctx.signal;
  }

  [disposeSymbol](): void {
    this.ctx[disposeSymbol]();
  }

  asPromise(): Promise<never> {
    return this.#ctx.asPromise();
  }

  asResolvedPromise(): Promise<ContextError> {
    return this.#ctx.asResolvedPromise();
  }

  getDeadline(): number | undefined {
    return this.#ctx.getDeadline();
  }

  getCancellationError(): ContextError | undefined {
    return this.#ctx.getCancellationError();
  }

  getData(key: ContextDataKey): ContextDataRef | undefined {
    return this.#ctx.getData(key);
  }

  isCancelled(): boolean {
    return this.#ctx.isCancelled();
  }

  onDidCancel(handlerFn: CancellationHandler): Disposable {
    return this.#ctx.onDidCancel(handlerFn);
  }

  throwIfCancelled(): void {
    return this.#ctx.throwIfCancelled();
  }

  withAbortSignal(signal: AbortSignalLike): ContextController {
    return this.#ctx.withAbortSignal(signal);
  }

  withCancel(): ContextController {
    return this.#ctx.withCancel();
  }

  withData(key: ContextDataKey, value: unknown): ContextController {
    return this.#ctx.withData(key, value);
  }

  withDeadline(deadlineEpochMs: number): ContextController {
    return this.#ctx.withDeadline(deadlineEpochMs);
  }

  withTimeout(
    timeoutMs: number,
    message?: string | undefined
  ): ContextController {
    return this.#ctx.withTimeout(timeoutMs, message);
  }
}

/**
 * Private implementation of the Context interface.
 *
 * This is a read-only Context, suitable for passing to code that represents the
 * continuation of a larger sequence of steps.
 */
class ContextImpl implements Context {
  public static cancel(
    ctx: ContextImpl,
    err: CancellationError | DeadlineExceededError
  ) {
    if (!(ctx instanceof ContextImpl)) {
      throw new TypeError("Attempting to cancel an unknown Context reference");
    }

    if (ctx.#cancellationReason) {
      return;
    }

    ctx.#cancellationReason = err;
    ctx.#handlers?.fireEvent(err);
    ctx.#handlers = null;
  }

  readonly #parentCtx: ContextImpl | null;

  #signal: AbortSignal | null = null;

  #handlers: CallbackStack<CancellationHandler> | null = null;
  #disposer = new DisposableStack();

  #cancellationReason: CancellationError | DeadlineExceededError | undefined =
    undefined;
  #deadlineEpochMs: number | null = null;

  constructor(parentCtx: ContextImpl | null = null) {
    this.#parentCtx = parentCtx;

    if (parentCtx != null) {
      this.#deadlineEpochMs = parentCtx.#deadlineEpochMs;

      this.#disposer.use(
        this.onDidCancel(() => {
          this[disposeSymbol]();
        })
      );

      this.#disposer.use(
        parentCtx.onDidCancel((err) => ContextImpl.cancel(this, err))
      );
    }
  }

  protected __checkCancellationState():
    | CancellationError
    | DeadlineExceededError
    | undefined {
    return undefined;
  }

  get signal() {
    // If we have already created a signal, use it.
    if (this.#signal) {
      return this.#signal;
    }

    // Is this context already cancelled? If so, create a pre-cancelled signal
    // then cache and return it.
    const reason = this.getCancellationError();
    if (reason) {
      const ac = new AbortController();
      ac.abort(reason);
      this.#signal = ac.signal;
      this.#disposer.defer(() => {
        this.#signal = null;
      });

      return this.#signal;
    }

    if (!this.#signal) {
      const ac = new AbortController();
      this.#signal = ac.signal;
      this.#disposer.defer(() => {
        this.#signal = null;
      });

      this.onDidCancel((reason) => {
        ac.abort(reason);
      });
    }

    return this.#signal;
  }

  [disposeSymbol]() {
    // TODO: Make it an invariant violation to use this after it is disposed.
    this.#disposer[disposeSymbol]();
    this.#handlers = null;
    this.#signal = null;
  }

  asPromise(): Promise<never> {
    return new Promise((_, reject) => this.onDidCancel((err) => reject(err)));
  }

  asResolvedPromise(): Promise<ContextError> {
    const eventLoopHandle = setTimeout(() => undefined, Math.pow(2, 31) - 1);

    return new Promise((resolve) =>
      this.onDidCancel((err) => {
        clearTimeout(eventLoopHandle);
        resolve(err);
      })
    );
  }

  getDeadline() {
    return this.#deadlineEpochMs ?? undefined;
  }

  getData(key: ContextDataKey): ContextDataRef | undefined {
    return this.#parentCtx?.getData(key);
  }

  getCancellationError(): ContextError | undefined {
    if (this.#cancellationReason) {
      return this.#cancellationReason;
    }

    const reason =
      this.__checkCancellationState() ??
      this.#parentCtx?.__checkCancellationState();

    // We've transitioned to the cancelled state. Gotta fire events.
    if (reason) {
      ContextImpl.cancel(this, reason);
    }

    return this.#cancellationReason;
  }

  isCancelled(): boolean {
    return this.getCancellationError() !== undefined;
  }

  onDidCancel(handlerFn: CancellationHandler): Disposable {
    if (!this.#handlers) {
      this.#handlers = new CallbackStack();
      this.#disposer.use(this.#handlers);
    }

    return this.#handlers.push(handlerFn);
  }

  throwIfCancelled(): void {
    const err = this.getCancellationError();

    if (err) {
      throw err;
    }
  }

  withAbortSignal(signal: AbortSignalLike): ContextController {
    const ref = this.withCancel();
    const onAbort = () => {
      ref.cancel(signal.reason!);
      disposable[disposeSymbol];
    };
    const disposable = ref.ctx.onDidCancel(() => {
      signal.removeEventListener("abort", onAbort);
    });

    signal.addEventListener("abort", onAbort);

    return ref;
  }

  withCancel(): ContextController {
    return new ContextControllerImpl(new ContextImpl(this));
  }

  withData(key: ContextDataKey, value: unknown): ContextController {
    return new ContextControllerImpl(new ContextWithDataImpl(this, key, value));
  }

  withTimeout(timeoutMs: number, message?: string): ContextController {
    const now = Date.now();
    const deadlineEpochMs = now + timeoutMs;

    return this.withDeadline(deadlineEpochMs, message);
  }

  withDeadline(deadlineEpochMs: number, message?: string): ContextController {
    if (deadlineEpochMs <= Date.now()) {
      const stackTraceLimit = (Error as any).stackTraceLimit;
      (Error as any).stackTraceLimit = 0;
      const err = new DeadlineExceededErrorImpl(message);
      (Error as any).stackTraceLimit = stackTraceLimit;

      // The deadline has already passed; create a cancelled context.
      const ctx = new CancelledContextImpl(this, err);

      return new ContextControllerImpl(ctx);
    }

    if (this.#deadlineEpochMs && this.#deadlineEpochMs < deadlineEpochMs) {
      // Because this doesn't narrow the deadline to an earlier timestamp,
      // there's no reason to use the deadline subclass.
      const ctx = new ContextImpl(this);

      return new ContextControllerImpl(ctx);
    }

    const ctx = new ContextWithDeadlineImpl(this, deadlineEpochMs, message);

    return new ContextControllerImpl(ctx);
  }
}

class ContextWithDeadlineImpl extends ContextImpl {
  readonly #deadlineEpochMs: number;
  readonly #timeoutHandle: ReturnType<typeof setTimeout>;

  constructor(
    parentCtx: ContextImpl,
    deadlineEpochMs: number,
    message?: string
  ) {
    super(parentCtx);

    this.#deadlineEpochMs = deadlineEpochMs;
    this.#timeoutHandle = setTimeout(() => {
      ContextImpl.cancel(this, new DeadlineExceededErrorImpl(message));
    }, this.#deadlineEpochMs - Date.now());

    this.onDidCancel(() => {
      clearTimeout(this.#timeoutHandle);
    });

    // We never want a timer handle in node to prevent the event loop from
    // draining.
    (this.#timeoutHandle as any).unref?.();
  }

  [disposeSymbol]() {
    clearTimeout(this.#timeoutHandle);
    return super[disposeSymbol]();
  }

  protected __checkCancellationState():
    | CancellationError
    | DeadlineExceededError
    | undefined {
    const now = Date.now();

    if (this.#deadlineEpochMs <= now) {
      return new DeadlineExceededErrorImpl();
    }
  }
}

class ContextWithDataImpl extends ContextImpl {
  readonly #dataKey: ContextDataKey;
  readonly #dataValue: unknown;

  constructor(parentCtx: ContextImpl, key: ContextDataKey, value: unknown) {
    super(parentCtx);

    this.#dataKey = key;
    this.#dataValue = value;
  }

  getData(key: ContextDataKey): ContextDataRef | undefined {
    if (key === this.#dataKey) {
      return new ContextDataRefImpl(this.#dataKey, this.#dataValue);
    }

    return super.getData(key);
  }
}

class CancelledContextImpl extends ContextImpl {
  readonly #cancellationError: CancellationError | DeadlineExceededError;

  constructor(
    parentCtx: ContextImpl,
    err: CancellationError | DeadlineExceededError
  ) {
    super(parentCtx);

    this.#cancellationError = err;
  }

  getCancellationError() {
    return this.#cancellationError;
  }
}

/**
 * Create a new root Context.
 *
 * Creating new root Context makes sense when you want to decouple the lifetime
 * of the Context from the lifetime of the application. For example, in an http
 * server, you might create a new root Context for each request. The http server
 * itself might stop accepting new requests, but the in-flight request Contexts
 * can continue to be used.
 *
 * A root Context such as this can never be cancelled. However, if these objects
 * are being created in a long-lived application, it is important to ensure that
 * they are disposed using the `[Symbol.dispose]()` method or using the `using`
 * keyword.
 *
 * @returns {Context}
 */
export function createRootContext(): Context {
  return new ContextImpl(null);
}
