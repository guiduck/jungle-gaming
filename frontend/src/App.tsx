import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CommandModal } from "./components/CommandModal";
import { DialogueSystem } from "./components/DialogueSystem";
import { GameScene } from "./components/GameScene";
import { useGame } from "./hooks/use-game";
import { useShortcut } from "./hooks/use-shortcut";
import {
  AUTH_REQUIRED_EVENT,
  type AuthRequiredDetail,
  beginKeycloakLogin,
  completeKeycloakLoginFromCallback,
  getAccessToken,
  getCurrentPlayerId,
} from "./services/auth";
import { formatMultiplierBps, parseMultiplierInputToBps } from "./services/auto-cashout";
import { betOutcomeLabel, formatCents, shortPlayerId } from "./services/read-model-display";
import { useDialogueStore } from "./stores/dialogue-store";
import { useGameStore } from "./stores/game-store";

function cents(value: number): string {
  return formatCents(value);
}

function multiplier(value: number): string {
  return formatMultiplierBps(value);
}

const BALANCE_VISIBLE_KEY = "jungle.walletBalanceVisible";
const LOGIN_REDIRECT_SECONDS = 10;

function readBalanceVisibility(): boolean {
  return localStorage.getItem(BALANCE_VISIBLE_KEY) !== "false";
}

function phaseLabel(status: string | undefined): string {
  switch (status) {
    case "betting":
      return "apostas";
    case "running":
      return "subindo";
    case "crashed":
      return "crash";
    case "settled":
      return "encerrada";
    default:
      return "carregando";
  }
}

function cashoutStateLabel(status: string): string {
  switch (status) {
    case "idle":
      return "ocioso";
    case "pending":
      return "pendente";
    case "accepted":
      return "aceito";
    case "rejected":
      return "rejeitado";
    default:
      return status;
  }
}

function socketStatusLabel(status: string): string {
  switch (status) {
    case "connecting":
      return "conectando";
    case "connected":
      return "conectado";
    case "disconnected":
      return "desconectado";
    default:
      return status;
  }
}

function cashoutTriggerLabel(trigger: string | undefined): string {
  switch (trigger) {
    case "manual":
      return "manual";
    case "auto":
      return "automatico";
    default:
      return "saque";
  }
}

const tutorialDialogues = [
  {
    id: "tutorial-bet",
    speakerName: "Nina, a cabra alpinista",
    text:
      "Primeiro, espere a fase de apostas. Escolha o valor, ligue o saque automatico se quiser, e coloque a aposta antes da subida comecar.",
  },
  {
    id: "tutorial-run",
    speakerName: "Nina, a cabra alpinista",
    text:
      "Quando a rodada estiver subindo, o multiplicador sobe comigo. Saque antes do crash para transformar a escalada em pagamento.",
  },
  {
    id: "tutorial-verify",
    speakerName: "Nina, a cabra alpinista",
    text:
      "Depois da queda, confira historico, ranking, suas apostas e a verificacao provably fair. Agora vou abrir os comandos do teclado.",
    actionLabel: "Mostrar comandos",
  },
];

type PlayerBetDialogueState = "none" | "pending" | "cashed_out" | "lost";

function phaseDialogue(
  status: string | undefined,
  cashoutState: string,
  playerBetState: PlayerBetDialogueState,
) {
  if (playerBetState === "cashed_out" && cashoutState === "accepted") {
    return {
      id: "cashout-accepted-cashed-out",
      speakerName: "Nina, a cabra alpinista",
      text: "Belo saque. Guardamos o folego, garantimos o pagamento e seguimos para a proxima trilha.",
      autoCloseDelayMs: 3600,
    };
  }

  if (playerBetState === "pending" && cashoutState === "rejected") {
    return {
      id: "cashout-rejected-pending",
      speakerName: "Nina, a cabra alpinista",
      text: "Esse saque nao passou pelo servidor. Vamos esperar a proxima janela boa e tentar de novo.",
      autoCloseDelayMs: 3600,
    };
  }

  if (status === "betting") {
    if (playerBetState === "pending") {
      return {
        id: "phase-betting-pending",
        speakerName: "Nina, a cabra alpinista",
        text: "A aposta esta pronta no acampamento. Agora e esperar a largada e escolher bem o saque.",
        autoCloseDelayMs: 4200,
      };
    }

    return {
      id: "phase-betting-none",
      speakerName: "Nina, a cabra alpinista",
      text: "A trilha abriu. Escolha uma aposta e me mande para a subida quando estiver pronto.",
      autoCloseDelayMs: 4200,
    };
  }

  if (status === "running") {
    if (playerBetState === "pending") {
      return {
        id: "phase-running-pending",
        speakerName: "Nina, a cabra alpinista",
        text: "La vamos nos. Se o multiplicador ja estiver bom, saque antes que a montanha cobre o preco.",
        autoCloseDelayMs: 4200,
      };
    }

    if (playerBetState === "cashed_out") {
      return {
        id: "phase-running-cashed-out",
        speakerName: "Nina, a cabra alpinista",
        text: "Saque garantido. Agora da para assistir a subida sem pressa e torcer pela cabra.",
        autoCloseDelayMs: 4200,
      };
    }

    return {
      id: "phase-running-none",
      speakerName: "Nina, a cabra alpinista",
      text: "A Nina ja esta subindo nesta rodada. Sem aposta ativa, observe a curva e prepare a proxima entrada.",
      autoCloseDelayMs: 4200,
    };
  }

  if (status === "crashed") {
    if (playerBetState === "cashed_out") {
      return {
        id: "phase-crashed-cashed-out",
        speakerName: "Nina, a cabra alpinista",
        text: "Crash, mas seu saque ja estava seguro. Bela leitura da montanha.",
        autoCloseDelayMs: 4200,
      };
    }

    if (playerBetState === "lost") {
      return {
        id: "phase-crashed-lost",
        speakerName: "Nina, a cabra alpinista",
        text: "Crash. Essa aposta ficou na encosta, mas a proxima trilha ja vem ai.",
        autoCloseDelayMs: 4200,
      };
    }

    return {
      id: "phase-crashed-none",
      speakerName: "Nina, a cabra alpinista",
      text: "Crash. Rodada encerrada; confira o ponto revelado e prepare a proxima tentativa.",
      autoCloseDelayMs: 4200,
    };
  }

  return undefined;
}

export function App() {
  const [isCompletingLogin, setIsCompletingLogin] = useState(true);
  const [hasToken, setHasToken] = useState(Boolean(getAccessToken()));
  const [loginCountdown, setLoginCountdown] = useState(LOGIN_REDIRECT_SECONDS);
  const [loginReason, setLoginReason] = useState("Sua sessao nao foi encontrada.");
  const loginStartedRef = useRef(false);
  const startLogin = useCallback(() => {
    if (loginStartedRef.current) {
      return;
    }

    loginStartedRef.current = true;
    setLoginReason("Abrindo login seguro no Keycloak...");
    void beginKeycloakLogin().catch((error) => {
      loginStartedRef.current = false;
      setLoginCountdown(LOGIN_REDIRECT_SECONDS);
      setLoginReason(error instanceof Error ? error.message : "Nao foi possivel abrir o Keycloak.");
    });
  }, []);

  useEffect(() => {
    void completeKeycloakLoginFromCallback()
      .then((completed) => {
        setHasToken(Boolean(getAccessToken()) || completed);
      })
      .catch((error) => {
        setLoginReason(error instanceof Error ? error.message : "Nao foi possivel concluir o login.");
        setHasToken(false);
      })
      .finally(() => setIsCompletingLogin(false));
  }, []);

  useEffect(() => {
    const handleAuthRequired = (event: Event) => {
      const detail = (event as CustomEvent<AuthRequiredDetail>).detail;
      loginStartedRef.current = false;
      setLoginReason(detail?.reason ?? "Sua sessao expirou ou nao foi encontrada.");
      setHasToken(false);
      setIsCompletingLogin(false);
    };

    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
  }, []);

  useEffect(() => {
    if (isCompletingLogin || hasToken) {
      return;
    }

    setLoginCountdown(LOGIN_REDIRECT_SECONDS);
    const timer = window.setInterval(() => {
      setLoginCountdown((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          startLogin();
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [hasToken, isCompletingLogin, startLogin]);

  if (isCompletingLogin) {
    return (
      <main className="auth-screen">
        <section className="panel auth-panel">
          <h1>Jungle Crash</h1>
          <p>Concluindo login Keycloak...</p>
        </section>
      </main>
    );
  }

  if (!hasToken) {
    return (
      <main className="auth-screen">
        <section className="auth-hero">
          <p>Jungle Crash</p>
          <h1>Subida da Montanha</h1>
          <span>Ajude a cabra Nina a subir a montanha sem perder o momento certo do saque.</span>
        </section>
        <section
          className="panel auth-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Login do Jungle Crash"
          data-smoke="login-required-modal"
        >
          <p>Acampamento base</p>
          <h2>Voce nao esta logado</h2>
          <span>{loginReason}</span>
          <span>A sessao segura continua com Keycloak + PKCE.</span>
          <strong className="auth-countdown">
            Redirecionamento automatico em {loginCountdown}s
          </strong>
          <button data-smoke="keycloak-login-button" onClick={startLogin}>Entrar com Keycloak agora</button>
          <small>Usuario local do desafio: player / player123</small>
        </section>
      </main>
    );
  }

  return <AuthenticatedGame />;
}

function AuthenticatedGame() {
  const [amountCents, setAmountCents] = useState(100);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoCashoutTarget, setAutoCashoutTarget] = useState("1.50");
  const [showCommands, setShowCommands] = useState(false);
  const [showBalance, setShowBalance] = useState(readBalanceVisibility);
  const {
    roundQuery,
    walletQuery,
    historyQuery,
    leaderboardQuery,
    myBetsQuery,
    verificationQuery,
    placeBetMutation,
    cashoutMutation,
    readyMutation,
  } = useGame();
  const round = useGameStore((state) => state.round);
  const cashoutState = useGameStore((state) => state.cashoutState);
  const socketStatus = useGameStore((state) => state.socketStatus);
  const authoritativeMultiplierBps = useGameStore((state) => state.authoritativeMultiplierBps);
  const showSequence = useDialogueStore((state) => state.showSequence);
  const showLine = useDialogueStore((state) => state.showLine);
  const forceCloseDialogue = useDialogueStore((state) => state.forceClose);
  const tutorialCompleted = useDialogueStore((state) => state.tutorialCompleted);
  const shouldOpenCommands = useDialogueStore((state) => state.shouldOpenCommands);
  const consumeCommandPrompt = useDialogueStore((state) => state.consumeCommandPrompt);
  const playerId = getCurrentPlayerId();
  const lastPhaseDialogueId = useRef<string | undefined>(undefined);
  const tutorialStartedRef = useRef(false);
  const myBet = useMemo(
    () => round?.bets.find((bet) => bet.playerId === playerId),
    [playerId, round],
  );
  const playerBetDialogueState: PlayerBetDialogueState = myBet?.status ?? "none";
  const autoCashoutMultiplierBps = autoCashoutEnabled
    ? parseMultiplierInputToBps(autoCashoutTarget)
    : undefined;
  const hasAcceptedBet = Boolean(myBet);
  const myBetNeedsReady = round?.status === "betting" && Boolean(myBet) && !myBet?.ready;

  const onBet = (event: FormEvent) => {
    event.preventDefault();
    if (
      round?.status !== "betting" ||
      hasAcceptedBet ||
      placeBetMutation.isPending ||
      (autoCashoutEnabled && autoCashoutMultiplierBps === null)
    ) {
      return;
    }

    placeBetMutation.mutate({
      amountCents,
      autoCashoutMultiplierBps: autoCashoutMultiplierBps ?? null,
    });
  };

  const submitBetFromShortcut = useCallback(() => {
    if (
      round?.status !== "betting" ||
      hasAcceptedBet ||
      placeBetMutation.isPending ||
      (autoCashoutEnabled && autoCashoutMultiplierBps === null)
    ) {
      return;
    }

    placeBetMutation.mutate({
      amountCents,
      autoCashoutMultiplierBps: autoCashoutMultiplierBps ?? null,
    });
  }, [
    amountCents,
    autoCashoutEnabled,
    autoCashoutMultiplierBps,
    hasAcceptedBet,
    placeBetMutation,
    round?.status,
  ]);

  const cashoutFromShortcut = useCallback(() => {
    if (round?.status !== "running" || !myBet || myBet.status !== "pending") {
      return;
    }

    cashoutMutation.mutate(authoritativeMultiplierBps);
  }, [authoritativeMultiplierBps, cashoutMutation, myBet, round?.status]);

  useEffect(() => {
    if (!tutorialCompleted && round && !tutorialStartedRef.current) {
      tutorialStartedRef.current = true;
      showSequence("tutorial", tutorialDialogues);
    }
  }, [round, showSequence, tutorialCompleted]);

  useEffect(() => {
    if (shouldOpenCommands) {
      setShowCommands(true);
      consumeCommandPrompt();
    }
  }, [consumeCommandPrompt, shouldOpenCommands]);

  useEffect(() => {
    if (!tutorialCompleted) {
      return;
    }

    const line = phaseDialogue(round?.status, cashoutState, playerBetDialogueState);
    if (!line || lastPhaseDialogueId.current === line.id) {
      return;
    }

    lastPhaseDialogueId.current = line.id;
    showLine(line);
  }, [cashoutState, playerBetDialogueState, round?.status, showLine, tutorialCompleted]);

  const shortcuts = useMemo(
    () => [
      {
        key: "h",
        handler: () => setShowCommands((isOpen) => !isOpen),
      },
      {
        key: "b",
        handler: submitBetFromShortcut,
        options: { debounce: 150 },
      },
      {
        key: "c",
        handler: cashoutFromShortcut,
        options: { allowInInputs: true, debounce: 150 },
      },
      {
        key: "a",
        handler: () => {
          if (!hasAcceptedBet) {
            setAutoCashoutEnabled((enabled) => !enabled);
          }
        },
      },
      {
        key: "[",
        handler: () => setAmountCents((value) => Math.max(100, value - 100)),
        options: { debounce: 80 },
      },
      {
        key: "]",
        handler: () => setAmountCents((value) => Math.min(100000, value + 100)),
        options: { debounce: 80 },
      },
      {
        key: "Escape",
        handler: () => {
          if (showCommands) {
            setShowCommands(false);
            return;
          }

          forceCloseDialogue();
        },
      },
    ],
    [cashoutFromShortcut, forceCloseDialogue, hasAcceptedBet, showCommands, submitBetFromShortcut],
  );

  useShortcut(shortcuts);

  const toggleBalanceVisibility = () => {
    setShowBalance((isVisible) => {
      const nextValue = !isVisible;
      localStorage.setItem(BALANCE_VISIBLE_KEY, String(nextValue));
      return nextValue;
    });
  };

  return (
    <main data-smoke="authenticated-shell">
      <header className="topbar">
        <div>
          <p>Jungle Crash</p>
          <h1>Subida da Montanha</h1>
        </div>
        <div className="top-actions">
          <button
            className="secondary-button command-top-button"
            data-smoke="show-commands"
            onClick={() => setShowCommands(true)}
          >
            Show commands
          </button>
          <div className="wallet" data-smoke="wallet-display">
            <span data-smoke="websocket-status">Keycloak / {socketStatusLabel(socketStatus)}</span>
            <div className="wallet-balance-row">
              <strong>{walletQuery.data ? (showBalance ? cents(walletQuery.data.balanceCents) : "••••••") : "..."}</strong>
              <button
                className="eye-button"
                type="button"
                onClick={toggleBalanceVisibility}
                aria-label={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
                title={showBalance ? "Ocultar saldo" : "Mostrar saldo"}
              >
                <span
                  className={`eye-glyph ${showBalance ? "visible" : "hidden"}`}
                  aria-hidden="true"
                />
              </button>
            </div>
            <small>Identidade Keycloak</small>
          </div>
        </div>
      </header>

      <div className="layout">
        <div className="primary-column">
          <GameScene />

          <div className="insights-grid" aria-label="Leituras da rodada">
            <section className="panel bets leaderboard-panel" data-smoke="leaderboard-panel">
              <h2>Ranking</h2>
              {leaderboardQuery.data?.items.length ? (
                <ul>
                  {leaderboardQuery.data.items.map((entry) => (
                    <li key={`${entry.roundId}:${entry.betId}`}>
                      <span>#{entry.rank} {shortPlayerId(entry.playerId)}</span>
                      <strong>{cents(entry.payoutCents)}</strong>
                      <em>{multiplier(entry.cashoutMultiplierBps)}</em>
                      <small>{cashoutTriggerLabel(entry.cashoutTrigger)} / {entry.roundId}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum saque vencedor ainda.</p>
              )}
            </section>

            <section className="panel bets my-bets-panel" data-smoke="my-bets-panel">
              <h2>Minhas apostas</h2>
              {myBetsQuery.data?.items.length ? (
                <ul>
                  {myBetsQuery.data.items.map((item) => {
                    return (
                      <li key={`${item.roundId}:${item.betId}`}>
                        <span>{item.roundId}</span>
                        <strong>{cents(item.amountCents)}</strong>
                        <em>{betOutcomeLabel(item)}</em>
                        <small>
                          {multiplier(item.crashMultiplierBps)}
                          {item.payoutCents ? ` / ${cents(item.payoutCents)}` : ""}
                        </small>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>Nenhuma aposta do jogador ainda.</p>
              )}
            </section>

            <section className="panel verify" data-smoke="verification-panel">
              <h2>Verificacao</h2>
              {verificationQuery.data ? (
                <dl>
                  <dt>Rodada</dt>
                  <dd>{verificationQuery.data.id}</dd>
                  <dt>Hash da seed</dt>
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
                <p>Complete uma rodada para revelar os dados de verificacao.</p>
              )}
            </section>
          </div>
        </div>

        <aside className="right-rail" aria-label="Controles do jogo e leituras da rodada">
          <section className="panel controls" data-smoke="betting-controls">
          <h2>Aposta</h2>
          <form onSubmit={onBet}>
            <label>
              Valor
              <input
                min={100}
                max={100000}
                step={100}
                type="number"
                value={amountCents}
                onChange={(event) => setAmountCents(Number(event.target.value))}
              />
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={autoCashoutEnabled}
                disabled={hasAcceptedBet}
                onChange={(event) => setAutoCashoutEnabled(event.target.checked)}
              />
              Saque automatico
            </label>
            {autoCashoutEnabled ? (
              <label>
                Alvo
                <input
                  min={1.1}
                  max={100}
                  step={0.05}
                  type="number"
                  value={autoCashoutTarget}
                  disabled={hasAcceptedBet}
                  onChange={(event) => setAutoCashoutTarget(event.target.value)}
                />
              </label>
            ) : null}
            <button
              disabled={
                round?.status !== "betting" ||
                hasAcceptedBet ||
                placeBetMutation.isPending ||
                (autoCashoutEnabled && autoCashoutMultiplierBps === null)
              }
            >
              {placeBetMutation.isPending ? "Confirmando..." : hasAcceptedBet ? "Aposta ativa" : "Apostar"}
            </button>
          </form>
          {myBetNeedsReady ? (
            <button
              className="ready-button"
              disabled={readyMutation.isPending}
              onClick={() => readyMutation.mutate()}
            >
              {readyMutation.isPending ? "Marcando..." : "Pronto para comecar"}
            </button>
          ) : null}
          {round?.status === "betting" && myBet?.ready ? (
            <p className="status accepted">Pronto confirmado. Aguardando outros apostadores.</p>
          ) : null}
          {readyMutation.isError ? (
            <p className="status rejected">
              {readyMutation.error instanceof Error
                ? readyMutation.error.message
                : "Nao foi possivel marcar pronto."}
            </p>
          ) : null}
          {placeBetMutation.isError ? (
            <p className="status rejected">
              {placeBetMutation.error instanceof Error
                ? placeBetMutation.error.message
                : "Nao foi possivel colocar a aposta."}
            </p>
          ) : null}
          {myBet?.autoCashoutMultiplierBps && myBet.status === "pending" ? (
            <p className="status">Alvo automatico: {multiplier(myBet.autoCashoutMultiplierBps)}</p>
          ) : null}
          <button
            className="cashout"
            disabled={round?.status !== "running" || !myBet || myBet.status !== "pending"}
            onClick={() => cashoutMutation.mutate(authoritativeMultiplierBps)}
          >
            Sacar {myBet ? cents(Math.floor((myBet.amountCents * authoritativeMultiplierBps) / 10000)) : ""}
          </button>
          <p className={`status ${cashoutState}`}>Saque: {cashoutStateLabel(cashoutState)}</p>
          </section>

          <section className="panel round-summary" data-smoke="round-phase">
            <h2>Rodada</h2>
            {roundQuery.isLoading ? <p>Carregando rodada...</p> : null}
            <dl>
              <dt>Rodada</dt>
              <dd>{round?.id}</dd>
              <dt>Fase</dt>
              <dd>{phaseLabel(round?.status)}</dd>
              <dt>Ponto de crash</dt>
              <dd>{round ? multiplier(round.crashMultiplierBps) : "..."}</dd>
            </dl>
          </section>

          <section className="panel bets current-bets" data-smoke="current-bets">
            <h2>Apostas atuais</h2>
            {round?.bets.length ? (
              <ul>
                {round.bets.map((bet) => (
                  <li key={bet.id}>
                    <span>{bet.playerId}</span>
                    <strong>{cents(bet.amountCents)}</strong>
                    <em>{betOutcomeLabel(bet)}</em>
                    {round.status === "betting" ? (
                      <small>{bet.ready ? "pronto" : "aguardando pronto"}</small>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma aposta ainda.</p>
            )}
          </section>

          <section className="panel bets history-panel" data-smoke="history-panel">
            <h2>Historico</h2>
            {historyQuery.data?.items.length ? (
              <ul>
                {historyQuery.data.items.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <span>{item.id}</span>
                    <strong>{multiplier(item.crashMultiplierBps)}</strong>
                    <em>
                      {item.acceptedBetCount} apostas / {cents(item.totalPayoutCents)}
                    </em>
                    <small>
                      {item.cashedOutBetCount} saques, {item.lostBetCount} perdidas
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Nenhuma rodada concluida ainda.</p>
            )}
          </section>
        </aside>
      </div>
      <DialogueSystem />
      <CommandModal isOpen={showCommands} onClose={() => setShowCommands(false)} />
    </main>
  );
}
