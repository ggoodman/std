/**
 * # @ggoodman/std/invariant
 *
 * Type-safe and ergonomic invariant checking.
 *
 * The `invariant` function allows you to check pre-conditions for executing
 * your code while allowing you to narrow TypeScript types in [control
 * flow](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#control-flow-analysis).
 * This means that code following an `invariant` check can assume that the
 * condition is true.
 *
 * ## Example
 *
 * ```ts
 * import { invariant } from "@ggoodman/std/invariant";
 *
 * const nodeEnv = process.env["NODE_ENVIRONMENT"];
 *
 * // Assert that `nodeEnv` is the string `"production"` or throw an `InvariantViolation`.
 * invariant(nodeEnv === "production", "This code MUST only be run in production");
 *
 * // TypeScript now knows that `nodeEnv` is the string `"production"`.
 * ```
 *
 * @module
 */
export { invariant } from "./invariant.ts";
