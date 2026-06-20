import { Bet } from "./bet";
import type { BetSnapshot } from "./bet";
import { DomainError } from "../errors/domain-error";
import { CrashPoint } from "../value-objects/crash-point";
import { Money } from "../value-objects/money";
import { PlayerId } from "../value-objects/player-id";

export type RoundStatus = "betting" | "running" | "crashed" | "settled";

export interface RoundSnapshot {
  id: string;
  status: RoundStatus;
  crashMultiplierBps: number;
  serverSeedHash?: string;
  nonce?: string;
  bets: BetSnapshot[];
}

export class Round {
  private readonly bets: Bet[] = [];
  private statusValue: RoundStatus = "betting";

  constructor(
    public readonly id: string,
    public readonly crashPoint: CrashPoint,
    public readonly serverSeedHash: string,
    public readonly nonce: string,
  ) {}

  static rehydrate(snapshot: RoundSnapshot): Round {
    if (!snapshot.serverSeedHash || !snapshot.nonce) {
      throw new DomainError("Round persistence snapshot is missing verification metadata");
    }

    const round = new Round(
      snapshot.id,
      CrashPoint.fromBasisPoints(snapshot.crashMultiplierBps),
      snapshot.serverSeedHash,
      snapshot.nonce,
    );
    round.statusValue = snapshot.status;
    snapshot.bets.forEach((bet) => round.bets.push(Bet.rehydrate(bet)));
    return round;
  }

  get status(): RoundStatus {
    return this.statusValue;
  }

  assertCanPlaceBet(playerId: PlayerId, amount: Money): void {
    if (this.statusValue !== "betting") {
      throw new DomainError("Round is not accepting bets");
    }

    if (this.bets.some((bet) => bet.belongsTo(playerId))) {
      throw new DomainError("Player already has a bet in this round");
    }

    Bet.create("__validation__", playerId, amount);
  }

  placeBet(betId: string, playerId: PlayerId, amount: Money): Bet {
    this.assertCanPlaceBet(playerId, amount);

    const bet = Bet.create(betId, playerId, amount);
    this.bets.push(bet);
    return bet;
  }

  start(): void {
    if (this.statusValue !== "betting") {
      throw new DomainError("Round can only start from betting");
    }

    this.statusValue = "running";
  }

  cashOut(playerId: PlayerId, multiplierBps: number): Money {
    if (this.statusValue !== "running") {
      throw new DomainError("Round is not running");
    }

    if (multiplierBps >= this.crashPoint.multiplierBps) {
      throw new DomainError("Cashout arrived after crash");
    }

    const bet = this.bets.find((candidate) => candidate.belongsTo(playerId));

    if (!bet) {
      throw new DomainError("Player has no bet in this round");
    }

    return bet.cashOut(multiplierBps);
  }

  crash(): void {
    if (this.statusValue !== "running") {
      throw new DomainError("Round can only crash while running");
    }

    this.statusValue = "crashed";
    this.bets.forEach((bet) => bet.lose());
  }

  settle(): void {
    if (this.statusValue !== "crashed") {
      throw new DomainError("Round can only settle after crash");
    }

    this.statusValue = "settled";
  }

  toSnapshot(): RoundSnapshot {
    return {
      id: this.id,
      status: this.statusValue,
      crashMultiplierBps: this.crashPoint.multiplierBps,
      serverSeedHash: this.serverSeedHash,
      nonce: this.nonce,
      bets: this.bets.map((bet) => bet.toSnapshot()),
    };
  }
}
