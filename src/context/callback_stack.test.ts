import * as Assert from "node:assert/strict";
import { test } from "node:test";
import { CallbackStack } from "./callback_stack.ts";

test("Emitter", async (t) => {
  await t.test("will call all listeners exactly once", async (t) => {
    const emitter = new CallbackStack();
    const listenerFn1 = t.mock.fn();
    const listenerFn2 = t.mock.fn();

    emitter.push(listenerFn1);
    emitter.push(listenerFn2);

    emitter.fireEvent("event1");

    Assert.equal(listenerFn1.mock.callCount(), 1);
    Assert.equal(listenerFn2.mock.callCount(), 1);
    Assert.deepEqual(listenerFn1.mock.calls[0]?.arguments, ["event1"]);
    Assert.deepEqual(listenerFn2.mock.calls[0]?.arguments, ["event1"]);

    emitter.fireEvent("event2");

    Assert.equal(listenerFn1.mock.callCount(), 1);
    Assert.equal(listenerFn2.mock.callCount(), 1);
  });

  await t.test("will call listeners added while firing an event", async (t) => {
    const emitter = new CallbackStack();
    const listenerFn1 = t.mock.fn();
    const listenerFn2 = t.mock.fn();

    emitter.push(listenerFn1);
    emitter.push(listenerFn2);

    emitter.fireEvent("event1");

    Assert.equal(listenerFn1.mock.callCount(), 1);
    Assert.equal(listenerFn2.mock.callCount(), 1);
    Assert.deepEqual(listenerFn1.mock.calls[0]?.arguments, ["event1"]);
    Assert.deepEqual(listenerFn2.mock.calls[0]?.arguments, ["event1"]);

    emitter.fireEvent("event2");

    Assert.equal(listenerFn1.mock.callCount(), 1);
    Assert.equal(listenerFn2.mock.callCount(), 1);
  });
});
