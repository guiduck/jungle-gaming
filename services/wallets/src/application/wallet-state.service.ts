import { Inject, Injectable } from "@nestjs/common";
import { Money, PlayerId, Wallet } from "../domain";
import type { WalletOperationSnapshot, WalletSnapshot } from "../domain";
import {
  WALLET_CLOCK,
  WALLET_ID_GENERATOR,
  WALLET_OPERATION_REPOSITORY,
  WALLET_REPOSITORY,
  WALLET_RESULT_PUBLISHER,
} from "./ports/wallet-ports";
import type {
  Clock,
  IdGenerator,
  WalletEffectCommand,
  WalletOperationRecord,
  WalletOperationRepository,
  WalletRepository,
  WalletResultPublisher,
} from "./ports/wallet-ports";

const DEFAULT_SEED_BALANCE_CENTS = 100000;

@Injectable()
export class WalletStateService {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly wallets: WalletRepository,
    @Inject(WALLET_OPERATION_REPOSITORY)
    private readonly operations: WalletOperationRepository,
    @Inject(WALLET_RESULT_PUBLISHER)
    private readonly results: WalletResultPublisher,
    @Inject(WALLET_CLOCK)
    private readonly clock: Clock,
    @Inject(WALLET_ID_GENERATOR)
    private readonly ids: IdGenerator,
  ) {}

  createWallet(playerIdValue: string): WalletSnapshot {
    return this.seedWallet(playerIdValue);
  }

  getWallet(playerIdValue: string): WalletSnapshot {
    return this.seedWallet(playerIdValue);
  }

  debitBet(command: WalletEffectCommand): WalletOperationSnapshot {
    const wallet = this.getOrCreate(command.playerId);
    const operation = wallet.debit(
      command.idempotencyKey,
      Money.fromCents(command.amountCents),
    );
    this.wallets.save(wallet);
    this.recordAndPublish(command.playerId, operation);
    return operation;
  }

  creditPayout(command: WalletEffectCommand): WalletOperationSnapshot {
    const wallet = this.getOrCreate(command.playerId);
    const operation = wallet.credit(
      command.idempotencyKey,
      Money.fromCents(command.amountCents),
    );
    this.wallets.save(wallet);
    this.recordAndPublish(command.playerId, operation);
    return operation;
  }

  seedWallet(playerIdValue: string, amountCents = DEFAULT_SEED_BALANCE_CENTS): WalletSnapshot {
    const wallet = this.getOrCreate(playerIdValue);
    const operation = wallet.credit(
      `seed-credit:${wallet.playerId.value}`,
      Money.fromCents(amountCents),
      "seed_credit",
    );
    this.wallets.save(wallet);
    this.recordAndPublish(wallet.playerId.value, operation);
    return wallet.toSnapshot();
  }

  private recordAndPublish(
    playerId: string,
    operation: WalletOperationSnapshot,
  ): void {
    const record: WalletOperationRecord = {
      idempotencyKey: operation.idempotencyKey,
      playerId,
      type: operation.type,
      amountCents: operation.amountCents,
      status: operation.status,
      reason: operation.reason,
      recordedAt: this.clock.now().toISOString(),
    };

    this.operations.record(record);
    this.results.publish(record);
  }

  private getOrCreate(playerIdValue: string): Wallet {
    const playerId = PlayerId.from(playerIdValue);
    const existing = this.wallets.findByPlayerId(playerId.value);

    if (existing) {
      return existing;
    }

    const wallet = new Wallet(this.ids.next(`wallet-${playerId.value}`), playerId);
    this.wallets.save(wallet);
    return wallet;
  }
}
