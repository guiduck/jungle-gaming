import { Injectable } from "@nestjs/common";
import type { WalletRepository } from "../../application/ports/wallet-ports";
import { Wallet } from "../../domain";

@Injectable()
export class InMemoryWalletRepository implements WalletRepository {
  private readonly wallets = new Map<string, Wallet>();

  async findByPlayerId(playerId: string): Promise<Wallet | undefined> {
    return this.wallets.get(playerId);
  }

  async save(wallet: Wallet): Promise<void> {
    this.wallets.set(wallet.playerId.value, wallet);
  }
}
