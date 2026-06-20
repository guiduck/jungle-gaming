import { Injectable } from "@nestjs/common";
import type {
  GameWalletGateway,
  WalletEffectRequest,
  WalletEffectResult,
  WalletPayoutRequest,
} from "../../application/ports/game-ports";

const DEFAULT_WALLETS_URL = "http://wallets:4002";

@Injectable()
export class HttpGameWalletGateway implements GameWalletGateway {
  private readonly baseUrl = process.env.WALLETS_INTERNAL_URL ?? DEFAULT_WALLETS_URL;
  private readonly token = process.env.INTERNAL_SERVICE_TOKEN ?? "local-dev-internal-token";

  requestBetDebit(request: WalletEffectRequest): Promise<WalletEffectResult> {
    return this.postEffect("/internal/effects/debit-bet", request);
  }

  requestPayoutCredit(request: WalletPayoutRequest): Promise<WalletEffectResult> {
    return this.postEffect("/internal/effects/credit-payout", request);
  }

  private async postEffect(
    path: string,
    payload: WalletEffectRequest | WalletPayoutRequest,
  ): Promise<WalletEffectResult> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-token": this.token,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          status: "rejected",
          idempotencyKey: payload.idempotencyKey,
          reason: typeof result.message === "string" ? result.message : `wallet_http_${response.status}`,
        };
      }

      return {
        status: result.status === "accepted" ? "accepted" : "rejected",
        idempotencyKey: payload.idempotencyKey,
        reason: typeof result.reason === "string" ? result.reason : undefined,
      };
    } catch {
      return {
        status: "timeout",
        idempotencyKey: payload.idempotencyKey,
        reason: "wallet_http_unreachable",
      };
    }
  }
}
