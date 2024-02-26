import { disposeSymbol, type Disposable } from "../disposable/disposable.ts";

type AnyFunc = (...args: any[]) => any;

class CallbackStackNode<THandler extends AnyFunc> {
  public prev: CallbackStackNode<THandler> | null = null;
  public next: CallbackStackNode<THandler> | null = null;

  constructor(public readonly handlerFn: THandler) {}
}

export class CallbackStack<THandler extends AnyFunc = AnyFunc>
  implements Disposable
{
  #tail: CallbackStackNode<THandler> | null = null;

  [disposeSymbol]() {
    let last = this.#tail;

    this.#tail = null;

    // Does this actually help GC or is it net extra work?
    while (last) {
      const tmp = last;
      last = last.prev;
      tmp.next = null;
      tmp.prev = null;
    }
  }

  push(handlerFn: THandler): Disposable {
    const node = new CallbackStackNode(handlerFn);

    node.prev = this.#tail;

    if (this.#tail) {
      this.#tail.next = node;
    }

    this.#tail = node;

    return {
      [disposeSymbol]: () => this.#removeNode(node),
    };
  }

  #popNode(): CallbackStackNode<THandler> | null {
    const tail = this.#tail;

    if (!tail) {
      return null;
    }

    this.#tail = tail.prev;

    // Shouldn't ever be set but may as well be sure
    tail.next = null;
    tail.prev = null;

    if (this.#tail) {
      this.#tail.next = null;
    }

    return tail;
  }

  fireEvent(...args: Parameters<THandler>): void {
    const errors: unknown[] = [];

    let tail = this.#popNode();

    while (tail) {
      try {
        tail.handlerFn(...args);
      } catch (err: unknown) {
        errors.push(err);
      }

      tail = this.#popNode();
    }

    if (errors.length) {
      throw new AggregateError(
        errors,
        "Uncaught exception will notifying Contexts of cancellation"
      );
    }
  }

  #removeNode(node: CallbackStackNode<THandler>) {
    const prev = node.prev;
    const next = node.next;

    if (prev) {
      prev.next = next;
    }

    if (next) {
      next.prev = prev;
    }

    if (this.#tail === node) {
      this.#tail = prev;
    }
  }
}
