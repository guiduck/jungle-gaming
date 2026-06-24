import {
  BettingControls,
  CurrentBetsPanel,
  HistoryPanel,
  LeaderboardPanel,
  MyBetsPanel,
  RoundSummary,
  VerificationPanel,
  WalletDisplay,
} from "../game-panels";
import { CommandModal } from "../CommandModal";
import { DialogueSystem } from "../DialogueSystem";
import { GameScene } from "../GameScene";
import { useAuthenticatedGame } from "./use-authenticated-game";

export function AuthenticatedGame() {
  const game = useAuthenticatedGame();

  return (
    <main data-smoke="authenticated-shell">
      <header className="topbar">
        <div>
          <p>Goat Run</p>
          <h1>Goat Run</h1>
        </div>
        <div className="top-actions">
          <button
            className="secondary-button command-top-button"
            data-smoke="show-commands"
            onClick={game.onOpenCommands}
          >
            <span>Mostrar comandos</span>
            <span className="command-shortcut-hint">(H)</span>
          </button>
          <WalletDisplay
            wallet={game.wallet}
            showBalance={game.showBalance}
            socketStatus={game.socketStatus}
            onToggleBalance={game.onToggleBalance}
          />
        </div>
      </header>

      <div className="layout">
        <div className="primary-column">
          <GameScene />

          <div className="insights-grid" aria-label="Leituras da rodada">
            <LeaderboardPanel leaderboard={game.leaderboard} />
            <MyBetsPanel myBets={game.myBets} />
            <VerificationPanel verification={game.verification} />
          </div>
        </div>

        <aside className="right-rail" aria-label="Controles do jogo e leituras da rodada">
          <BettingControls
            amountCents={game.amountCents}
            autoBetAccumulatedLossCents={game.autoBetConfig.accumulatedLossCents}
            autoBetCurrentAmountCents={game.autoBetConfig.currentAmountCents}
            autoBetEnabled={game.autoBetConfig.enabled}
            autoBetStopLossCents={game.autoBetConfig.stopLossCents}
            autoBetStrategy={game.autoBetConfig.strategy}
            autoCashoutEnabled={game.autoCashoutEnabled}
            autoCashoutMultiplierBps={game.autoCashoutMultiplierBps}
            autoCashoutTarget={game.autoCashoutTarget}
            authoritativeMultiplierBps={game.authoritativeMultiplierBps}
            cashoutState={game.cashoutState}
            hasAcceptedBet={game.hasAcceptedBet}
            myBet={game.myBet}
            myBetNeedsReady={game.myBetNeedsReady}
            placeBetError={game.placeBetError}
            placeBetPending={game.placeBetPending}
            readyError={game.readyError}
            readyPending={game.readyPending}
            round={game.round}
            onAmountChange={game.onAmountChange}
            onAutoBetEnabledChange={game.onAutoBetEnabledChange}
            onAutoBetStopLossChange={game.onAutoBetStopLossChange}
            onAutoBetStrategyChange={game.onAutoBetStrategyChange}
            onAutoCashoutEnabledChange={game.onAutoCashoutEnabledChange}
            onAutoCashoutTargetChange={game.onAutoCashoutTargetChange}
            onBetSubmit={game.onBet}
            onCashout={game.cashoutCurrentBet}
            onReady={game.onReady}
          />
          <RoundSummary isLoading={game.isRoundLoading} round={game.round} />
          <CurrentBetsPanel round={game.round} />
          <HistoryPanel history={game.history} />
        </aside>
      </div>
      <DialogueSystem />
      <CommandModal isOpen={game.showCommands} onClose={game.onCloseCommands} />
    </main>
  );
}
