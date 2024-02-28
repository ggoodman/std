import { AbortError } from "./abort_error.ts";

/**
 * A CancellationReason is a value that provides more information on why a Context was cancelled.
 */
export type CancellationReason = {};

/**
 * A ContextError represents the collection of Error types that resulted in a Context being cancelled.
 */
export type ContextError =
  | AbortError
  | CancellationError
  | DeadlineExceededError;

/**
 * A CancellationError is thrown when a Context is cancelled.
 *
 * The `cause` property is a `CancellationReason` that provides more information on why the Context was cancelled. Typically, it is the value passed to the `cancel` method.
 */
export interface CancellationError extends Error {
  cause: CancellationReason;
  message: string;
}

// Using a generic symbol like this means that multiple versions or instances of the Context library can
// co-exist and detect each-others Errors.
const CancellationErrorTag = Symbol.for("Context.CancellationError");
export class CancellationErrorImpl
  extends AbortError
  implements CancellationError
{
  public readonly __tag = CancellationErrorTag;
  public readonly name = "CancellationError";

  public readonly cause: CancellationReason;
  public readonly message = "Cancelled";

  constructor(reason: CancellationReason) {
    super();
    this.cause = reason;
  }
}

/**
 * Check whether a variable is a CancellationError.
 *
 * @param err possible error
 * @returns whether the error is a CancellationError
 */
export function isCancellationError(err?: unknown): err is CancellationError {
  return isErrorWithTag(err, CancellationErrorTag);
}

/**
 * A DeadlineExceededError is thrown when a deadline is exceeded.
 */
export interface DeadlineExceededError extends Error {
  message: string;
}

// Using a generic symbol like this means that multiple versions or instances of the Context library can
// co-exist and detect each-others Errors.
const DeadlineExceededErrorTag = Symbol.for("Context.DeadlineExceededError");
export class DeadlineExceededErrorImpl
  extends AbortError
  implements DeadlineExceededError
{
  public readonly __tag = DeadlineExceededErrorTag;
  public readonly message: string;
  public readonly name = "DeadlineExceeded";

  constructor(message = "Deadline exceeded") {
    super();

    this.message = message;
  }
}

export function isDeadlineExceededError(
  err?: unknown
): err is DeadlineExceededError {
  return isErrorWithTag(err, DeadlineExceededErrorTag);
}

function isErrorWithTag(err: unknown, tag: symbol): boolean {
  if (err == null) {
    return false;
  }

  if ((err as any)["__tag"] === tag) {
    return true;
  }

  while ((err = (err as any)?.cause) != null) {
    if ((err as any)["__tag"] === tag) {
      return true;
    }
  }

  return false;
}
