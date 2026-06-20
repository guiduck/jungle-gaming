import { DomainError } from "../errors/domain-error";

export class Money {
  private constructor(public readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents)) {
      throw new DomainError("Money must use integer cents");
    }

    if (cents < 0) {
      throw new DomainError("Money cannot be negative");
    }

    return new Money(cents);
  }
}
