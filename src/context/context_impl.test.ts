import * as Assert from "node:assert/strict";
import { mock, test } from "node:test";
import { createRootContext } from "./context_impl.ts";
import { isCancellationError } from "./errors.ts";

function isObjectLike(actual: unknown): actual is Record<string, unknown> {
  return actual != null && typeof actual === "object";
}

function assertIsObject(
  actual: unknown,
  message = "value must be object-like"
): asserts actual is Record<string, unknown> {
  Assert.ok(isObjectLike(actual), message);
}

function assertObjectMatch(
  actual: unknown,
  expected: Record<string, unknown>,
  message?: string
) {
  assertIsObject(actual, message);

  for (const key of Object.keys(expected)) {
    const expectedValue = expected[key];
    const actualValue: unknown = actual[key];

    if (isObjectLike(expectedValue)) {
      assertObjectMatch(actualValue, expectedValue);
    } else {
      Assert.equal(actualValue, expectedValue, message);
    }
  }
}

test("ContextImpl", async (t) => {
  await t.test("will fire listeners when cancelled", async (t) => {
    const rootCtx = createRootContext();
    const { cancel, ctx } = rootCtx.withCancel();
    const mockHandlerFn = t.mock.fn();

    ctx.onDidCancel(mockHandlerFn);

    Assert.equal(mockHandlerFn.mock.callCount(), 0);

    cancel("reason");

    Assert.equal(mockHandlerFn.mock.callCount(), 1);
    Assert.ok(mockHandlerFn.mock.calls[0]);
    Assert.ok(isCancellationError(mockHandlerFn.mock.calls[0].arguments[0]));
    Assert.equal(mockHandlerFn.mock.calls[0].arguments[0].cause, "reason");

    cancel("more reasons");

    // Should not have been cancelled again
    Assert.equal(mockHandlerFn.mock.callCount(), 1);
  });

  await t.test(
    "will cancel a child context when the parent is cancelled",
    async (t) => {
      const rootCtx = createRootContext();
      const { cancel: cancelParent, ctx: parentCtx } = rootCtx.withCancel();
      const { ctx: childCtx } = parentCtx.withCancel();
      const mockHandlerFn = t.mock.fn();

      // Attach the listener to the child
      childCtx.onDidCancel(mockHandlerFn);

      Assert.equal(mockHandlerFn.mock.callCount(), 0);

      // Cancel the parent
      cancelParent("reason");

      Assert.equal(mockHandlerFn.mock.callCount(), 1);
      Assert.ok(mockHandlerFn.mock.calls[0]);
      Assert.ok(isCancellationError(mockHandlerFn.mock.calls[0].arguments[0]));
      Assert.equal(mockHandlerFn.mock.calls[0].arguments[0].cause, "reason");

      // Attempt to re-cancel the parent
      cancelParent("more reasons");

      // Should not have been cancelled again
      Assert.equal(mockHandlerFn.mock.callCount(), 1);
    }
  );

  await t.test(
    "will not cancel a parent context when the child is cancelled",
    async (t) => {
      const rootCtx = createRootContext();
      const parentCtl = rootCtx.withCancel();
      const parentCancelHandlerFn = t.mock.fn();
      const childCtl = parentCtl.ctx.withCancel();
      const childCancelHandlerFn = t.mock.fn();

      childCtl.ctx.onDidCancel(childCancelHandlerFn);
      parentCtl.ctx.onDidCancel(parentCancelHandlerFn);

      Assert.equal(childCancelHandlerFn.mock.callCount(), 0);
      Assert.equal(parentCancelHandlerFn.mock.callCount(), 0);

      // Cancel the parent
      childCtl.cancel("reason");

      Assert.equal(childCancelHandlerFn.mock.callCount(), 1);
      Assert.equal(parentCancelHandlerFn.mock.callCount(), 0);
      Assert.ok(childCancelHandlerFn.mock.calls[0]);
      Assert.ok(
        isCancellationError(childCancelHandlerFn.mock.calls[0].arguments[0])
      );
      Assert.equal(
        childCancelHandlerFn.mock.calls[0].arguments[0].cause,
        "reason"
      );

      // Attempt to re-cancel the parent
      childCtl.cancel("reason");

      // Should not have been cancelled again
      Assert.equal(childCancelHandlerFn.mock.callCount(), 1);
    }
  );

  await t.test(".withData()", async (t) => {
    await t.test("will expose data to child contexts", async (t) => {
      const rootCtx = createRootContext();
      const dataKey = Symbol("data-key");
      const dataValue = Symbol("data-value");

      const childCtxWithData = rootCtx.withData(dataKey, dataValue);
      const { ctx: grandChildCtx } = childCtxWithData.withCancel();

      assertObjectMatch(childCtxWithData.getData(dataKey), {
        key: dataKey,
        value: dataValue,
      });
      assertObjectMatch(grandChildCtx.getData(dataKey), {
        key: dataKey,
        value: dataValue,
      });
    });
  });

  await t.test(".withAbortSignal()", async (t) => {
    await t.test(
      "will cancel a child context when the signal aborts",
      async (t) => {
        const rootCtx = createRootContext();
        const ac = new AbortController();
        const { ctx } = rootCtx.withAbortSignal(ac.signal);
        const mockHandlerFn = t.mock.fn();

        ctx.onDidCancel(mockHandlerFn);

        Assert.ok(!ctx.isCancelled());
        Assert.equal(mockHandlerFn.mock.callCount(), 0);

        ac.abort("because I said so");

        Assert.ok(ctx.isCancelled());
        Assert.equal(mockHandlerFn.mock.callCount(), 1);

        Assert.ok(mockHandlerFn.mock.calls[0]);
        Assert.ok(
          isCancellationError(mockHandlerFn.mock.calls[0].arguments[0])
        );
        Assert.equal(
          mockHandlerFn.mock.calls[0].arguments[0].cause,
          "because I said so"
        );
      }
    );

    await t.test(
      "will cancel a child context with a DOMException if no reason is specified",
      async (t) => {
        const rootCtx = createRootContext();
        const ac = new AbortController();
        const { ctx } = rootCtx.withAbortSignal(ac.signal);
        const mockHandlerFn = t.mock.fn();

        ctx.onDidCancel(mockHandlerFn);

        Assert.ok(!ctx.isCancelled());
        Assert.equal(mockHandlerFn.mock.callCount(), 0);

        ac.abort();

        Assert.ok(ctx.isCancelled());
        Assert.equal(mockHandlerFn.mock.callCount(), 1);

        Assert.ok(mockHandlerFn.mock.calls[0]);
        Assert.ok(
          isCancellationError(mockHandlerFn.mock.calls[0].arguments[0])
        );
        const abortErr = mockHandlerFn.mock.calls[0].arguments[0]!
          .cause as Error;
        Assert.equal(abortErr.name, "AbortError");
      }
    );
  });

  await t.test(".signal", async (t) => {
    await t.test("will be aborted with the Context is cancelled", async (t) => {
      const rootCtx = createRootContext();
      const ctl = rootCtx.withCancel();
      const didAbort = mock.fn();

      ctl.ctx.signal.addEventListener("abort", didAbort);

      Assert.equal(didAbort.mock.callCount(), 0, "was not aborted immediately");

      ctl.cancel("reason");

      Assert.equal(
        didAbort.mock.callCount(),
        1,
        "call count becomes 1 after aborting the Context"
      );
      Assert.equal(ctl.ctx.signal.aborted, true);
    });

    await t.test(
      "will already be aborted when created using a cancelled Context",
      async (t) => {
        const rootCtx = createRootContext();
        const ctl = rootCtx.withCancel();
        const didAbort = mock.fn();

        // Cancel before getting an AbortSignal reference.
        ctl.cancel("early cancel");

        ctl.ctx.signal.addEventListener("abort", didAbort);

        Assert.equal(
          didAbort.mock.callCount(),
          0,
          "was not aborted immediately"
        );
        Assert.equal(ctl.ctx.signal.aborted, true);

        ctl.cancel("Attempt to re-cancel");

        Assert.equal(
          didAbort.mock.callCount(),
          0,
          "call count becomes 1 after aborting the Context"
        );
        Assert.equal(ctl.ctx.signal.aborted, true);
      }
    );
  });
});
