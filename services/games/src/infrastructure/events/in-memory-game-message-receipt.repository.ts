import { Injectable } from "@nestjs/common";

@Injectable()
export class InMemoryGameMessageReceiptRepository {
  private readonly receipts = new Set<string>();

  has(idempotencyKey: string): boolean {
    return this.receipts.has(idempotencyKey);
  }

  record(idempotencyKey: string): void {
    this.receipts.add(idempotencyKey);
  }
}
