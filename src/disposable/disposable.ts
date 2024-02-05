export const disposeSymbol: typeof Symbol.dispose = ((Symbol as any)[
  "dispose"
] ??= Symbol.for("Symbol.dispose"));
export const disposeAsyncSymbol: typeof Symbol.asyncDispose = ((Symbol as any)[
  "asyncDispose"
] ??= Symbol.for("Symbol.asyncDispose"));

export interface Disposable {
  [disposeSymbol](): void;
}

export interface AsyncDisposable {
  [disposeAsyncSymbol](): Promise<void>;
}
