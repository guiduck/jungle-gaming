import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { GameStateService } from "./game-state.service";

const TICK_MS = Number(process.env.ROUND_RUNNER_TICK_MS ?? 1000);
const BETTING_TICKS = Number(process.env.ROUND_BETTING_TICKS ?? 5);
const MULTIPLIER_STEP_BPS = Number(process.env.ROUND_MULTIPLIER_STEP_BPS ?? 500);

@Injectable()
export class RoundRunnerService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private ticksInPhase = 0;
  private runningMultiplierBps = 10000;
  private ticking = false;

  constructor(private readonly gameState: GameStateService) {}

  onModuleInit(): void {
    if (process.env.ROUND_RUNNER_ENABLED !== "true") {
      return;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, TICK_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick(): Promise<void> {
    if (this.ticking) {
      return;
    }

    this.ticking = true;

    try {
      const round = this.gameState.getCurrentRound();
      this.ticksInPhase += 1;

      if (round.status === "betting" && this.ticksInPhase >= BETTING_TICKS) {
        this.gameState.startRound();
        this.runningMultiplierBps = 10000;
        this.ticksInPhase = 0;
        return;
      }

      if (round.status === "running") {
        this.runningMultiplierBps = Math.min(
          round.crashMultiplierBps,
          this.runningMultiplierBps + MULTIPLIER_STEP_BPS,
        );
        this.gameState.publishMultiplierTick(this.runningMultiplierBps);

        if (this.runningMultiplierBps >= round.crashMultiplierBps) {
          await this.gameState.crashRound();
          this.runningMultiplierBps = 10000;
          this.ticksInPhase = 0;
        }

        return;
      }

      if (round.status === "crashed") {
        this.gameState.settleAndCreateNextRound();
        this.ticksInPhase = 0;
        return;
      }
    } catch {
      this.ticksInPhase = 0;
    } finally {
      this.ticking = false;
    }
  }
}
