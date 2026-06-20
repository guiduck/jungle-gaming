import { Injectable } from "@nestjs/common";
import {
  WalletOperationRecord,
  WalletResultPublisher,
} from "../../application/ports/wallet-ports";

@Injectable()
export class NoopWalletResultPublisher implements WalletResultPublisher {
  publish(_operation: WalletOperationRecord): void {
    // RabbitMQ result publishing replaces this adapter in the messaging slice.
  }
}
