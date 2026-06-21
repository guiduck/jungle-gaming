import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { GameStateService } from "../../application/game-state.service";
import { DomainError } from "../../domain";
import { KeycloakJwtGuard } from "../auth/keycloak-jwt.guard";
import type { PlayerRequest } from "../auth/player-request";
import { CashoutRequestDto } from "../dtos/cashout-request.dto";
import { HealthCheckResponseDto } from "../dtos/health-check-response.dto";
import { PlaceBetRequestDto } from "../dtos/place-bet-request.dto";

@Controller()
@ApiTags("games")
export class GamesController {
  constructor(private readonly gameState: GameStateService) {}

  @Get("health")
  @ApiOperation({ summary: "Check Games service health" })
  check(): HealthCheckResponseDto {
    return { status: "ok", service: "games" };
  }

  @Get("rounds/current")
  @ApiOperation({ summary: "Get the current round snapshot" })
  currentRound(): Promise<unknown> {
    return this.gameState.getCurrentRound();
  }

  @Get("rounds/history")
  @ApiOperation({ summary: "Get recent completed rounds" })
  async history(): Promise<unknown> {
    return { items: await this.gameState.getRoundHistory() };
  }

  @Get("rounds/:roundId/verify")
  @ApiOperation({ summary: "Get provably fair verification data for a completed round" })
  verify(@Param("roundId") roundId: string): Promise<unknown> {
    return this.run(() => this.gameState.getVerification(roundId));
  }

  @Get("bets/me")
  @UseGuards(KeycloakJwtGuard)
  @ApiOperation({ summary: "Get the current player's round snapshots with bets" })
  async myBets(@Req() request: PlayerRequest): Promise<unknown> {
    return { items: await this.gameState.getPlayerBets(this.playerId(request)) };
  }

  @Post("bet")
  @UseGuards(KeycloakJwtGuard)
  @ApiOperation({ summary: "Place a bet in the current betting round" })
  async placeBet(
    @Req() request: PlayerRequest,
    @Body() body: PlaceBetRequestDto,
  ): Promise<unknown> {
    this.assertInteger(body.amountCents, "amountCents");
    if (body.autoCashoutMultiplierBps !== undefined && body.autoCashoutMultiplierBps !== null) {
      this.assertInteger(body.autoCashoutMultiplierBps, "autoCashoutMultiplierBps");
    }
    return this.run(() =>
      this.gameState.placeBet(
        this.playerId(request),
        body.amountCents,
        body.autoCashoutMultiplierBps,
      ),
    );
  }

  @Post("bet/cashout")
  @UseGuards(KeycloakJwtGuard)
  @ApiOperation({ summary: "Cash out the current player's active bet" })
  cashout(
    @Req() request: PlayerRequest,
    @Body() body: CashoutRequestDto,
  ): Promise<unknown> {
    this.assertInteger(body.multiplierBps, "multiplierBps");
    return this.run(() => this.gameState.cashOut(this.playerId(request), body.multiplierBps));
  }

  @Post("rounds/current/start")
  @ApiOperation({ summary: "Development helper: start the current round" })
  start(): Promise<unknown> {
    return this.run(() => this.gameState.startRound());
  }

  @Post("rounds/current/crash")
  @ApiOperation({ summary: "Development helper: crash the current round" })
  async crash(): Promise<unknown> {
    return this.run(() => this.gameState.crashRound());
  }

  @Post("rounds/current/settle")
  @ApiOperation({ summary: "Development helper: settle and create the next round" })
  settle(): Promise<unknown> {
    return this.run(() => this.gameState.settleAndCreateNextRound());
  }

  private async run(action: () => unknown | Promise<unknown>): Promise<unknown> {
    try {
      return await action();
    } catch (error) {
      if (error instanceof DomainError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  private assertInteger(value: number, field: string): void {
    if (!Number.isInteger(value)) {
      throw new BadRequestException(`${field} must be an integer`);
    }
  }

  private playerId(request: PlayerRequest): string {
    return request.playerId ?? "player";
  }
}
