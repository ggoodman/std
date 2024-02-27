import {
  disposeAsyncSymbol,
  disposeSymbol,
  type AsyncDisposable,
  type Disposable,
} from "./disposable.ts";
import { SuppressedError } from "./errors.ts";

/**
 * A stack of resources that can be disposed of asynchronously in reverse order of their addition.
 *
 * Resources can be added to the stack using the `use`, `adopt`, and `defer` methods.
 *
 * @see {@link https://github.com/tc39/proposal-explicit-resource-management?tab=readme-ov-file#the-disposablestack-and-asyncdisposablestack-container-objects}
 */
export class AsyncDisposableStack {
  #disposed = false;
  readonly #stack: Array<AsyncDisposable | Disposable> = [];

  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Adds a value and associated disposal callback as a resource to the stack.
   *
   * @param value The value to add.
   * @param onDisposeAsync The callback to use in place of a
   *   `[Symbol.asyncDispose]()` method. Will be invoked with `value` as the
   *   first parameter.
   * @returns The provided {@link value}.
   */
  adopt<T>(
    value: T,
    onDisposeAsync: (value: T) => PromiseLike<void> | void
  ): T {
    if (typeof onDisposeAsync !== "function") {
      throw new TypeError("The onDispose argument must be a function");
    }

    const disposable = new AsyncValueDisposer(value, onDisposeAsync);

    this.#stack.push(disposable);

    return value;
  }

  /** Adds a disposal callback to the top of the stack. */
  defer(onDispose: () => void | PromiseLike<void>): void {
    if (typeof onDispose !== "function") {
      throw new TypeError("The onDispose argument must be a function");
    }

    const disposable = new DeferredAsyncFunction(onDispose);

    this.#stack.push(disposable);
  }

  /**
   * Disposes each resource in the stack in the reverse order that they were
   * added.
   */
  disposeAsync(): Promise<void> {
    return this[disposeAsyncSymbol]();
  }

  /** Disposes of resources within this object. */
  async [disposeAsyncSymbol](): Promise<void> {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;

    let hasError = false;
    let topError: unknown = undefined;

    while (this.#stack.length) {
      const disposable = this.#stack.pop()!;

      try {
        if (isAsyncDisposable(disposable)) {
          await disposable[disposeAsyncSymbol]();
        } else {
          disposable[disposeSymbol]();
        }
      } catch (err: unknown) {
        topError = hasError ? new SuppressedError(err, topError) : err;
        hasError = true;
      }
    }

    if (hasError) {
      throw topError;
    }
  }

  /** Moves all resources currently in this stack into a new `DisposableStack`. */
  move(): AsyncDisposableStack {
    const stack = new AsyncDisposableStack();

    stack.#stack.push(...this.#stack.splice(0, this.#stack.length));

    return stack;
  }

  /**
   * Adds a disposable resource to the stack, returning the resource.
   *
   * @param value The resource to add. `null` and `undefined` will not be added,
   *   but will be returned.
   * @returns The provided {@link value}.
   */
  use<T extends AsyncDisposable | Disposable | null | undefined>(value: T): T {
    if (value == null) {
      return value;
    }

    if (isAsyncDisposable(value) || isDisposable(value)) {
      this.#stack.push(value);
      return value;
    }

    throw new TypeError(
      `The supplied value must have a [Symbol.dispose] or [Symbol.asyncDispose] method`
    );
  }

  get [Symbol.toStringTag](): string {
    return "AsyncDisposableStack";
  }
}

function isAsyncDisposable(disposable: unknown): disposable is AsyncDisposable {
  return (
    disposable != null &&
    typeof (disposable as AsyncDisposable)[disposeAsyncSymbol] === "function"
  );
}

function isDisposable(disposable: unknown): disposable is Disposable {
  return (
    disposable != null &&
    typeof (disposable as Disposable)[disposeSymbol] === "function"
  );
}

class AsyncValueDisposer<T> implements AsyncDisposable {
  #disposed = false;
  readonly #value: T;
  readonly #onDispose: (value: T) => void;

  constructor(value: T, onDispose: (value: T) => void) {
    this.#value = value;
    this.#onDispose = onDispose;
  }

  async [disposeAsyncSymbol]() {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;

    await this.#onDispose(this.#value);
  }
}

/**
 * A stack of resources that can be disposed of synchronously in reverse order of their addition.
 *
 * Resources can be added to the stack using the `use`, `adopt`, and `defer` methods.
 *
 * @see {@link https://github.com/tc39/proposal-explicit-resource-management?tab=readme-ov-file#the-disposablestack-and-asyncdisposablestack-container-objects}
 */
export class DisposableStack implements Disposable {
  #disposed = false;
  readonly #stack: Disposable[] = [];

  get disposed(): boolean {
    return this.#disposed;
  }

  /**
   * Adds a non-disposable resource and a disposal callback to the top of the
   * stack.
   */
  adopt<T>(value: T, onDispose: (value: T) => void): T {
    if (typeof onDispose !== "function") {
      throw new TypeError("The onDispose argument must be a function");
    }

    const disposable = new ValueDisposer(value, onDispose);

    this.#stack.push(disposable);

    return value;
  }

  /** Adds a disposal callback to the top of the stack. */
  defer(onDispose: () => void): void {
    if (typeof onDispose !== "function") {
      throw new TypeError("The onDispose argument must be a function");
    }

    const disposable = new DeferredFunction(onDispose);

    this.#stack.push(disposable);
  }

  /** Disposes of resources within this object. */
  [disposeSymbol](): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;

    let hasError = false;
    let topError: unknown = undefined;

    while (this.#stack.length) {
      const disposable = this.#stack.pop()!;

      try {
        disposable[disposeSymbol]();
      } catch (err: unknown) {
        topError = hasError ? new SuppressedError(err, topError) : err;
        hasError = true;
      }
    }

    if (hasError) {
      throw topError;
    }
  }

  /** Moves all resources currently in this stack into a new `DisposableStack`. */
  move(): DisposableStack {
    const stack = new DisposableStack();

    stack.#stack.push(...this.#stack.splice(0, this.#stack.length));

    return stack;
  }

  /**
   * Adds a resource to the top of the stack. Has no effect if provided `null`
   * or `undefined`.
   */
  use<T extends Disposable | null | undefined>(value: T): T {
    if (value == null) {
      return value;
    }

    if (typeof value[disposeSymbol] !== "function") {
      throw new TypeError(
        `The supplied value must have a [Symbol.dispose] method`
      );
    }

    this.#stack.push(value);

    return value;
  }
}

class DeferredFunction implements Disposable {
  #disposed = false;
  readonly #onDispose: () => void;

  constructor(onDispose: () => void) {
    this.#onDispose = onDispose;
  }

  [disposeSymbol]() {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;
    this.#onDispose();
  }
}

class DeferredAsyncFunction implements AsyncDisposable {
  #disposed = false;
  readonly #onDispose: () => void | PromiseLike<void>;

  constructor(onDispose: () => void | PromiseLike<void>) {
    this.#onDispose = onDispose;
  }

  async [disposeAsyncSymbol]() {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;

    await this.#onDispose();
  }
}

class ValueDisposer<T> implements Disposable {
  #disposed = false;
  readonly #value: T;
  readonly #onDispose: (value: T) => void;

  constructor(value: T, onDispose: (value: T) => void) {
    this.#value = value;
    this.#onDispose = onDispose;
  }

  [disposeSymbol]() {
    if (this.#disposed) {
      return;
    }

    this.#disposed = true;
    this.#onDispose(this.#value);
  }
}
