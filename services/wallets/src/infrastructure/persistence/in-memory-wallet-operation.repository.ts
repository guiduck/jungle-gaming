import { Injectable } from "@nestjs/common";
import type {
  WalletOperationRecord,
  WalletOperationRepository,
} from "../../application/ports/wallet-ports";

@Injectable()
export class InMemoryWalletOperationRepository implements WalletOperationRepository {
  private readonly operations = new Map<string, WalletOperationRecord>();

  record(operation: WalletOperationRecord): void {
    this.operations.set(operation.idempotencyKey, operation);
  }
}
