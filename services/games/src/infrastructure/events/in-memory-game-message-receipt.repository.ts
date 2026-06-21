import { Injectable } from "@nestjs/common";

@Injectable()
export class InMemoryGameMessageReceiptRepository {
  private readonly receipts = new Set<string>();

  async has(idempotencyKey: string): Promise<boolean> {
    return this.receipts.has(idempotencyKey);
  }

  async record(idempotencyKey: string): Promise<void> {
    this.receipts.add(idempotencyKey);
  }
}
