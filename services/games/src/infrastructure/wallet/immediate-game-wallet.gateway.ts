import { Injectable } from "@nestjs/common";
import type {
  GameWalletGateway,
  WalletEffectRequest,
  WalletEffectResult,
  WalletPayoutRequest,
} from "../../application/ports/game-ports";

@Injectable()
export class ImmediateGameWalletGateway implements GameWalletGateway {
  async requestBetDebit(request: WalletEffectRequest): Promise<WalletEffectResult> {
    return {
      status: "accepted",
      idempotencyKey: request.idempotencyKey,
    };
  }

  async requestPayoutCredit(request: WalletPayoutRequest): Promise<WalletEffectResult> {
    return {
      status: "accepted",
      idempotencyKey: request.idempotencyKey,
    };
  }
}
