class InvariantViolation extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvariantViolation";
  }
}

/**
 * Test an invariant and throw if it does not hold truthy.
 *
 * This is tool that can be useful to encode expectations of truthiness in code.
 * TypeScript is able to use the invariant functin to narrow types later in the
 * control flow by assuming whatever assertion is being tested.
 *
 * @param test The condition to test. It will be evaluated for truthiness.
 * @param message The message explaining the nature of the invariant violation.
 */
export function invariant(test: unknown, message: string): asserts test {
  if (!test) {
    throw new InvariantViolation(`InvariantViolation: ${message}`);
  }
}
