export {};

type TimeoutRef = string | number;

type ClearTimeout = (ref?: TimeoutRef | undefined) => void;

type SetTimeout = <TArgs extends any[]>(
  callback: (...args: TArgs) => any,
  ms?: number,
  ...args: TArgs
) => TimeoutRef;

declare global {
  var clearTimeout: ClearTimeout;
  var setTimeout: SetTimeout;
}
