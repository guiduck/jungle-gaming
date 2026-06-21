import { Inject, Injectable, Logger } from "@nestjs/common";
import { Money, PlayerId, Wallet } from "../domain";
import type { WalletOperationSnapshot, WalletSnapshot } from "../domain";
import {
  WALLET_CLOCK,
  WALLET_ID_GENERATOR,
  WALLET_OPERATION_REPOSITORY,
  WALLET_REPOSITORY,
  WALLET_RESULT_PUBLISHER,
} from "./ports/wallet-ports";
import { formatLogEvent } from "../infrastructure/system/log-event";
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
  private readonly logger = new Logger(WalletStateService.name);

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

  createWallet(playerIdValue: string): Promise<WalletSnapshot> {
    return this.seedWallet(playerIdValue);
  }

  getWallet(playerIdValue: string): Promise<WalletSnapshot> {
    return this.seedWallet(playerIdValue);
  }

  async debitBet(command: WalletEffectCommand): Promise<WalletOperationSnapshot> {
    const previous = await this.operations.findByIdempotencyKey(command.idempotencyKey);

    if (previous) {
      this.logger.log(formatLogEvent("wallet.debit.duplicate", {
        playerId: command.playerId,
        amountCents: previous.amountCents,
        idempotencyKey: command.idempotencyKey,
        result: previous.status,
        reason: previous.reason,
      }));
      return this.toOperationSnapshot(previous);
    }

    const wallet = await this.getOrCreate(command.playerId);
    const operation = wallet.debit(
      command.idempotencyKey,
      Money.fromCents(command.amountCents),
    );
    await this.recordAndPublish(wallet, operation);
    this.logger.log(formatLogEvent("wallet.debit.recorded", {
      playerId: command.playerId,
      amountCents: operation.amountCents,
      idempotencyKey: operation.idempotencyKey,
      result: operation.status,
      reason: operation.reason,
    }));
    return operation;
  }

  async creditPayout(command: WalletEffectCommand): Promise<WalletOperationSnapshot> {
    const previous = await this.operations.findByIdempotencyKey(command.idempotencyKey);

    if (previous) {
      this.logger.log(formatLogEvent("wallet.payout.duplicate", {
        playerId: command.playerId,
        amountCents: previous.amountCents,
        idempotencyKey: command.idempotencyKey,
        result: previous.status,
        reason: previous.reason,
      }));
      return this.toOperationSnapshot(previous);
    }

    const wallet = await this.getOrCreate(command.playerId);
    const operation = wallet.credit(
      command.idempotencyKey,
      Money.fromCents(command.amountCents),
    );
    await this.recordAndPublish(wallet, operation);
    this.logger.log(formatLogEvent("wallet.payout.recorded", {
      playerId: command.playerId,
      amountCents: operation.amountCents,
      idempotencyKey: operation.idempotencyKey,
      result: operation.status,
    }));
    return operation;
  }

  async seedWallet(playerIdValue: string, amountCents = DEFAULT_SEED_BALANCE_CENTS): Promise<WalletSnapshot> {
    const playerId = PlayerId.from(playerIdValue);
    const seedKey = `seed-credit:${playerId.value}`;
    const wallet = await this.getOrCreate(playerId.value);
    const previous = await this.operations.findByIdempotencyKey(seedKey);

    if (previous) {
      this.logger.log(formatLogEvent("wallet.seed.duplicate", {
        playerId: playerId.value,
        amountCents: previous.amountCents,
        idempotencyKey: seedKey,
        result: previous.status,
      }));
      return wallet.toSnapshot();
    }

    const operation = wallet.credit(
      seedKey,
      Money.fromCents(amountCents),
      "seed_credit",
    );
    await this.recordAndPublish(wallet, operation);
    this.logger.log(formatLogEvent("wallet.seed.recorded", {
      playerId: playerId.value,
      amountCents,
      idempotencyKey: seedKey,
      result: operation.status,
    }));
    return wallet.toSnapshot();
  }

  private async recordAndPublish(
    wallet: Wallet,
    operation: WalletOperationSnapshot,
  ): Promise<void> {
    const record: WalletOperationRecord = {
      idempotencyKey: operation.idempotencyKey,
      playerId: wallet.playerId.value,
      type: operation.type,
      amountCents: operation.amountCents,
      status: operation.status,
      reason: operation.reason,
      recordedAt: this.clock.now().toISOString(),
    };

    const stored = await this.operations.recordWalletMutation(wallet, record);
    await this.results.publish(stored);
  }

  private async getOrCreate(playerIdValue: string): Promise<Wallet> {
    const playerId = PlayerId.from(playerIdValue);
    const existing = await this.wallets.findByPlayerId(playerId.value);

    if (existing) {
      return existing;
    }

    const wallet = new Wallet(this.ids.next(`wallet-${playerId.value}`), playerId);
    return wallet;
  }

  private toOperationSnapshot(operation: WalletOperationRecord): WalletOperationSnapshot {
    return {
      idempotencyKey: operation.idempotencyKey,
      type: operation.type,
      amountCents: operation.amountCents,
      status: operation.status,
      reason: operation.reason,
    };
  }
}
