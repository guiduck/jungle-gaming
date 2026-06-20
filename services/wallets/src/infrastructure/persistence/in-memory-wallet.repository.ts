import { Injectable } from "@nestjs/common";
import type { WalletRepository } from "../../application/ports/wallet-ports";
import { Wallet } from "../../domain";

@Injectable()
export class InMemoryWalletRepository implements WalletRepository {
  private readonly wallets = new Map<string, Wallet>();

  findByPlayerId(playerId: string): Wallet | undefined {
    return this.wallets.get(playerId);
  }

  save(wallet: Wallet): void {
    this.wallets.set(wallet.playerId.value, wallet);
  }
}
