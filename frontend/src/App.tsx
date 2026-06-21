import { FormEvent, useEffect, useMemo, useState } from "react";
import { GameScene } from "./components/GameScene";
import { useGame } from "./hooks/use-game";
import {
  beginKeycloakLogin,
  completeKeycloakLoginFromCallback,
  getAccessToken,
  getAuthMode,
  getCurrentPlayerId,
  getPlayerId,
  isDevAuthMode,
  setAccessToken,
  setPlayerId,
} from "./services/auth";
import { useGameStore } from "./stores/game-store";

function cents(value: number): string {
  return `$${(value / 100).toFixed(2)}`;
}

function multiplier(value: number): string {
  return `${(value / 10000).toFixed(2)}x`;
}

export function App() {
  const authMode = getAuthMode();
  const [isCompletingLogin, setIsCompletingLogin] = useState(authMode === "keycloak");
  const [hasToken, setHasToken] = useState(Boolean(getAccessToken()));

  useEffect(() => {
    if (authMode !== "keycloak") {
      setIsCompletingLogin(false);
      return;
    }

    void completeKeycloakLoginFromCallback()
      .then((completed) => {
        setHasToken(Boolean(getAccessToken()) || completed);
      })
      .finally(() => setIsCompletingLogin(false));
  }, [authMode]);

  if (authMode === "keycloak" && isCompletingLogin) {
    return (
      <main className="auth-screen">
        <section className="panel auth-panel">
          <h1>Jungle Crash</h1>
          <p>Completing Keycloak login...</p>
        </section>
      </main>
    );
  }

  if (authMode === "keycloak" && !hasToken) {
    return (
      <main className="auth-screen">
        <section className="panel auth-panel">
          <p>Jungle Crash</p>
          <h1>Mountain Run</h1>
          <button onClick={() => void beginKeycloakLogin()}>Login with Keycloak</button>
        </section>
      </main>
    );
  }

  return <AuthenticatedGame />;
}

function AuthenticatedGame() {
  const isDevMode = isDevAuthMode();
  const [amountCents, setAmountCents] = useState(100);
  const [playerInput, setPlayerInput] = useState(getPlayerId());
  const [tokenInput, setTokenInput] = useState("");
  const {
    roundQuery,
    walletQuery,
    historyQuery,
    myBetsQuery,
    verificationQuery,
    placeBetMutation,
    cashoutMutation,
    startMutation,
    crashMutation,
    settleMutation,
  } = useGame();
  const round = useGameStore((state) => state.round);
  const cashoutState = useGameStore((state) => state.cashoutState);
  const socketStatus = useGameStore((state) => state.socketStatus);
  const displayedMultiplierBps = useGameStore((state) => state.displayedMultiplierBps);
  const playerId = getCurrentPlayerId();
  const myBet = useMemo(
    () => round?.bets.find((bet) => bet.playerId === playerId),
    [playerId, round],
  );

  const onBet = (event: FormEvent) => {
    event.preventDefault();
    placeBetMutation.mutate(amountCents);
  };

  return (
    <main>
      <header className="topbar">
        <div>
          <p>Jungle Crash</p>
          <h1>Mountain Run</h1>
        </div>
        <div className="wallet">
          <span>{isDevMode ? playerId : "Keycloak"} / {socketStatus}</span>
          <strong>{walletQuery.data ? cents(walletQuery.data.balanceCents) : "..."}</strong>
          <small>{isDevMode ? "Dev identity" : "Keycloak identity"}</small>
        </div>
      </header>

      <div className="layout">
        <GameScene />

        <section className="panel controls">
          <h2>Bet</h2>
          {isDevMode ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                setPlayerId(playerInput);
                setAccessToken(tokenInput);
                window.location.reload();
              }}
            >
              <label>
                Player / JWT subject
                <input
                  value={playerInput}
                  onChange={(event) => setPlayerInput(event.target.value)}
                />
              </label>
              <label>
                Bearer token
                <input
                  value={tokenInput}
                  onChange={(event) => setTokenInput(event.target.value)}
                  placeholder="Optional access token"
                />
              </label>
              <button>Use dev identity</button>
            </form>
          ) : null}
          <form onSubmit={onBet}>
            <label>
              Amount
              <input
                min={100}
                max={100000}
                step={100}
                type="number"
                value={amountCents}
                onChange={(event) => setAmountCents(Number(event.target.value))}
              />
            </label>
            <button disabled={round?.status !== "betting" || placeBetMutation.isPending}>
              Place bet
            </button>
          </form>
          <button
            className="cashout"
            disabled={round?.status !== "running" || !myBet || myBet.status !== "pending"}
            onClick={() => cashoutMutation.mutate(displayedMultiplierBps)}
          >
            Cash out {myBet ? cents(Math.floor((myBet.amountCents * displayedMultiplierBps) / 10000)) : ""}
          </button>
          <p className={`status ${cashoutState}`}>Cashout: {cashoutState}</p>
          {isDevMode ? (
            <div className="dev-controls">
              <button onClick={() => startMutation.mutate()} disabled={round?.status !== "betting"}>
                Start
              </button>
              <button onClick={() => crashMutation.mutate()} disabled={round?.status !== "running"}>
                Crash
              </button>
              <button onClick={() => settleMutation.mutate()} disabled={round?.status !== "crashed"}>
                Next
              </button>
            </div>
          ) : null}
        </section>

        <section className="panel">
          <h2>Round</h2>
          {roundQuery.isLoading ? <p>Loading round...</p> : null}
          <dl>
            <dt>Round</dt>
            <dd>{round?.id}</dd>
            <dt>Phase</dt>
            <dd>{round?.status}</dd>
            <dt>Crash point</dt>
            <dd>{round ? multiplier(round.crashMultiplierBps) : "..."}</dd>
          </dl>
        </section>

        <section className="panel bets">
          <h2>Current bets</h2>
          {round?.bets.length ? (
            <ul>
              {round.bets.map((bet) => (
                <li key={bet.id}>
                  <span>{bet.playerId}</span>
                  <strong>{cents(bet.amountCents)}</strong>
                  <em>{bet.status}</em>
                </li>
              ))}
            </ul>
          ) : (
            <p>No bets yet.</p>
          )}
        </section>

        <section className="panel bets">
          <h2>History</h2>
          {historyQuery.data?.items.length ? (
            <ul>
              {historyQuery.data.items.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <span>{item.id}</span>
                  <strong>{multiplier(item.crashMultiplierBps)}</strong>
                  <em>{new Date(item.crashedAt).toLocaleTimeString()}</em>
                </li>
              ))}
            </ul>
          ) : (
            <p>No completed rounds yet.</p>
          )}
        </section>

        <section className="panel bets">
          <h2>My bets</h2>
          {myBetsQuery.data?.items.length ? (
            <ul>
              {myBetsQuery.data.items.map((item) => {
                const bet = item.bets.find((candidate) => candidate.playerId === playerId);
                return (
                  <li key={item.id}>
                    <span>{item.id}</span>
                    <strong>{bet ? cents(bet.amountCents) : "-"}</strong>
                    <em>{bet?.status ?? "none"}</em>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No player bets yet.</p>
          )}
        </section>

        <section className="panel verify">
          <h2>Verification</h2>
          {verificationQuery.data ? (
            <dl>
              <dt>Round</dt>
              <dd>{verificationQuery.data.id}</dd>
              <dt>Seed hash</dt>
              <dd>{verificationQuery.data.serverSeedHash}</dd>
              <dt>Seed</dt>
              <dd>{verificationQuery.data.serverSeed}</dd>
              <dt>Nonce</dt>
              <dd>{verificationQuery.data.nonce}</dd>
              <dt>Formula</dt>
              <dd>
                {verificationQuery.data.formula.commitmentAlgorithm} /{" "}
                {verificationQuery.data.formula.crashAlgorithm}
              </dd>
            </dl>
          ) : (
            <p>Complete a round to reveal verification data.</p>
          )}
        </section>
      </div>
    </main>
  );
}
