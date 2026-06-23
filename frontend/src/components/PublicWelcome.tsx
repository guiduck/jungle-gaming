import { useEffect, useRef } from "react";
import { welcomeDialogues } from "../game-dialogues";
import { useDialogueStore } from "../stores/dialogue-store";
import { DialogueSystem } from "./DialogueSystem";

export interface PublicWelcomeProps {
  isLoginRequired: boolean;
  loginCountdown: number;
  loginReason: string;
  onLogin: () => void;
}

export function PublicWelcome({
  isLoginRequired,
  loginCountdown,
  loginReason,
  onLogin,
}: PublicWelcomeProps) {
  const showSequence = useDialogueStore((state) => state.showSequence);
  const welcomeCompleted = useDialogueStore((state) => state.welcomeCompleted);
  const welcomeStartedRef = useRef(false);

  useEffect(() => {
    if (welcomeCompleted || welcomeStartedRef.current) {
      return;
    }

    welcomeStartedRef.current = true;
    showSequence("welcome", welcomeDialogues);
  }, [showSequence, welcomeCompleted]);

  return (
    <main className="auth-screen" data-smoke="public-welcome">
      <section className="auth-hero">
        <p>Goat Run</p>
        <h1>Goat Run</h1>
        <span>Ajude a cabra Nina a subir a montanha sem perder o momento certo do saque.</span>
      </section>

      {isLoginRequired ? (
        <section
          className="panel auth-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Login do Goat Run"
          data-smoke="login-required-modal"
        >
          <p>Acampamento base</p>
          <h2>Voce nao esta logado</h2>
          <span>{loginReason}</span>
          <span>A sessao segura continua com Keycloak + PKCE.</span>
          <strong className="auth-countdown">
            Redirecionamento automatico em {loginCountdown}s
          </strong>
          <button data-smoke="keycloak-login-button" onClick={onLogin}>
            Entrar com Keycloak agora
          </button>
          <small>Usuario local do desafio: player / player123</small>
        </section>
      ) : (
        <section
          className="welcome-modal"
          role="dialog"
          aria-modal="false"
          aria-label="Boas-vindas do Goat Run"
          data-smoke="welcome-modal"
        >
          <p>Boas-vindas</p>
          <h2>Conheca a Nina antes de entrar</h2>
          <span>
            Esta primeira tela e publica: voce pode ver a apresentacao do desafio antes de iniciar
            a sessao segura no Keycloak.
          </span>
          <button data-smoke="keycloak-login-button" onClick={onLogin}>
            Entrar com Keycloak
          </button>
          <small>Usuario local do desafio: player / player123</small>
        </section>
      )}

      <DialogueSystem />
    </main>
  );
}
