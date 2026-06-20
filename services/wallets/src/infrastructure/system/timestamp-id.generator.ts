import { Injectable } from "@nestjs/common";
import type { IdGenerator } from "../../application/ports/wallet-ports";

@Injectable()
export class TimestampIdGenerator implements IdGenerator {
  next(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
