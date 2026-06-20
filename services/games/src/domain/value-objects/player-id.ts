import { DomainError } from "../errors/domain-error";

export class PlayerId {
  private constructor(public readonly value: string) {}

  static from(value: string): PlayerId {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new DomainError("Player id is required");
    }

    return new PlayerId(trimmed);
  }

  equals(other: PlayerId): boolean {
    return this.value === other.value;
  }
}
