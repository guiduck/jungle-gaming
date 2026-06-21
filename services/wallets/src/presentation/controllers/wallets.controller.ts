import { Body, Controller, ForbiddenException, Get, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { WalletStateService } from "../../application/wallet-state.service";
import { KeycloakJwtGuard } from "../auth/keycloak-jwt.guard";
import type { PlayerRequest } from "../auth/player-request";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";

@Controller()
@ApiTags("wallets")
export class WalletsController {
  constructor(private readonly walletState: WalletStateService) {}

  @Get("health")
  @ApiOperation({ summary: "Check Wallets service health" })
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "wallets" };
  }

  @Post()
  @UseGuards(KeycloakJwtGuard)
  @ApiOperation({ summary: "Create the current player's wallet idempotently" })
  create(@Req() request: PlayerRequest): Promise<unknown> {
    return this.walletState.createWallet(this.playerId(request));
  }

  @Get("me")
  @UseGuards(KeycloakJwtGuard)
  @ApiOperation({ summary: "Get the current player's wallet" })
  me(@Req() request: PlayerRequest): Promise<unknown> {
    return this.walletState.getWallet(this.playerId(request));
  }

  @Post("internal/effects/debit-bet")
  @ApiOperation({ summary: "Internal service endpoint: debit a bet from a wallet" })
  debitBet(
    @Headers("x-internal-token") token: string | undefined,
    @Body() body: WalletEffectBody,
  ): Promise<unknown> {
    this.assertInternalToken(token);
    return this.walletState.debitBet(body).then((operation) => ({
      idempotencyKey: operation.idempotencyKey,
      status: operation.status,
      reason: operation.reason,
    }));
  }

  @Post("internal/effects/credit-payout")
  @ApiOperation({ summary: "Internal service endpoint: credit a cashout payout to a wallet" })
  creditPayout(
    @Headers("x-internal-token") token: string | undefined,
    @Body() body: WalletEffectBody,
  ): Promise<unknown> {
    this.assertInternalToken(token);
    return this.walletState.creditPayout(body).then((operation) => ({
      idempotencyKey: operation.idempotencyKey,
      status: operation.status,
      reason: operation.reason,
    }));
  }

  private playerId(request: PlayerRequest): string {
    return request.playerId ?? "player";
  }

  private assertInternalToken(token: string | undefined): void {
    const expected = process.env.INTERNAL_SERVICE_TOKEN ?? "local-dev-internal-token";

    if (!token || token !== expected) {
      throw new ForbiddenException("Invalid internal service token");
    }
  }
}

interface WalletEffectBody {
  idempotencyKey: string;
  playerId: string;
  amountCents: number;
}
