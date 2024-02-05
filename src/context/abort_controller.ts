// from https://github.com/microsoft/TypeScript/blob/38da7c600c83e7b31193a62495239a0fe478cb67/lib/lib.webworker.d.ts#L633 until moved to separate lib
/** A controller object that allows you to abort one or more DOM requests as and when desired. */
export interface AbortController {
  /**
   * Returns the AbortSignal object associated with this object.
   */

  readonly signal: AbortSignal;
  /**
   * Invoking this method will set this object's AbortSignal's aborted flag and signal to any observers that the associated activity is to be aborted.
   */
  abort(reason?: any): void;
}

/** A signal object that allows you to communicate with a DOM request (such as a Fetch) and abort it if required via an AbortController object. */
export interface AbortSignal {
  /**
   * Returns true if this AbortSignal's AbortController has signaled to abort, and false otherwise.
   */
  readonly aborted: boolean;
  readonly reason: any;
  throwIfAborted(): void;
  addEventListener(eventName: "abort", listener: (...args: any[]) => any): void;
  removeEventListener(
    eventName: "abort",
    listener: (...args: any[]) => any
  ): void;
}

interface AbortControllerConstructor {
  prototype: AbortController;
  new (): AbortController;
}

interface AbortSignalConstructor {
  prototype: AbortSignal;
  new (): AbortSignal;
  abort(reason?: any): AbortSignal;
  timeout(milliseconds: number): AbortSignal;
}

export const AbortController: AbortControllerConstructor = (globalThis as any)[
  "AbortController"
];

export const AbortSignal: AbortSignalConstructor = (globalThis as any)[
  "AbortSignal"
];
