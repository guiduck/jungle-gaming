import type { Meta, StoryObj } from "@storybook/react";
import type { FormEvent } from "react";
import type { AutoBetStrategy } from "../../services/auto-bet";
import type {
  CompletedRound,
  ItemsResponse,
  LeaderboardResponse,
  PlayerBetHistoryEntry,
  Round,
  RoundHistorySummary,
  Wallet,
} from "../../types";
import {
  BettingControls,
  CurrentBetsPanel,
  HistoryPanel,
  LeaderboardPanel,
  MyBetsPanel,
  RoundSummary,
  VerificationPanel,
  WalletDisplay,
} from ".";
import React from "react";

const noop = () => undefined;
const noopSubmit = (event: FormEvent) => event.preventDefault();

const wallet: Wallet = {
  id: "wallet-story-player",
  playerId: "player-story",
  balanceCents: 98157,
};

const bettingRound: Round = {
  id: "round-story-betting",
  status: "betting",
  crashMultiplierBps: 46624,
  bets: [
    {
      id: "bet-story-ready",
      playerId: "player-story",
      amountCents: 500,
      status: "pending",
      ready: true,
      autoCashoutMultiplierBps: 18000,
    },
    {
      id: "bet-story-waiting",
      playerId: "player-guest",
      amountCents: 250,
      status: "pending",
      ready: false,
    },
  ],
};

const runningRound: Round = {
  ...bettingRound,
  id: "round-story-running",
  status: "running",
  bets: [
    {
      id: "bet-story-active",
      playerId: "player-story",
      amountCents: 500,
      status: "pending",
      ready: true,
      autoCashoutMultiplierBps: 18000,
    },
  ],
};

const history: ItemsResponse<RoundHistorySummary> = {
  items: [
    {
      id: "round-46624",
      crashMultiplierBps: 46624,
      crashedAt: "2026-06-23T12:00:00.000Z",
      settledAt: "2026-06-23T12:00:02.000Z",
      acceptedBetCount: 4,
      cashedOutBetCount: 2,
      lostBetCount: 2,
      totalWageredCents: 1600,
      totalPayoutCents: 2140,
      verificationAvailable: true,
      notableBets: [],
    },
    {
      id: "round-15300",
      crashMultiplierBps: 15300,
      crashedAt: "2026-06-23T12:01:00.000Z",
      acceptedBetCount: 3,
      cashedOutBetCount: 1,
      lostBetCount: 2,
      totalWageredCents: 1200,
      totalPayoutCents: 720,
      verificationAvailable: true,
      notableBets: [],
    },
  ],
};

const leaderboard: LeaderboardResponse = {
  metric: "payout",
  items: [
    {
      rank: 1,
      playerId: "player-story",
      roundId: "round-46624",
      betId: "bet-story-win",
      amountCents: 500,
      payoutCents: 1800,
      cashoutMultiplierBps: 36000,
      cashoutTrigger: "manual",
      crashMultiplierBps: 46624,
      crashedAt: "2026-06-23T12:00:00.000Z",
    },
    {
      rank: 2,
      playerId: "player-auto",
      roundId: "round-15300",
      betId: "bet-story-auto",
      amountCents: 400,
      payoutCents: 600,
      cashoutMultiplierBps: 15000,
      cashoutTrigger: "auto",
      autoCashoutMultiplierBps: 15000,
      crashMultiplierBps: 15300,
      crashedAt: "2026-06-23T12:01:00.000Z",
    },
  ],
};

const myBets: ItemsResponse<PlayerBetHistoryEntry> = {
  items: [
    {
      roundId: "round-46624",
      betId: "bet-story-win",
      amountCents: 500,
      status: "cashed_out",
      crashMultiplierBps: 46624,
      cashoutMultiplierBps: 36000,
      payoutCents: 1800,
      cashoutTrigger: "manual",
      crashedAt: "2026-06-23T12:00:00.000Z",
    },
    {
      roundId: "round-15300",
      betId: "bet-story-loss",
      amountCents: 400,
      status: "lost",
      crashMultiplierBps: 15300,
      autoCashoutMultiplierBps: 20000,
      crashedAt: "2026-06-23T12:01:00.000Z",
    },
  ],
};

const verification: CompletedRound = {
  id: "round-46624",
  crashMultiplierBps: 46624,
  serverSeedHash: "1d9c97e2f0b61af6e6fc4f4ff4ea2b3277cc2b1b5e48d7a77bb4a589fb4f8e90",
  serverSeed: "demo-server-seed",
  nonce: "story-0001",
  houseEdgeBps: 100,
  formula: {
    commitmentAlgorithm: "sha256",
    crashAlgorithm: "hmac-sha256",
    multiplierScale: "basis_points",
  },
  crashedAt: "2026-06-23T12:00:00.000Z",
};

const meta = {
  title: "Goat Run/Game Panels",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const BettingOpen: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <BettingControls
        amountCents={500}
        autoBetAccumulatedLossCents={300}
        autoBetCurrentAmountCents={1000}
        autoBetEnabled={true}
        autoBetStopLossCents={2500}
        autoBetStrategy={"martingale" as AutoBetStrategy}
        autoCashoutEnabled={true}
        autoCashoutMultiplierBps={18000}
        autoCashoutTarget="1.80"
        authoritativeMultiplierBps={13500}
        cashoutState="idle"
        hasAcceptedBet={false}
        myBet={undefined}
        myBetNeedsReady={false}
        placeBetError={undefined}
        placeBetPending={false}
        readyError={undefined}
        readyPending={false}
        round={bettingRound}
        onAmountChange={noop}
        onAutoBetEnabledChange={noop}
        onAutoBetStopLossChange={noop}
        onAutoBetStrategyChange={noop}
        onAutoCashoutEnabledChange={noop}
        onAutoCashoutTargetChange={noop}
        onBetSubmit={noopSubmit}
        onCashout={noop}
        onReady={noop}
      />
    </div>
  ),
};

export const CashoutPending: Story = {
  render: () => (
    <div style={{ maxWidth: 420 }}>
      <BettingControls
        amountCents={500}
        autoBetAccumulatedLossCents={0}
        autoBetCurrentAmountCents={500}
        autoBetEnabled={false}
        autoBetStopLossCents={2500}
        autoBetStrategy={"fixed" as AutoBetStrategy}
        autoCashoutEnabled={false}
        autoCashoutMultiplierBps={undefined}
        autoCashoutTarget="1.50"
        authoritativeMultiplierBps={16200}
        cashoutState="pending"
        hasAcceptedBet={true}
        myBet={runningRound.bets[0]}
        myBetNeedsReady={false}
        placeBetError={undefined}
        placeBetPending={false}
        readyError={undefined}
        readyPending={false}
        round={runningRound}
        onAmountChange={noop}
        onAutoBetEnabledChange={noop}
        onAutoBetStopLossChange={noop}
        onAutoBetStrategyChange={noop}
        onAutoCashoutEnabledChange={noop}
        onAutoCashoutTargetChange={noop}
        onBetSubmit={noopSubmit}
        onCashout={noop}
        onReady={noop}
      />
    </div>
  ),
};

export const WalletStates: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <WalletDisplay
        wallet={wallet}
        showBalance={true}
        socketStatus="connected"
        onToggleBalance={noop}
      />
      <WalletDisplay
        wallet={wallet}
        showBalance={false}
        socketStatus="connecting"
        onToggleBalance={noop}
      />
    </div>
  ),
};

export const ReadModels: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
      <LeaderboardPanel leaderboard={leaderboard} />
      <MyBetsPanel myBets={myBets} />
      <VerificationPanel verification={verification} />
      <RoundSummary isLoading={false} round={bettingRound} />
      <CurrentBetsPanel round={bettingRound} />
      <HistoryPanel history={history} />
    </div>
  ),
};
