import { Injectable } from "@nestjs/common";
import type { IdGenerator } from "../../application/ports/game-ports";

@Injectable()
export class TimestampIdGenerator implements IdGenerator {
  private sequence = 1;

  next(prefix: string): string {
    return `${prefix}-${Date.now()}-${this.sequence++}`;
  }
}
