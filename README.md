# @ggoodman/std

The `@ggoodman/std` package is a library of generically useful tools for
authoring production-grade services and tools in JavaScript and TypeScript.

This package exposes several sub-modules, each exported as a [sub-path
export](https://nodejs.org/docs/latest-v18.x/api/packages.html#subpath-exports).
Each of these are stand-alone packages that can be used independently. However,
they are designed to combine in synergistic and cohesive ways when used
together.

- [@ggoodman/std/context](#ggoodmanstdcontext) - Propagate cancellation and
  timeouts through application layers.
- [@ggoodman/std/disposable](#ggoodmanstddisposable) - Produce and consume
  `Disposable` and `AsyncDisposable` resources.
- [@ggoodman/std/invariant](#ggoodmanstdinvariant) - Type-safe and ergonomic
  invariant checking.

## Design philosphy

The sub-modules in this package share certain common design philosphies:

- Designed to align with future-looking JavaScript features and idioms.
- TypeScript first and aspiring to be self-documenting.
- Dependency-free.
- Based only on features found in prominent runtimes like browsers, Node.js,
  Bun, Deno and CloudFlare Workers.

## Packages

### @ggoodman/std/context

Propagate cancellation and timeouts through application layers.

**[API Documentation](https://jsr.io/@ggoodman/std/doc/context/~)**

**Example**:

```ts
import { createRootContextController } from "@ggoodman/std/context";

const rootCtl = createRootContextController();

// Cancel the root Context when the process receives the SIGINT signal.
process.on("SIGINT", () => rootCtl.cancel());

// Pass the immutable child Context onto another operation. The operation
// can create child Contexts with their own deadlines or data to pass
// further down the call graph.
await performLongRunningOperation(rootCtl.ctx);
```

### @ggoodman/std/disposable

Produce and consume `Disposable` and `AsyncDisposable` resources.

**[API Documentation](https://jsr.io/@ggoodman/std/doc/disposable/~)**

**Example**:

```ts
import { AsyncDisposableStack } from "@ggoodman/ctx/disposable";

async function doSomeWork() {
  // Register an AsyncDisposable to be disposed when the function completes.
  await using disposer = new AsyncDisposableStack();

  // This resource will be cleaned up by the disposable stack.
  const resource = createResource();
  disposer.use(disposer);
}
```

### @ggoodman/std/invariant

Type-safe and ergonomic invariant checking.

**[API Documentation](https://jsr.io/@ggoodman/std/doc/invariant/~)**

**Example**:

```ts
import { invariant } from "@ggoodman/std/invariant";

const nodeEnv = process.env["NODE_ENVIRONMENT"];

// Assert that `nodeEnv` is the string `"production"` or throw an `InvariantViolation`.
invariant(nodeEnv === "production", "This code MUST only be run in production");

// TypeScript now knows that `nodeEnv` is the string `"production"`.
```
