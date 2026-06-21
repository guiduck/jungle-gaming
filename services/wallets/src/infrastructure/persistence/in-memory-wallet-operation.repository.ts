import { Injectable } from "@nestjs/common";
import type {
  WalletOperationRecord,
  WalletOperationRepository,
} from "../../application/ports/wallet-ports";
import type { Wallet } from "../../domain";
import { InMemoryWalletRepository } from "./in-memory-wallet.repository";

@Injectable()
export class InMemoryWalletOperationRepository implements WalletOperationRepository {
  private readonly operations = new Map<string, WalletOperationRecord>();

  constructor(private readonly wallets: InMemoryWalletRepository) {}

  async findByIdempotencyKey(idempotencyKey: string): Promise<WalletOperationRecord | undefined> {
    return this.operations.get(idempotencyKey);
  }

  async record(operation: WalletOperationRecord): Promise<WalletOperationRecord> {
    const previous = this.operations.get(operation.idempotencyKey);

    if (previous) {
      return previous;
    }

    this.operations.set(operation.idempotencyKey, operation);
    return operation;
  }

  async recordWalletMutation(
    wallet: Wallet,
    operation: WalletOperationRecord,
  ): Promise<WalletOperationRecord> {
    const previous = await this.findByIdempotencyKey(operation.idempotencyKey);

    if (previous) {
      return previous;
    }

    await this.wallets.save(wallet);
    return this.record(operation);
  }
}
